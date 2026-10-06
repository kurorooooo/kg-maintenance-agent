"""Ask the agent one or more questions from the command line and print tool calls, timing and the answer.

Usage:
  python agent/ask.py "P-301の振動が上がっている。原因と過去の対処は？"
  python agent/ask.py --session s1 "Q1 text" "Q2 text"      # multi-turn in one session
  python agent/ask.py --json out.json "..."                   # also dump a machine-readable log

Reads agent/.env (model, Vertex settings) and NEO4J_* from the environment (.env.aura overrides for AuraDB).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")
sys.path.insert(0, str(HERE))

from google.adk.runners import InMemoryRunner  # noqa: E402
from google.genai import types  # noqa: E402

from kg_agent.agent import root_agent  # noqa: E402

APP = "kg_agent"


async def ask(runner: InMemoryRunner, user_id: str, session_id: str, text: str) -> dict:
    t0 = time.perf_counter()
    calls: list[dict] = []
    answer: list[str] = []
    msg = types.Content(role="user", parts=[types.Part(text=text)])
    async for ev in runner.run_async(user_id=user_id, session_id=session_id, new_message=msg):
        for part in (ev.content.parts if ev.content and ev.content.parts else []):
            if part.function_call:
                calls.append({"t": round(time.perf_counter() - t0, 1), "tool": part.function_call.name,
                              "args": dict(part.function_call.args or {})})
                a = json.dumps(part.function_call.args or {}, ensure_ascii=False)
                print(f"  [{calls[-1]['t']:5.1f}s] -> {part.function_call.name} {a[:300]}")
            elif part.function_response:
                r = part.function_response.response or {}
                n = r.get("rowCount", len(r.get("hits", [])) if isinstance(r, dict) else "")
                err = r.get("error") if isinstance(r, dict) else None
                print(f"  [{time.perf_counter() - t0:5.1f}s] <- {part.function_response.name} rows/hits={n}" + (f" ERROR {err}" if err else ""))
            elif part.text and ev.is_final_response():
                answer.append(part.text)
    elapsed = round(time.perf_counter() - t0, 1)
    return {"question": text, "answer": "".join(answer), "toolCalls": calls, "seconds": elapsed}


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("questions", nargs="+")
    ap.add_argument("--session", default=None, help="reuse one session for all questions (multi-turn)")
    ap.add_argument("--json", default=None, help="write results to this file")
    args = ap.parse_args()

    runner = InMemoryRunner(agent=root_agent, app_name=APP)
    results = []
    session = None
    for q in args.questions:
        if session is None or args.session is None:
            session = await runner.session_service.create_session(app_name=APP, user_id="cli", session_id=args.session)
        print(f"\n=== Q: {q}")
        r = await ask(runner, "cli", session.id, q)
        print(f"--- answer ({r['seconds']}s, {len(r['toolCalls'])} tool calls)\n{r['answer']}")
        results.append(r)
    if args.json:
        Path(args.json).write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\nsummary:", [(round(r["seconds"]), len(r["toolCalls"])) for r in results])


if __name__ == "__main__":
    asyncio.run(main())
