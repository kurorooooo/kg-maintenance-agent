"""動画（movie/）で表示するデータの抜粋を data/*.csv から movie/src/data.json に書き出す。"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from chunking import build_chunks  # noqa: E402


def read(name: str) -> list[dict]:
    with open(ROOT / "data" / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def main() -> None:
    eq = read("equipment.csv")
    wos = read("workorders.csv")
    fm = {f["id"]: f for f in read("failure_modes.csv")}
    pick = ["WO-2026-015", "WO-2026-002", "WO-2025-028", "WO-2026-025", "WO-2026-017", "WO-2025-001", "WO-2026-020", "WO-2024-006"]
    wsel = sorted([w for w in wos if w["id"] in pick], key=lambda w: pick.index(w["id"]))
    chunk = next(c for c in build_chunks() if c.id == "CH-cp-200-002")
    data = {
        "equipment": [{"id": e["id"], "name": e["name"], "modelId": e["modelId"], "lineId": e["lineId"], "installedYear": e["installedYear"]} for e in eq],
        "workorders": [{
            "id": w["id"], "date": w["date"], "equipmentId": w["equipmentId"], "failureMode": fm[w["failureModeId"]]["name"],
            "procedureId": w["procedureId"], "downtimeMin": w["downtimeMin"],
            "note": w["note"][:60] + ("…" if len(w["note"]) > 60 else ""),
        } for w in wsel],
        "chunk": {"id": chunk.id, "source": chunk.source, "section": chunk.section, "page": chunk.page, "text": chunk.text},
        "q4": [["P-301 冷却ポンプ", 935, 3], ["P-101 冷却ポンプ", 646, 2], ["CV-201 主搬送コンベア", 521, 2], ["CT-301 冷却塔", 386, 1],
               ["P-201 冷却ポンプ", 328, 1], ["CV-203 梱包前コンベア", 321, 1], ["CV-101 搬出コンベア", 273, 1]],
        "counts": {"nodes": 252, "rels": 715, "chunks": 43, "mentions": 186},
    }
    out = ROOT / "movie" / "src" / "data.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
