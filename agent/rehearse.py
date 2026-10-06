"""Rehearsal: run the reference scenarios several times and check each answer against expected facts.

Usage:
  python agent/rehearse.py                 # 5 runs per scenario, concurrency 4
  python agent/rehearse.py --runs 3 --concurrency 3 --out docs/eval/rehearsal.md

Writes a Markdown table (pass rate, latency, tool calls) and a JSON log with every answer.
Scenarios with several questions run them in one session (follow-up questions rely on context).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import statistics
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")
sys.path.insert(0, str(HERE))

from google.adk.runners import InMemoryRunner  # noqa: E402
from google.genai import types  # noqa: E402

from kg_agent.agent import root_agent  # noqa: E402

APP = "kg_agent"

# ---- checkers: expected facts from docs/demo_questions.md (verified with hand-written Cypher) ----

def has(a: str, *keys: str) -> bool:
    return all(k in a for k in keys)


def any_of(a: str, *keys: str) -> bool:
    return any(k in a for k in keys)


def no_record(a: str) -> bool:
    return any_of(a, "記録なし", "記録はありません", "記録がありません", "No record", "no record", "not found", "存在しません", "ありません")


P302_WORK_ORDERS = {"WO-2025-026", "WO-2025-033"}  # the only work orders on P-302 (grease, misalignment)


def cited_work_orders(a: str) -> set[str]:
    return set(re.findall(r"WO-\d{4}-\d{3}", a))


CHECKS = {
    # FM-001 may be written by name instead of id
    "Q1": lambda a: any_of(a, "FM-001", "主軸ベアリング内輪摩耗", "inner ring wear") and "PR-001" in a
    and re.search(r"CH-cp-200-00[26]", a) is not None and any_of(a, "6 件", "6件", ": 6", "cases: 6"),
    "Q2": lambda a: has(a, "P-101") and any_of(a, "4 件", "4件", "×4", "4 cases", "4 times", "four") and "P-201" in a,
    "Q3": lambda a: has(a, "PT-001", "PT-003") and any_of(a, "T-05", "真壁", "Makabe") and any_of(a, "T-03", "大槌", "Otsuchi"),
    "Q4": lambda a: "P-301" in a and "935" in a and a.find("P-301") < a.find("P-101") if "P-101" in a else "P-301" in a and "935" in a,
    "B2": lambda a: any_of(a, "プレス機械作業主任者", "press") and sum(k in a for k in ("T-05", "真壁", "Makabe", "T-03", "大槌", "Otsuchi", "T-06", "乾", "Inui")) >= 2,
    "D2": lambda a: "PM-800" in a and any_of(a, "PR-101", "PR-102"),
    # must say there is no bearing record; may name FM-001 as the thing it checked; must not cite other machines' work orders
    "E1": lambda a: no_record(a) and cited_work_orders(a) <= P302_WORK_ORDERS,
    "E2": lambda a: no_record(a) and re.search(r"WO-\d{4}-\d{3}", a) is None,
}

SCENARIOS: list[list[tuple[str, str]]] = [
    [
        ("Q1", "3号ラインの冷却ポンプP-301で振動が上がっている。考えられる原因と過去の対処は？"),
        ("Q2", "同じ型式のポンプで同じ症状が出た事例は他ラインにもある？"),
        ("Q3", "その対処に必要な部品の在庫と納期、対応できる技術者は？"),
    ],
    [("Q1en", "The cooling pump P-301 on line 3 is vibrating more than usual. What are the likely causes and how were they handled before?")],
    [("Q4", "直近1年でベアリング起因の停止が多い設備はどこ？")],
    [("B2", "佐伯さん（T-01）が定年したら、誰が引き継げる？")],
    [("D2", "NU320 はどの設備のどの部品？")],
    [("E1", "P-302 でベアリング起因の故障はあった？")],
    [("E2", "P-401 の状態は？")],
]
CHECKS["Q1en"] = CHECKS["Q1"]


async def run_turn(runner: InMemoryRunner, user: str, session: str, text: str) -> dict:
    t0 = time.perf_counter()
    calls = 0
    answer: list[str] = []
    msg = types.Content(role="user", parts=[types.Part(text=text)])
    async for ev in runner.run_async(user_id=user, session_id=session, new_message=msg):
        for part in ev.content.parts if ev.content and ev.content.parts else []:
            if part.function_call and not ev.partial:
                calls += 1
            elif part.text and ev.is_final_response():
                answer.append(part.text)
    return {"answer": "".join(answer), "seconds": round(time.perf_counter() - t0, 1), "toolCalls": calls}


async def run_scenario(runner: InMemoryRunner, sem: asyncio.Semaphore, scenario: list[tuple[str, str]], run: int) -> list[dict]:
    async with sem:
        user = f"rehearse-{run}"
        session = await runner.session_service.create_session(app_name=APP, user_id=user)
        out = []
        for name, q in scenario:
            try:
                r = await run_turn(runner, user, session.id, q)
                ok = bool(CHECKS[name](r["answer"]))
            except Exception as e:  # keep going; count as failure
                r = {"answer": f"ERROR: {e}", "seconds": 0.0, "toolCalls": 0}
                ok = False
            out.append({"case": name, "run": run, "question": q, "pass": ok, **r})
            print(f"  run{run} {name:4s} {'PASS' if ok else 'FAIL'} {r['seconds']:5.1f}s calls={r['toolCalls']}", flush=True)
        return out


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--out", default=str(HERE.parent / "docs" / "eval" / "rehearsal.md"))
    ap.add_argument("--rescore", action="store_true", help="re-apply the checkers to the saved JSON instead of running the agent")
    args = ap.parse_args()

    if args.rescore:
        results = json.loads(Path(args.out).with_suffix(".json").read_text(encoding="utf-8"))
        for r in results:
            r["pass"] = bool(CHECKS[r["case"]](r["answer"]))
    else:
        runner = InMemoryRunner(agent=root_agent, app_name=APP)
        sem = asyncio.Semaphore(args.concurrency)
        tasks = [run_scenario(runner, sem, sc, run) for run in range(1, args.runs + 1) for sc in SCENARIOS]
        results = [r for group in await asyncio.gather(*tasks) for r in group]

    order = ["Q1", "Q1en", "Q2", "Q3", "Q4", "B2", "D2", "E1", "E2"]
    lines = [
        f"# Rehearsal {datetime.now():%Y-%m-%d %H:%M}",
        "",
        f"Model: {root_agent.model} · runs per scenario: {args.runs} · Q1→Q2→Q3 share one session.",
        "",
        "| Case | Question | Pass | Latency median (min–max) s | Tool calls mean |",
        "| --- | --- | --- | --- | --- |",
    ]
    total_pass = total = 0
    for name in order:
        rs = [r for r in results if r["case"] == name]
        if not rs:
            continue
        secs = [r["seconds"] for r in rs if r["seconds"]]
        passed = sum(r["pass"] for r in rs)
        total_pass += passed
        total += len(rs)
        q = rs[0]["question"]
        lines.append(
            f"| {name} | {q[:48]}{'…' if len(q) > 48 else ''} | {passed}/{len(rs)} | "
            f"{statistics.median(secs):.0f} ({min(secs):.0f}–{max(secs):.0f}) | {statistics.mean(r['toolCalls'] for r in rs):.1f} |"
        )
    lines += ["", f"Overall: {total_pass}/{total} passed."]
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    out.with_suffix(".json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\n".join(lines))
    print(f"\nwrote {out} and {out.with_suffix('.json')}")


if __name__ == "__main__":
    asyncio.run(main())
