"""手順書 Markdown のチャンク化と、部品・故障モードへの MENTIONS 判定（embed.py と search_manual が共用）。"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANUALS = ROOT / "manuals"
DATA = ROOT / "data"
CHARS_PER_PAGE = 1200   # ページ番号の推定に使う
MAX_CHUNK_CHARS = 700

# 故障モードごとの言い換え（手順書本文での表現）。モデルを限定して照合するので短い語も許容
FM_ALIASES: dict[str, list[str]] = {
    "FM-001": ["主軸ベアリング内輪摩耗", "ベアリング損傷", "軸受損傷", "軸受の早期損傷", "転走音", "主軸ベアリング"],
    "FM-002": ["グリース劣化", "グリースの補給", "グリースの過不足"],
    "FM-003": ["不釣合い", "異物付着", "インペラ"],
    "FM-004": ["芯ずれ", "芯出し"],
    "FM-005": ["メカニカルシール", "漏水"],
    "FM-006": ["ストレーナの目詰まり", "ストレーナ清掃", "吸込ストレーナ"],
    "FM-007": ["絶縁", "巻線"],
    "FM-008": ["ガイドライナーの摩耗", "ガイドライナー", "クリアランス"],
    "FM-009": ["ライニングの摩耗", "ライニング", "焦げ臭"],
    "FM-010": ["NU320", "フライホイール軸受", "フライホイールベアリング"],
    "FM-011": ["作動油の漏れ", "作動油", "油圧ユニット"],
    "FM-012": ["光軸", "安全光電センサ", "安全停止"],
    "FM-013": ["吐出不良", "給油点", "集中潤滑"],
    "FM-014": ["テールプーリーベアリング", "グリース切れ", "粉塵侵入"],
    "FM-015": ["蛇行", "片伸び"],
    "FM-016": ["歯面摩耗", "減速機オイル", "減速機"],
    "FM-017": ["キャリアローラ", "回転しないローラ"],
    "FM-018": ["インバータ"],
    "FM-019": ["位置検出", "光電センサ"],
    "FM-020": ["ファン軸受", "ファン軸ベアリング", "水分侵入", "22210EK"],
    "FM-021": ["ノズルの詰まり", "ノズル詰まり", "散水ノズル"],
    "FM-022": ["フロート"],
    "FM-023": ["セパレータ", "差圧"],
    "FM-024": ["吸気フィルタ"],
    "FM-025": ["エアエンド", "内部軸受", "ロータ接触"],
}


@dataclass
class Chunk:
    id: str
    model_id: str
    source: str
    section: str
    page: int
    text: str
    mentions_components: list[str] = field(default_factory=list)
    mentions_failure_modes: list[str] = field(default_factory=list)


def _read_csv(name: str) -> list[dict]:
    with open(DATA / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        return {}, text
    meta = dict(line.split(":", 1) for line in m.group(1).splitlines() if ":" in line)
    return {k.strip(): v.strip() for k, v in meta.items()}, m.group(2)


def _split_sections(body: str) -> list[tuple[str, str]]:
    """見出し（# / ##）ごとに (見出しパス, 本文) を返す。長い本文は段落で分割する。"""
    sections: list[tuple[str, str]] = []
    h1 = ""
    cur_title = ""
    buf: list[str] = []

    def flush():
        text = "\n".join(buf).strip()
        if text:
            sections.append((cur_title, text))
        buf.clear()

    for line in body.splitlines():
        if line.startswith("# "):
            flush()
            h1 = line[2:].strip()
            cur_title = h1
        elif line.startswith("## "):
            flush()
            cur_title = f"{h1} > {line[3:].strip()}"
        else:
            buf.append(line)
    flush()

    out: list[tuple[str, str]] = []
    for title, text in sections:
        if len(text) <= MAX_CHUNK_CHARS:
            out.append((title, text))
            continue
        paras = [p for p in re.split(r"\n\s*\n", text) if p.strip()]
        acc = ""
        for p in paras:
            if acc and len(acc) + len(p) > MAX_CHUNK_CHARS:
                out.append((title, acc.strip()))
                acc = ""
            acc += p + "\n\n"
        if acc.strip():
            out.append((title, acc.strip()))
    return out


def build_chunks() -> list[Chunk]:
    components = _read_csv("components.csv")
    failure_modes = _read_csv("failure_modes.csv")
    comp_by_id = {c["id"]: c for c in components}

    chunks: list[Chunk] = []
    for path in sorted(MANUALS.glob("*.md")):
        meta, body = _parse_frontmatter(path.read_text(encoding="utf-8"))
        model_id = meta.get("model", path.stem.split("_")[0])
        source = meta.get("source", path.name)
        comps = [c for c in components if c["modelId"] == model_id]
        fms = [f for f in failure_modes if comp_by_id[f["componentId"]]["modelId"] == model_id]

        offset = 0
        for i, (section, text) in enumerate(_split_sections(body), start=1):
            page = 1 + offset // CHARS_PER_PAGE
            offset += len(text)
            hay = section + "\n" + text
            mc = [c["id"] for c in comps if c["name"] in hay]
            mf = [f["id"] for f in fms
                  if f["name"] in hay or any(a in hay for a in FM_ALIASES.get(f["id"], []))]
            # 故障モードが言及されていれば、その部位も言及扱いにする
            for fid in mf:
                cid = next(f["componentId"] for f in fms if f["id"] == fid)
                if cid not in mc:
                    mc.append(cid)
            chunks.append(Chunk(
                id=f"CH-{model_id.lower()}-{i:03d}",
                model_id=model_id, source=source, section=section, page=page, text=text,
                mentions_components=mc, mentions_failure_modes=mf,
            ))
    return chunks


if __name__ == "__main__":
    for c in build_chunks():
        print(f"{c.id} p{c.page} [{c.section}] {len(c.text)}字 comp={c.mentions_components} fm={c.mentions_failure_modes}")
