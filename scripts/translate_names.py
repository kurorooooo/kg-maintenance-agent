"""マスタ CSV の日本語名に英語名（nameEn 等）を Gemini で付与する。冪等（既に値がある行は --force がなければ飛ばす）。

対象: lines, models, equipment, components, parts, suppliers, failure_modes, symptoms, procedures, technicians
追加列: nameEn（全て）、summaryEn（procedures）、descriptionEn（failure_modes）
人名はヘボン式ローマ字（Given Family の順）。型番・記号はそのまま残す。

使い方:
  python scripts/translate_names.py            # 未翻訳の行だけ
  python scripts/translate_names.py --force    # 全行やり直し
"""
from __future__ import annotations

import csv
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT  # noqa: E402  (.env を読む)

from google import genai  # noqa: E402
from google.genai import types  # noqa: E402

DATA = ROOT / "data"
MODEL = os.getenv("TRANSLATE_MODEL", "gemini-3.5-flash")

# (ファイル, 翻訳する列 -> 追加する列, 文脈の説明)
TARGETS: list[tuple[str, dict[str, str], str]] = [
    ("lines.csv", {"name": "nameEn"}, "production lines in a factory"),
    ("models.csv", {"name": "nameEn"}, "equipment model names; keep model codes like CP-200 as-is"),
    ("equipment.csv", {"name": "nameEn"}, "equipment names on a factory floor, e.g. 'Line 3 cooling pump'"),
    ("components.csv", {"name": "nameEn"}, "mechanical components of pumps, presses, conveyors, cooling towers, compressors"),
    ("parts.csv", {"name": "nameEn"}, "purchased spare parts; keep part numbers like 6306ZZ and quantities like (400g) as-is"),
    ("suppliers.csv", {"name": "nameEn"}, "supplier company names (fictional); transliterate and keep a company-type word like 'Co.'"),
    ("failure_modes.csv", {"name": "nameEn", "description": "descriptionEn"}, "equipment failure modes used by maintenance engineers"),
    ("symptoms.csv", {"name": "nameEn"}, "observed symptoms of equipment trouble, short noun phrases"),
    ("procedures.csv", {"name": "nameEn", "summary": "summaryEn"}, "maintenance procedure names and one-sentence summaries"),
    ("technicians.csv", {"name": "nameEn"}, "Japanese personal names; romanize in Hepburn as 'Given Family' (e.g. 佐伯 恒夫 -> Tsuneo Saeki)"),
]

SCHEMA = types.Schema(
    type=types.Type.ARRAY,
    items=types.Schema(type=types.Type.OBJECT, properties={"id": types.Schema(type=types.Type.STRING), "en": types.Schema(type=types.Type.STRING)}, required=["id", "en"]),
)


def translate(client: genai.Client, items: list[dict], context: str) -> dict[str, str]:
    prompt = (
        "Translate each Japanese value into concise, natural English used by maintenance engineers. "
        f"Context: {context}. Keep IDs, model codes, part numbers and units unchanged. "
        "Return one entry per input id.\n\n" + json.dumps(items, ensure_ascii=False)
    )
    res = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=SCHEMA, temperature=0.1),
    )
    return {x["id"]: x["en"].strip() for x in json.loads(res.text)}


def main() -> None:
    force = "--force" in sys.argv
    client = genai.Client()
    for fname, cols, context in TARGETS:
        path = DATA / fname
        with open(path, encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            fields = list(reader.fieldnames or [])
        changed = 0
        for src, dst in cols.items():
            if dst not in fields:
                fields.append(dst)
            todo = [{"id": r["id"], "ja": r[src]} for r in rows if r.get(src) and (force or not r.get(dst))]
            if not todo:
                continue
            out = translate(client, todo, context)
            for r in rows:
                if r["id"] in out:
                    r[dst] = out[r["id"]]
                    changed += 1
                else:
                    r.setdefault(dst, "")
        with open(path, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k, "") for k in fields})
        print(f"{fname:20s} rows={len(rows):3d} translated={changed}")


if __name__ == "__main__":
    main()
