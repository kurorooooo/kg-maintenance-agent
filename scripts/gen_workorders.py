"""作業報告（WorkOrder）80件を合成する。

分布設計（docs/model.md「意図的に埋め込んだ気づき」）
- FM-001 主軸ベアリング内輪摩耗 が P-301 と P-101 で繰り返す（P-301 は再発間隔が短くなる）
- ベアリング起因（category=bearing）の停止時間が P-301 と CV-201 に偏る
- 残りは各設備の型式に属する故障モードからランダムに生成する

乱数シードは固定。出力: data/workorders.csv
"""
from __future__ import annotations

import csv
import random
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SEED = 20261004
TOTAL = 80
PERIOD_START = date(2024, 10, 1)
PERIOD_END = date(2026, 9, 30)

rng = random.Random(SEED)


def read_csv(name: str) -> list[dict]:
    with open(DATA / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


equipment = read_csv("equipment.csv")
components = read_csv("components.csv")
failure_modes = read_csv("failure_modes.csv")
fm_symptoms = read_csv("failure_mode_symptoms.csv")
procedures = read_csv("procedures.csv")
technicians = read_csv("technicians.csv")
parts = {p["id"]: p for p in read_csv("parts.csv")}
proc_parts = read_csv("procedure_parts.csv")

eq_by_id = {e["id"]: e for e in equipment}
comp_by_id = {c["id"]: c for c in components}
fm_by_id = {f["id"]: f for f in failure_modes}
proc_by_fm = {p["failureModeId"]: p for p in procedures}
symptoms_by_fm: dict[str, list[tuple[str, float]]] = defaultdict(list)
for row in fm_symptoms:
    symptoms_by_fm[row["failureModeId"]].append((row["symptomId"], float(row["weight"])))
parts_by_proc: dict[str, list[str]] = defaultdict(list)
for row in proc_parts:
    parts_by_proc[row["procedureId"]].append(row["partId"])

# 型式 -> 故障モード一覧
fms_by_model: dict[str, list[dict]] = defaultdict(list)
for fm in failure_modes:
    fms_by_model[comp_by_id[fm["componentId"]]["modelId"]].append(fm)


def pick_symptoms(fm_id: str) -> list[str]:
    cands = symptoms_by_fm[fm_id]
    chosen = [s for s, w in cands if rng.random() < w]
    if not chosen:
        chosen = [max(cands, key=lambda x: x[1])[0]]
    return chosen[:2]


def pick_technician(eq: dict, proc: dict) -> dict:
    cert = proc["requiredCert"]
    pool = [t for t in technicians if not cert or cert in t["cert"].split(";")]
    same_line = [t for t in pool if t["lineId"] == eq["lineId"]]
    # 自ラインの有資格者を優先、いなければ他ライン
    if same_line and rng.random() < 0.75:
        return rng.choice(same_line)
    return rng.choice(pool)


def downtime(proc: dict, fm: dict) -> int:
    base = int(proc["durationMin"])
    noise = rng.uniform(0.8, 1.4)
    wait = 0
    # 在庫ゼロ部品があれば待ち時間を加算（納期の一部）
    for pid in parts_by_proc[proc["id"]]:
        if int(parts[pid]["stockQty"]) == 0:
            wait += int(parts[pid]["leadTimeDays"]) * 60 * 8 // 3
    sev = {"high": 1.3, "medium": 1.0, "low": 0.8}[fm["severity"]]
    return int(base * noise * sev) + wait


NOTES = {
    "bearing": [
        "{eq}の{sym}。軸受部を聴診したところ転走音あり。{comp}を交換し試運転で振動値が正常範囲に戻った。",
        "夜勤帯に{sym}の連絡。{comp}の温度が高く、グリースが黒く変色していた。{proc}を実施。",
        "巡回点検で{eq}の{sym}を確認。分解すると{comp}の内輪に摩耗痕。交換後は異常なし。",
    ],
    "lubrication": [
        "{eq}の{sym}。{comp}のグリースが硬化していたため{proc}を実施。",
        "{comp}の油量不足を確認。{proc}後に温度を監視し問題なし。",
    ],
    "mechanical": [
        "{eq}で{sym}。ケーシングを開けると{comp}にスケール付着。清掃して復旧。",
    ],
    "alignment": [
        "{eq}の{sym}。カップリングの芯ずれを確認し{proc}。平行ずれ0.08mmを0.03mmに修正。",
    ],
    "seal": [
        "{eq}の{sym}。{comp}からの漏れを確認し{proc}を実施。",
    ],
    "clogging": [
        "{eq}で{sym}。{comp}の目詰まりを確認し{proc}。",
    ],
    "electrical": [
        "{eq}が{sym}で停止。絶縁抵抗を測定し{comp}の劣化と判断。{proc}を実施。",
    ],
    "wear": [
        "{eq}で{sym}。{comp}の摩耗が限度を超えていたため{proc}を実施。",
    ],
    "sensor": [
        "{eq}が{sym}。{comp}の汚れ・ずれを確認し{proc}。再発防止で清掃周期を短縮。",
    ],
}

symptom_names = {s["id"]: s["name"] for s in read_csv("symptoms.csv")}


def make_note(eq: dict, fm: dict, proc: dict, syms: list[str], extra: str = "") -> str:
    comp = comp_by_id[fm["componentId"]]
    tmpl = rng.choice(NOTES[fm["category"]])
    text = tmpl.format(
        eq=eq["name"],
        sym="・".join(symptom_names[s] for s in syms),
        comp=comp["name"],
        proc=proc["name"],
    )
    return (text + " " + extra).strip()


# ---------- 固定シナリオ（気づきを埋め込む） ----------
scenario: list[tuple[date, str, str, str]] = []  # (date, equipmentId, failureModeId, extra note)

# P-301: FM-001 が6回、間隔が短くなる
p301_dates = [
    date(2024, 11, 18), date(2025, 5, 9), date(2025, 9, 26),
    date(2026, 1, 14), date(2026, 4, 3), date(2026, 6, 20),
]
p301_extra = [
    "前回交換から約2年。",
    "前回交換から6か月と早い。グリース補給記録が抜けていた期間あり。",
    "再発。芯出しを再確認したが規定値内。吸込側の配管支持を要確認。",
    "再発間隔がさらに短い。カップリングゴムの偏摩耗も確認。",
    "佐伯より「据付ベースの沈下を疑うべき」とコメント。レベル測定を依頼。",
    "据付ベースに0.4mmの傾きを確認。次回停止時にライナー調整を計画。",
]
for d, ex in zip(p301_dates, p301_extra):
    scenario.append((d, "P-301", "FM-001", ex))

# P-101: FM-001 が4回
for d in [date(2024, 12, 6), date(2025, 7, 22), date(2026, 2, 27), date(2026, 8, 11)]:
    scenario.append((d, "P-101", "FM-001", "P-301と同じ傾向。同型機として要注視。"))
# P-201: 1回、P-302: 0回
scenario.append((date(2025, 10, 30), "P-201", "FM-001", ""))

# CV-201: FM-014 テールプーリーベアリング固着が4回
for d in [date(2025, 2, 12), date(2025, 8, 5), date(2025, 12, 16), date(2026, 5, 27)]:
    scenario.append((d, "CV-201", "FM-014", "粉塵の多い区画。防塵カバーの追加を検討。"))
scenario.append((date(2025, 11, 20), "CV-101", "FM-014", ""))
scenario.append((date(2026, 3, 9), "CV-203", "FM-014", ""))

# その他ベアリング系の重大事例
scenario.append((date(2025, 6, 17), "PR-101", "FM-010", "フライホイール吊り上げに2日。部品は即納品あり。"))
scenario.append((date(2026, 7, 8), "CT-301", "FM-020", "梅雨明け直後。防水カバーの劣化を確認。"))
scenario.append((date(2025, 3, 3), "CT-301", "FM-020", ""))
scenario.append((date(2025, 1, 21), "AC-301", "FM-025", "リビルト品の納期待ち60日。予備機なしで工場全体のエア供給に影響。"))

# P-301 のその他事例（質問1で候補に出す）
scenario.append((date(2025, 3, 14), "P-301", "FM-004", "振動の原因はカップリング芯ずれ。ベアリングは健全。"))
scenario.append((date(2025, 12, 2), "P-301", "FM-003", "インペラに異物。ストレーナの点検周期を見直し。"))
scenario.append((date(2026, 8, 29), "P-301", "FM-006", ""))
scenario.append((date(2024, 10, 22), "P-301", "FM-002", ""))

# ---------- ランダム補充 ----------
records: list[dict] = []
used_dates: set[tuple[str, date]] = set()


def add_record(d: date, eq_id: str, fm_id: str, extra: str = "") -> None:
    eq = eq_by_id[eq_id]
    fm = fm_by_id[fm_id]
    proc = proc_by_fm[fm_id]
    syms = pick_symptoms(fm_id)
    tech = pick_technician(eq, proc)
    records.append(
        {
            "date": d,
            "equipmentId": eq_id,
            "failureModeId": fm_id,
            "procedureId": proc["id"],
            "technicianId": tech["id"],
            "symptomIds": ";".join(syms),
            "downtimeMin": downtime(proc, fm),
            "shift": rng.choices(["昼勤", "夜勤"], weights=[0.6, 0.4])[0],
            "note": make_note(eq, fm, proc, syms, extra),
        }
    )
    used_dates.add((eq_id, d))


for d, eq_id, fm_id, extra in scenario:
    add_record(d, eq_id, fm_id, extra)

# ベアリング系はシナリオで十分なので補充では避ける（偏りを維持）
span_days = (PERIOD_END - PERIOD_START).days
weights = {e["id"]: 1.0 for e in equipment}
weights["P-302"] = 0.3  # 新しい予備機は故障が少ない
while len(records) < TOTAL:
    eq = rng.choices(equipment, weights=[weights[e["id"]] for e in equipment])[0]
    cands = [f for f in fms_by_model[eq["modelId"]] if f["category"] != "bearing"]
    fm = rng.choice(cands)
    d = PERIOD_START + timedelta(days=rng.randint(0, span_days))
    if (eq["id"], d) in used_dates:
        continue
    add_record(d, eq["id"], fm["id"])

records.sort(key=lambda r: r["date"])
counter: dict[int, int] = defaultdict(int)
for r in records:
    y = r["date"].year
    counter[y] += 1
    r["id"] = f"WO-{y}-{counter[y]:03d}"
    r["date"] = r["date"].isoformat()

fields = ["id", "date", "equipmentId", "failureModeId", "procedureId", "technicianId",
          "symptomIds", "downtimeMin", "shift", "note"]
with open(DATA / "workorders.csv", "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(records)

print(f"wrote {len(records)} work orders -> {DATA / 'workorders.csv'}")
