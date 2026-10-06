"""Neo4j なしで、代表質問4本の正解パスが CSV 上で追えることを確認する（Day 1 完了条件）。"""
from __future__ import annotations

import csv
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"


def read(name):
    with open(DATA / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


eq = {e["id"]: e for e in read("equipment.csv")}
comp = {c["id"]: c for c in read("components.csv")}
fm = {f["id"]: f for f in read("failure_modes.csv")}
sym = {s["id"]: s["name"] for s in read("symptoms.csv")}
fms = read("failure_mode_symptoms.csv")
proc = {p["id"]: p for p in read("procedures.csv")}
pp = read("procedure_parts.csv")
parts = {p["id"]: p for p in read("parts.csv")}
sup = {s["id"]: s for s in read("suppliers.csv")}
tech = {t["id"]: t for t in read("technicians.csv")}
wos = read("workorders.csv")

ok = True


def check(cond, msg):
    global ok
    print(("PASS " if cond else "FAIL ") + msg)
    ok &= bool(cond)


# 参照整合性
for c in comp.values():
    check(c["partId"] in parts, f"component {c['id']} -> part {c['partId']}")
for f in fm.values():
    check(f["componentId"] in comp, f"failureMode {f['id']} -> component {f['componentId']}")
for w in wos:
    check(w["equipmentId"] in eq and w["failureModeId"] in fm and w["procedureId"] in proc
          and w["technicianId"] in tech, f"workorder {w['id']} references")
    model = eq[w["equipmentId"]]["modelId"]
    check(comp[fm[w["failureModeId"]]["componentId"]]["modelId"] == model,
          f"workorder {w['id']} failure mode belongs to equipment model")
    cert = proc[w["procedureId"]]["requiredCert"]
    check(not cert or cert in tech[w["technicianId"]]["cert"].split(";"),
          f"workorder {w['id']} technician holds {cert or 'no cert'}")

print("\n--- Q1: P-301 振動増大 → 故障モード候補と過去対処 ---")
model = eq["P-301"]["modelId"]
vib = [s for s, n in sym.items() if n == "振動増大"][0]
cands = sorted({r["failureModeId"] for r in fms if r["symptomId"] == vib
                and comp[fm[r["failureModeId"]]["componentId"]]["modelId"] == model})
hist = Counter(w["failureModeId"] for w in wos if w["equipmentId"] == "P-301")
for c in cands:
    print(f"  {c} {fm[c]['name']}: P-301での過去件数 {hist.get(c, 0)}, 手順 "
          + ", ".join(p['id'] for p in proc.values() if p['failureModeId'] == c))
check(cands and hist.most_common(1)[0][0] == "FM-001", "Q1 top candidate is FM-001")

print("\n--- Q2: CP-200 同型機で FM-001 の事例 ---")
same = Counter(w["equipmentId"] for w in wos
               if eq[w["equipmentId"]]["modelId"] == model and w["failureModeId"] == "FM-001")
for e, n in same.most_common():
    print(f"  {e} ({eq[e]['lineId']}): {n}件")
check(same.get("P-101", 0) >= 3 and eq["P-101"]["lineId"] != "L3", "Q2 P-101 on another line has >=3 cases")

print("\n--- Q3: PR-001 の部品・サプライヤー・技術者 ---")
for r in pp:
    if r["procedureId"] == "PR-001":
        p = parts[r["partId"]]
        print(f"  {p['id']} {p['name']} 在庫{p['stockQty']} 納期{p['leadTimeDays']}日 ← {sup[p['supplierId']]['name']}")
cert = proc["PR-001"]["requiredCert"]
done = Counter(w["technicianId"] for w in wos if w["procedureId"] == "PR-001")
qualified = [t for t in tech.values() if cert in t["cert"].split(";")]
for t in qualified:
    print(f"  {t['id']} {t['name']} ({t['lineId']}) 実績{done.get(t['id'], 0)}件")
check(len(qualified) >= 2, "Q3 at least 2 qualified technicians")

print("\n--- Q4: 直近1年のベアリング起因停止 ---")
since = (date(2026, 10, 4) - timedelta(days=365)).isoformat()
agg = defaultdict(lambda: [0, 0])
for w in wos:
    if fm[w["failureModeId"]]["category"] == "bearing" and w["date"] >= since:
        agg[w["equipmentId"]][0] += 1
        agg[w["equipmentId"]][1] += int(w["downtimeMin"])
for e, (n, m) in sorted(agg.items(), key=lambda x: -x[1][1]):
    print(f"  {e}: {n}件 停止{m}分")
top = max(agg.items(), key=lambda x: x[1][0])[0]
check(top == "P-301", "Q4 most bearing-related stops is P-301")

print("\n--- 分布 ---")
print("  件数/年:", Counter(w["id"][3:7] for w in wos))
print("  件数/設備:", dict(Counter(w["equipmentId"] for w in wos).most_common()))
print("\nALL PASS" if ok else "\nSOME CHECKS FAILED")
raise SystemExit(0 if ok else 1)
