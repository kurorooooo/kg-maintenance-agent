"""queries/queries.cypher を実行し、期待値と照合する（Day 3 完了条件）。"""
from __future__ import annotations

import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATABASE, ROOT, driver  # noqa: E402

QUERIES = ROOT / "queries" / "queries.cypher"

EXPECT = {
    "Q1": lambda rows: rows[0]["failureModeId"] == "FM-001" and rows[0]["procedureId"] == "PR-001",
    "Q2": lambda rows: rows[0]["equipmentId"] == "P-101" and rows[0]["cases"] >= 3
    and all(r["equipmentId"] != "P-301" for r in rows),
    "Q3a": lambda rows: {r["partId"] for r in rows} == {"PT-001", "PT-002", "PT-003"},
    "Q3b": lambda rows: {"T-03", "T-05"} <= {r["technicianId"] for r in rows}
    and all("回転機械整備" in r["certs"] for r in rows),
    "Q4": lambda rows: rows[0]["equipmentId"] == "P-301",
}


def split_queries(text: str) -> list[tuple[str, str]]:
    out = []
    for block in text.split(";"):
        m = re.search(r"//\s*(Q\d[ab]?):", block)
        body = "\n".join(l for l in block.splitlines() if not l.strip().startswith("//")).strip()
        if m and body:
            out.append((m.group(1), body))
    return out


def main() -> int:
    ok = True
    with driver() as drv, drv.session(database=DATABASE) as s:
        for name, cypher in split_queries(QUERIES.read_text(encoding="utf-8")):
            t0 = time.perf_counter()
            rows = [r.data() for r in s.run(cypher)]
            ms = (time.perf_counter() - t0) * 1000
            passed = bool(rows) and EXPECT[name](rows)
            ok &= passed
            print(f"{'PASS' if passed else 'FAIL'} {name:4s} {len(rows):2d} rows {ms:6.1f} ms")
            for r in rows[:4]:
                print("     ", {k: v for k, v in r.items() if k not in ("workOrders", "recentWorkOrders", "note")})
    print("\nALL PASS" if ok else "\nSOME CHECKS FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
