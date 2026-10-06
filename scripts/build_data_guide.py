"""A工場 設備保全データの関係性ガイド（PDF）を生成する。

data/*.csv と manuals/ を読み、分類体系（タクソノミー）・関係（オントロジー）・件数を
HTML に組み立て、Google Chrome のヘッドレス印刷で docs/data_relationships.pdf を出力する。

使い方: python scripts/build_data_guide.py
"""
from __future__ import annotations

import csv
import html
import math
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT_PDF = ROOT / "docs" / "data_relationships.pdf"
OUT_HTML = ROOT / "docs" / "data_relationships.html"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

sys.path.insert(0, str(ROOT / "scripts"))
from chunking import build_chunks  # noqa: E402


def read(name: str) -> list[dict]:
    with open(DATA / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


lines = read("lines.csv")
models = read("models.csv")
equipment = read("equipment.csv")
components = read("components.csv")
parts = read("parts.csv")
suppliers = read("suppliers.csv")
failure_modes = read("failure_modes.csv")
symptoms = read("symptoms.csv")
fm_sym = read("failure_mode_symptoms.csv")
procedures = read("procedures.csv")
proc_parts = read("procedure_parts.csv")
technicians = read("technicians.csv")
workorders = read("workorders.csv")
chunks = build_chunks()

by = lambda rows: {r["id"]: r for r in rows}  # noqa: E731
L, M, E, C, P, S = by(lines), by(models), by(equipment), by(components), by(parts), by(suppliers)
FM, SY, PR, T = by(failure_modes), by(symptoms), by(procedures), by(technicians)

CATEGORY_JA = {
    "pump": "ポンプ", "press": "プレス機", "conveyor": "コンベア", "cooling_tower": "冷却塔", "compressor": "コンプレッサ",
}
FM_CATEGORY_JA = {
    "bearing": ("ベアリング", "軸受の摩耗・損傷・固着。振動と異音で現れ、放置すると重大故障に至る"),
    "lubrication": ("潤滑", "グリースや油の劣化・不足。温度上昇で現れる"),
    "mechanical": ("機械的不釣合い", "異物付着や摩耗によるバランス崩れ"),
    "alignment": ("芯ずれ", "据付沈下や配管反力による軸心のずれ"),
    "seal": ("シール", "軸封・油圧シールの摩耗による漏れ"),
    "clogging": ("詰まり", "ストレーナ・フィルタ・ノズルの閉塞。圧力や流量の低下で現れる"),
    "electrical": ("電気", "絶縁劣化やインバータ故障。過電流トリップで現れる"),
    "wear": ("摩耗", "ガイド・ライニング・ベルトなど摺動部の消耗"),
    "sensor": ("センサ", "汚れや位置ずれによる誤検知・安全停止"),
}
SEVERITY_JA = {"high": "高", "medium": "中", "low": "低"}
REL_JA = [
    ("Line", "HAS_EQUIPMENT", "Equipment", "ラインは設備を持つ"),
    ("Equipment", "OF_MODEL", "Model", "設備は型式に属する"),
    ("Model", "HAS_COMPONENT", "Component", "型式は部品構成（部位）を持つ"),
    ("Component", "USES_PART", "Part", "部位には購入部品が使われる"),
    ("Component", "HAS_FAILURE_MODE", "FailureMode", "部位には起こりうる故障モードがある"),
    ("FailureMode", "HAS_SYMPTOM", "Symptom", "故障モードは症状として現れる（重み付き）"),
    ("Procedure", "RESOLVES", "FailureMode", "手順は故障モードを解消する"),
    ("Procedure", "REQUIRES_PART", "Part", "手順には部品が必要（数量付き）"),
    ("Part", "SUPPLIED_BY", "Supplier", "部品はサプライヤーから調達する"),
    ("WorkOrder", "ON_EQUIPMENT", "Equipment", "作業報告はある設備に対するもの"),
    ("WorkOrder", "REPORTED_SYMPTOM", "Symptom", "作業報告には現場で見た症状が記録される"),
    ("WorkOrder", "DIAGNOSED", "FailureMode", "作業報告には診断した故障モードが記録される"),
    ("WorkOrder", "PERFORMED", "Procedure", "作業報告には実施した手順が記録される"),
    ("WorkOrder", "PERFORMED_BY", "Technician", "作業報告には担当した技術者が記録される"),
    ("Technician", "ASSIGNED_TO", "Line", "技術者はラインに所属する"),
    ("Chunk", "MENTIONS", "Component / FailureMode", "手順書の段落は部位や故障モードに言及する"),
    ("Chunk", "FROM_MODEL", "Model", "手順書の段落はある型式のマニュアルに由来する"),
]
NODE_JA = {
    "Line": ("ライン", "工程単位の生産ライン", "設備台帳"),
    "Equipment": ("設備", "個体としての機械。ID で呼ぶ（P-301 等）", "設備台帳"),
    "Model": ("型式", "機械の種類。同型機は部品構成と故障モードを共有する", "設備台帳・メーカー仕様"),
    "Component": ("部位", "型式ごとの部品構成。交換周期を持つ", "部品構成表（BOM）"),
    "Part": ("購入部品", "在庫・納期・単価を持つ調達単位", "購買・資材マスタ"),
    "Supplier": ("サプライヤー", "部品の調達先", "購買マスタ"),
    "FailureMode": ("故障モード", "部位に起こる壊れ方。分類と重大度を持つ", "FMEA・故障辞書"),
    "Symptom": ("症状", "現場で観察できる現象", "作業報告の記述"),
    "Procedure": ("対処手順", "故障モードに対する標準作業。所要時間と必要資格", "作業標準書"),
    "WorkOrder": ("作業報告", "いつ・どの設備で・何が起き・何をしたかの1件", "保全管理システム（CMMS）"),
    "Technician": ("技術者", "保全担当者。所属ラインと資格", "技能台帳"),
    "Chunk": ("手順書の段落", "マニュアルを節ごとに分けた単位。出典ページを持つ", "保全マニュアル"),
}


def esc(s) -> str:
    return html.escape(str(s))


# ---------------------------------------------------------------- SVG helpers
def svg_box(x, y, w, h, title, sub="", fill="#eef3fb", stroke="#3b5b8f"):
    t = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="1.4"/>'
    if sub:
        t += f'<text x="{x+w/2}" y="{y+h/2-4}" text-anchor="middle" font-size="12" font-weight="700" fill="#1d2d44">{esc(title)}</text>'
        t += f'<text x="{x+w/2}" y="{y+h/2+12}" text-anchor="middle" font-size="10.5" fill="#44546a">{esc(sub)}</text>'
    else:
        t += f'<text x="{x+w/2}" y="{y+h/2+4}" text-anchor="middle" font-size="12" font-weight="700" fill="#1d2d44">{esc(title)}</text>'
    return t


def svg_arrow(c1, c2, size1, size2, label="", color="#6b7a90"):
    (x1, y1), (x2, y2) = c1, c2
    dx, dy = x2 - x1, y2 - y1
    dist = math.hypot(dx, dy) or 1

    def clip(hw, hh):
        tx = hw / abs(dx) if dx else 9e9
        ty = hh / abs(dy) if dy else 9e9
        return min(tx, ty)

    t1 = clip(size1[0] / 2, size1[1] / 2)
    t2 = clip(size2[0] / 2, size2[1] / 2)
    sx, sy = x1 + dx * t1, y1 + dy * t1
    ex, ey = x2 - dx * t2, y2 - dy * t2
    # 矢尻の分だけ短くする
    ex2, ey2 = ex - dx / dist * 4, ey - dy / dist * 4
    s = f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{ex2:.1f}" y2="{ey2:.1f}" stroke="{color}" stroke-width="1.3" marker-end="url(#arr)"/>'
    if label:
        mx, my = (sx + ex) / 2, (sy + ey) / 2
        w = len(label) * 5.6 + 8
        s += f'<rect x="{mx-w/2:.1f}" y="{my-8}" width="{w:.1f}" height="14" fill="white" opacity="0.92"/>'
        s += f'<text x="{mx:.1f}" y="{my+3}" text-anchor="middle" font-size="9" fill="#33415c">{esc(label)}</text>'
    return s


SVG_DEFS = ('<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">'
            '<path d="M0,0 L8,4 L0,8 z" fill="#6b7a90"/></marker></defs>')


def ontology_svg() -> str:
    W, H = 1120, 540
    bw, bh = 140, 46
    nodes = {
        "Line": (100, 60), "Equipment": (360, 60), "Model": (620, 60), "Component": (880, 60),
        "Symptom": (360, 240), "FailureMode": (620, 240), "Part": (880, 240),
        "Technician": (100, 420), "WorkOrder": (360, 420), "Procedure": (620, 420), "Supplier": (880, 420),
        "Chunk": (1040, 330),
    }
    fills = {"WorkOrder": "#fff1d6", "FailureMode": "#fde2e4", "Chunk": "#e6f4ea"}
    edges = [
        ("Line", "Equipment", "HAS_EQUIPMENT"), ("Equipment", "Model", "OF_MODEL"), ("Model", "Component", "HAS_COMPONENT"),
        ("Component", "Part", "USES_PART"), ("Component", "FailureMode", "HAS_FAILURE_MODE"), ("FailureMode", "Symptom", "HAS_SYMPTOM"),
        ("Procedure", "FailureMode", "RESOLVES"), ("Procedure", "Part", "REQUIRES_PART"), ("Part", "Supplier", "SUPPLIED_BY"),
        ("WorkOrder", "Equipment", "ON_EQUIPMENT"), ("WorkOrder", "Symptom", "REPORTED_SYMPTOM"), ("WorkOrder", "FailureMode", "DIAGNOSED"),
        ("WorkOrder", "Procedure", "PERFORMED"), ("WorkOrder", "Technician", "PERFORMED_BY"), ("Technician", "Line", "ASSIGNED_TO"),
        ("Chunk", "Component", "MENTIONS"), ("Chunk", "FailureMode", "MENTIONS"), ("Chunk", "Model", "FROM_MODEL"),
    ]
    out = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" font-family="Hiragino Sans, sans-serif">', SVG_DEFS]
    for a, b, lab in edges:
        out.append(svg_arrow(nodes[a], nodes[b], (bw, bh), (bw, bh), lab))
    for name, (cx, cy) in nodes.items():
        ja = NODE_JA[name][0]
        out.append(svg_box(cx - bw / 2, cy - bh / 2, bw, bh, name, ja, fill=fills.get(name, "#eef3fb")))
    out.append("</svg>")
    return "".join(out)


def story_svg() -> str:
    W, H = 1000, 500
    bw, bh = 170, 46
    n = {
        "line": (140, 50), "eq": (390, 50), "model": (640, 50), "comp": (890, 50),
        "sym": (140, 180), "fm": (640, 180), "chunk": (890, 180),
        "tech": (140, 310), "wo": (390, 310), "proc": (640, 310), "part": (890, 310),
        "sup": (890, 440),
    }
    label = {
        "line": ("Line", "第3ライン"), "eq": ("Equipment", "P-301 3号ライン冷却ポンプ"), "model": ("Model", "CP-200"),
        "comp": ("Component", "主軸ベアリング"), "fm": ("FailureMode", "主軸ベアリング内輪摩耗"), "sym": ("Symptom", "振動増大"),
        "chunk": ("Chunk", "CH-cp-200-002 p.1"), "tech": ("Technician", "真壁 美咲（回転機械整備）"), "wo": ("WorkOrder", "WO-2026-015"),
        "proc": ("Procedure", "PR-001 主軸ベアリング交換"), "part": ("Part", "6306ZZ 在庫4・納期3日"), "sup": ("Supplier", "東和ベアリング商会"),
    }
    fills = {"wo": "#fff1d6", "fm": "#fde2e4", "chunk": "#e6f4ea"}
    edges = [
        ("line", "eq", "HAS_EQUIPMENT"), ("eq", "model", "OF_MODEL"), ("model", "comp", "HAS_COMPONENT"),
        ("comp", "fm", "HAS_FAILURE_MODE"), ("fm", "sym", "HAS_SYMPTOM"), ("chunk", "fm", "MENTIONS"),
        ("wo", "eq", "ON_EQUIPMENT"), ("wo", "fm", "DIAGNOSED"), ("wo", "tech", "PERFORMED_BY"), ("wo", "proc", "PERFORMED"),
        ("proc", "fm", "RESOLVES"), ("proc", "part", "REQUIRES_PART"), ("part", "sup", "SUPPLIED_BY"),
    ]
    out = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" font-family="Hiragino Sans, sans-serif">', SVG_DEFS]
    for a, b, lab in edges:
        out.append(svg_arrow(n[a], n[b], (bw, bh), (bw, bh), lab))
    for k, (cx, cy) in n.items():
        out.append(svg_box(cx - bw / 2, cy - bh / 2, bw, bh, label[k][1], label[k][0], fill=fills.get(k, "#eef3fb")))
    out.append("</svg>")
    return "".join(out)


# ---------------------------------------------------------------- HTML pieces
def table(headers, rows, cls="") -> str:
    h = "".join(f"<th>{esc(x)}</th>" for x in headers)
    b = "".join("<tr>" + "".join(f"<td>{x if isinstance(x, str) and x.startswith('<') else esc(x)}</td>" for x in r) + "</tr>" for r in rows)
    return f'<table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'


def tree(items) -> str:
    """items: list of (label, children) を入れ子リストにする"""
    out = ["<ul class='tree'>"]
    for label, children in items:
        out.append(f"<li><span>{label}</span>")
        if children:
            out.append(tree(children))
        out.append("</li>")
    out.append("</ul>")
    return "".join(out)


# ---- 件数
counts = [
    ("ライン", len(lines)), ("設備", len(equipment)), ("型式", len(models)), ("部位（部品構成）", len(components)),
    ("購入部品", len(parts)), ("サプライヤー", len(suppliers)), ("故障モード", len(failure_modes)), ("症状", len(symptoms)),
    ("対処手順", len(procedures)), ("技術者", len(technicians)), ("作業報告", len(workorders)), ("手順書", 5), ("手順書の段落", len(chunks)),
]

# ---- 2.1 場所の階層
loc_tree = [(f"<b>A工場</b>", [
    (f"<b>{esc(l['name'])}</b>（{esc(l['process'])}）",
     [(f"{esc(e['id'])} {esc(e['name'])} <small>型式 {esc(e['modelId'])}・{esc(e['installedYear'])}年設置・{esc(e['location'])}</small>", [])
      for e in equipment if e["lineId"] == l["id"]])
    for l in lines])]

# ---- 2.2 設備の分類
cat_rows = []
for cat, ja in CATEGORY_JA.items():
    for m in [m for m in models if m["category"] == cat]:
        eqs = [e for e in equipment if e["modelId"] == m["id"]]
        cat_rows.append((f"{ja} ({cat})", f"{m['id']} {m['name']}", m["maker"], len(eqs),
                         "、".join(f"{e['id']}（{L[e['lineId']]['name']}）" for e in eqs)))

# ---- 2.3 故障モードの分類
fm_matrix_rows = []
for cat, (ja, desc) in FM_CATEGORY_JA.items():
    fms = [f for f in failure_modes if f["category"] == cat]
    sev = Counter(f["severity"] for f in fms)
    fm_matrix_rows.append((f"{ja} ({cat})", desc, len(fms), sev.get("high", 0), sev.get("medium", 0), sev.get("low", 0),
                           "、".join(f["name"] for f in fms)))

# ---- 2.4 症状
sym_rows = []
sym_fm = defaultdict(list)
for r in fm_sym:
    sym_fm[r["symptomId"]].append((FM[r["failureModeId"]]["name"], float(r["weight"])))
for s in symptoms:
    fms = sorted(sym_fm[s["id"]], key=lambda x: -x[1])
    sym_rows.append((s["id"], s["name"], len(fms), "、".join(f"{n}({w:.1f})" for n, w in fms[:4]) + ("…" if len(fms) > 4 else "")))

# ---- 2.5 資格
cert_rows = []
certs = ["回転機械整備", "電気工事士", "プレス機械作業主任者", ""]
for c in certs:
    prs = [p for p in procedures if p["requiredCert"] == c]
    holders = [t["name"] for t in technicians if (c in t["cert"].split(";") if c else True)]
    cert_rows.append((c or "（資格不要）", len(prs), "、".join(p["name"] for p in prs[:5]) + ("…" if len(prs) > 5 else ""),
                      "、".join(holders) if c else "全員"))

# ---- 3. 型式と部品構成（CP-200 の例）＋共用部品
bom_rows = [(c["name"], c["position"], c["replaceCycleMonths"], P[c["partId"]]["name"], P[c["partId"]]["partNo"],
             P[c["partId"]]["stockQty"], P[c["partId"]]["leadTimeDays"], S[P[c["partId"]]["supplierId"]]["name"])
            for c in components if c["modelId"] == "CP-200"]
part_users = defaultdict(list)
for c in components:
    part_users[c["partId"]].append(f"{M[c['modelId']]['id']}の{c['name']}")
shared_rows = [(P[pid]["name"], P[pid]["partNo"], P[pid]["stockQty"], "、".join(users))
               for pid, users in part_users.items() if len(users) > 1]

# ---- 4. 故障モード→症状→手順→部品（CP-200）
pp = defaultdict(list)
for r in proc_parts:
    pp[r["procedureId"]].append(f"{P[r['partId']]['name']}×{r['qty']}")
fm_chain_rows = []
for f in failure_modes:
    if C[f["componentId"]]["modelId"] != "CP-200":
        continue
    syms = sorted([(SY[r["symptomId"]]["name"], float(r["weight"])) for r in fm_sym if r["failureModeId"] == f["id"]], key=lambda x: -x[1])
    pr = next(p for p in procedures if p["failureModeId"] == f["id"])
    fm_chain_rows.append((f["id"], f["name"], FM_CATEGORY_JA[f["category"]][0], SEVERITY_JA[f["severity"]],
                          "、".join(f"{n}({w:.1f})" for n, w in syms), f"{pr['id']} {pr['name']}", f"{pr['durationMin']}分",
                          pr["requiredCert"] or "不要", "、".join(pp[pr["id"]]) or "なし"))

# ---- 5. 人と取引先
done_by = Counter(w["technicianId"] for w in workorders)
tech_rows = [(t["id"], t["name"], L[t["lineId"]]["name"], t["cert"].replace(";", "、") or "なし", t["yearsExp"], done_by[t["id"]], t["note"])
             for t in technicians]
sup_parts = Counter(p["supplierId"] for p in parts)
sup_rows = [(s["id"], s["name"], s["standardLeadTimeDays"], sup_parts[s["id"]], s["contact"]) for s in suppliers]

# ---- 6. 作業報告
wo_example = next(w for w in workorders if w["equipmentId"] == "P-301" and w["failureModeId"] == "FM-001" and "沈下" in w["note"])
wo_by_eq = Counter(w["equipmentId"] for w in workorders)
wo_eq_rows = [(eid, E[eid]["name"], L[E[eid]["lineId"]]["name"], n,
               sum(int(w["downtimeMin"]) for w in workorders if w["equipmentId"] == eid),
               sum(1 for w in workorders if w["equipmentId"] == eid and FM[w["failureModeId"]]["category"] == "bearing"))
              for eid, n in wo_by_eq.most_common()]
wo_by_year = Counter(w["date"][:4] for w in workorders)
fm_count = Counter(FM[w["failureModeId"]]["name"] for w in workorders).most_common(6)

# ---- 7. 手順書
manual_rows = []
for mid in ["CP-200", "BC-50", "PM-800", "CT-10", "AC-75"]:
    cs = [c for c in chunks if c.model_id == mid]
    mentions = {x for c in cs for x in c.mentions_failure_modes}
    manual_rows.append((cs[0].source, mid, len(cs), max(c.page for c in cs), len(mentions)))
chunk_example = next(c for c in chunks if c.id == "CH-cp-200-002")

# ---------------------------------------------------------------- assemble
CSS = """
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; color: #1d2d44; font-size: 10.5pt; line-height: 1.55; margin: 0; }
h1 { font-size: 22pt; margin: 0 0 6px; }
h2 { font-size: 15pt; border-left: 6px solid #3b5b8f; padding-left: 10px; margin: 0 0 10px; }
h3 { font-size: 11.5pt; margin: 14px 0 6px; color: #2c4875; }
p { margin: 4px 0 8px; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.lead { font-size: 11pt; color: #33415c; }
.cover { padding-top: 60mm; }
.cover .sub { font-size: 13pt; color: #44546a; margin-top: 4px; }
.cover .meta { margin-top: 30mm; color: #6b7a90; font-size: 10pt; }
table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 6px 0 10px; }
th, td { border: 1px solid #c9d3e0; padding: 4px 6px; vertical-align: top; text-align: left; }
th { background: #eef3fb; font-weight: 700; }
table.nowrap td:first-child { white-space: nowrap; }
td small, li small { color: #6b7a90; font-size: 8.5pt; }
.counts td:nth-child(2) { text-align: right; width: 60px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
ul.tree { list-style: none; margin: 0; padding-left: 16px; border-left: 1px solid #c9d3e0; }
ul.tree > li { margin: 2px 0; position: relative; padding-left: 10px; }
ul.tree > li::before { content: ""; position: absolute; left: -16px; top: 10px; width: 20px; border-top: 1px solid #c9d3e0; }
ul.tree > li > span { display: inline-block; }
.box { border: 1px solid #c9d3e0; border-radius: 6px; padding: 8px 12px; background: #f7f9fc; margin: 6px 0 10px; }
.note { background: #fff8e6; border-left: 4px solid #e0a800; padding: 6px 10px; margin: 8px 0; font-size: 9.5pt; }
.key { display: inline-block; background: #eef3fb; border: 1px solid #c9d3e0; border-radius: 4px; padding: 0 5px; font-size: 9pt; font-family: Menlo, monospace; }
svg { width: 100%; height: auto; display: block; }
.fig { margin: 6px 0 4px; }
.cap { font-size: 9pt; color: #6b7a90; text-align: center; margin-bottom: 10px; }
"""

parts_html: list[str] = []
add = parts_html.append

# 表紙
add(f"""<section class="page cover">
<h1>A工場 設備保全データの関係性ガイド</h1>
<div class="sub">設備・部品・故障モード・作業報告・手順書は、どうつながっているか</div>
<p class="lead" style="margin-top:18mm">本資料は、設備保全ナレッジグラフのデモで使うデータを、A工場という実在の工場の業務データとして読み解くための説明書です。
どんな種類のデータがあり、それぞれがどう分類され（タクソノミー）、どう関係づけられているか（オントロジー）を、現場の言葉で説明します。</p>
<div class="meta">作成日 2026-10-04 ／ データはすべて合成（架空の工場・人名・社名）／ 元ファイル data/*.csv, manuals/*.md</div>
</section>""")

# 1. 全体像
rel_rows = [(f"<span class='key'>{a}</span>", f"<span class='key'>{r}</span>", f"<span class='key'>{b}</span>", ja) for a, r, b, ja in REL_JA]
node_rows = [(f"<span class='key'>{k}</span>", v[0], v[1], v[2]) for k, v in NODE_JA.items()]
add(f"""<section class="page">
<h2>1. 全体像：12 種類のデータと 18 本の関係</h2>
<p>A工場の保全業務で日常的に扱っている情報を、12 種類の「もの」と、それらの間の 18 種類の「関係」に整理した。中心にあるのは<b>故障モード</b>で、
症状から故障モードへ入り、部位と型式を経由して同型機へ横断し、作業報告と対処手順で過去の対応に降り、交換部品からサプライヤーまで辿れる。</p>
<div class="fig">{ontology_svg()}</div>
<div class="cap">図1　データの種類（箱）と関係（矢印）。黄色は作業報告、赤は故障モード、緑は手順書の段落</div>
{table(["種類", "日本語", "意味", "現場での元データ"], node_rows)}
</section>""")

add(f"""<section class="page">
<h2>1. 全体像（続き）：関係の読み方</h2>
<p>矢印は「主語 → 関係 → 目的語」の順に読む。関係名は英語の大文字で固定し、値（設備名や故障モード名）は日本語のままにしてある。</p>
{table(["主語", "関係", "目的語", "現場の言葉で"], rel_rows)}
<div class="note">件数の目安：{"、".join(f"{k} {v}" for k, v in counts)}。グラフ上はノード約 300、関係約 900。</div>
</section>""")

# 2. タクソノミー
add(f"""<section class="page">
<h2>2. 分類体系（タクソノミー）</h2>
<p>データには 5 つの「分類の軸」がある。場所の階層、設備の種類、故障モードの分類、資格、症状である。どの軸も現場の既存の分け方をそのまま使っている。</p>
<h3>2.1 場所の階層：工場 → ライン → 設備</h3>
<p>設備は必ず 1 つのラインに属する。ライン名は工程（プレス・搬送・冷却ユーティリティ）を表す。設備 ID の頭文字が種類を示す（P: ポンプ、PR: プレス、CV: コンベア、CT: 冷却塔、AC: コンプレッサ）。</p>
{tree(loc_tree)}
<h3>2.2 設備の種類：カテゴリ → 型式 → 設備個体</h3>
<p>型式（Model）が分類の要になる。<b>同じ型式の設備は部品構成と故障モードを共有する</b>ので、型式ごとに 1 回定義すれば全台に効く。
冷却ポンプ CP-200 は全ラインに計 4 台あり、「別ラインの同型機で同じ故障が起きていないか」という横断的な問いに答えられる構造になっている。</p>
{table(["カテゴリ", "型式", "メーカー", "台数", "設備個体（所属ライン）"], cat_rows)}
</section>""")

add(f"""<section class="page">
<h3>2.3 故障モードの分類：9 つのカテゴリ × 3 段階の重大度</h3>
<p>故障モード（FailureMode）は「どの部位が、どう壊れるか」を 1 件ずつ定義したもので、FMEA の故障モード一覧に相当する。
各故障モードは<b>カテゴリ</b>（壊れ方の種類）と<b>重大度</b>（high / medium / low）を持つ。カテゴリがあるので「ベアリング起因の停止」のような集計が 1 語で絞れる。</p>
{table(["カテゴリ", "説明", "件数", "高", "中", "低", "該当する故障モード"], fm_matrix_rows)}
<h3>2.4 資格の分類：手順が要求する資格と保有者</h3>
<p>対処手順（Procedure）は必要資格を持ち、技術者（Technician）は保有資格を持つ。両者を突き合わせると「この作業をできる人」が機械的に出る。</p>
{table(["資格", "必要とする手順数", "手順の例", "保有する技術者"], cert_rows)}
</section>""")

add(f"""<section class="page">
<h3>2.5 症状の分類：現場で観察できる 15 の現象</h3>
<p>症状（Symptom）は「振動増大」「異音」のように、原因を特定する前に現場で見える現象である。故障モードと症状は多対多で、重み（0〜1）は「その故障モードでその症状が出やすい度合い」を表す。
症状が入口になり、重みの大きい故障モードから順に疑う、という診断の流れをデータで表している。</p>
{table(["ID", "症状", "関係する故障モード数", "出やすい故障モード（重み）"], sym_rows)}
</section>""")

# 3. 型式と部品構成
add(f"""<section class="page">
<h2>3. 型式・部位・購入部品：BOM と在庫のつながり</h2>
<p>型式ごとに<b>部位</b>（Component：主軸ベアリング、メカニカルシールなど機械上の位置）を定義し、各部位に<b>購入部品</b>（Part：品番・在庫・納期を持つ調達単位）を対応づけている。
部位と購入部品を分けているのは、同じ購入部品が複数の型式・複数の部位で使われるからである。以下は冷却ポンプ CP-200 の例。</p>
{table(["部位", "位置", "交換周期(月)", "購入部品", "品番", "在庫", "納期(日)", "サプライヤー"], bom_rows)}
<h3>複数の設備で共用している購入部品</h3>
<p>ポンプとコンベアという別種の設備が同じ軸受 6306ZZ を使っている。在庫 4 個は、1 回の交換で 2 個使うため 2 回分に過ぎず、8 台で共用していることを知らないと在庫判断を誤る。</p>
{table(["購入部品", "品番", "在庫", "使われている型式と部位"], shared_rows)}
</section>""")

# 4. 故障モード・症状・手順・部品
add(f"""<section class="page">
<h2>4. 故障モードを軸にしたつながり：症状 → 故障モード → 手順 → 部品</h2>
<p>故障モード 1 件につき、現れる症状（重み付き）、解消する対処手順、その手順に必要な部品と資格がつながっている。以下は冷却ポンプ CP-200 の 7 つの故障モード。</p>
{table(["ID", "故障モード", "分類", "重大度", "現れる症状（重み）", "対処手順", "所要", "必要資格", "必要部品"], fm_chain_rows)}
<div class="note">読み方の例：「振動増大」を訴える冷却ポンプなら、重み 0.9 の主軸ベアリング内輪摩耗を最初に疑い、手順 PR-001（4 時間、回転機械整備の資格）と部品 6306ZZ×2・グリース・メカニカルシールを準備する。</div>
</section>""")

# 5. 人と取引先
add(f"""<section class="page">
<h2>5. 人と取引先：技術者とサプライヤー</h2>
<h3>5.1 技術者</h3>
<p>技術者は所属ラインと保有資格を持ち、作業報告を通じて「誰がどの手順を何回やったか」が蓄積される。資格と実績の両方から「頼める人」を探せる。</p>
{table(["ID", "氏名", "所属", "保有資格", "経験年", "作業報告件数", "備考"], tech_rows, cls="nowrap")}
<h3>5.2 サプライヤー</h3>
<p>購入部品はサプライヤーに紐づく。手順 → 部品 → サプライヤーと辿れば、対処に必要な発注先と納期がそのまま出る。</p>
{table(["ID", "社名", "標準納期(日)", "担当部品数", "窓口"], sup_rows)}
</section>""")

# 6. 作業報告
w = wo_example
add(f"""<section class="page">
<h2>6. 作業報告：1 件の構造と 2 年分の分布</h2>
<h3>6.1 作業報告 1 件は 5 つのものを結ぶ</h3>
<p>作業報告（WorkOrder）は保全管理システムの 1 レコードに相当し、「いつ・どの設備で・どんな症状が出て・何と診断し・どの手順を・誰が・何分の停止で」を記録する。
この 1 件が設備・症状・故障モード・手順・技術者の 5 つを同時に結ぶため、過去事例を起点にどの方向にも辿れる。</p>
<div class="box">
<b>{esc(w['id'])}</b>　{esc(w['date'])}（{esc(w['shift'])}）　停止 {esc(w['downtimeMin'])} 分<br>
設備：{esc(w['equipmentId'])} {esc(E[w['equipmentId']]['name'])}　／　症状：{esc("、".join(SY[s]['name'] for s in w['symptomIds'].split(';')))}<br>
診断：{esc(w['failureModeId'])} {esc(FM[w['failureModeId']]['name'])}　／　手順：{esc(w['procedureId'])} {esc(PR[w['procedureId']]['name'])}　／　担当：{esc(T[w['technicianId']]['name'])}<br>
<small>記録：{esc(w['note'])}</small>
</div>
<h3>6.2 設備別の分布（{min(x['date'] for x in workorders)} 〜 {max(x['date'] for x in workorders)}、{len(workorders)} 件）</h3>
<p>年別件数：{"、".join(f"{y}年 {n}件" for y, n in sorted(wo_by_year.items()))}。最も多い故障モード：{"、".join(f"{n}（{c}件）" for n, c in fm_count)}。</p>
{table(["設備", "名称", "ライン", "件数", "停止合計(分)", "うちベアリング起因"], wo_eq_rows)}
<div class="note">P-301 の作業報告が突出して多く、ベアリング起因の再発が続いている。同型の P-101 にも同じ傾向がある。これは「気づき」としてデータに意図的に埋め込んである。</div>
</section>""")

# 7. 手順書
add(f"""<section class="page">
<h2>7. 手順書：マニュアルを段落に分けて部位・故障モードにつなぐ</h2>
<p>保全マニュアル（型式ごとに 1 冊）は、章・節ごとの<b>段落（Chunk）</b>に分割し、出典名とページを付けて保存する。各段落は本文中で言及している部位と故障モードにリンクされるため、
「振動が上がっている」という言葉から意味の近い段落を探し、その段落がつながる故障モードから構造検索へ入ることができる。回答には段落 ID と出典ページを根拠として示す。</p>
{table(["手順書", "型式", "段落数", "ページ数", "言及する故障モード数"], manual_rows)}
<h3>段落の例</h3>
<div class="box"><b>{esc(chunk_example.id)}</b>　{esc(chunk_example.source)}　p.{chunk_example.page}　「{esc(chunk_example.section)}」<br>
<small>{esc(chunk_example.text)}</small><br>
<small>言及：{esc("、".join(C[c]['name'] for c in chunk_example.mentions_components))}　／　{esc("、".join(FM[f]['name'] for f in chunk_example.mentions_failure_modes))}</small></div>
<h3>階層</h3>
{tree([("<b>手順書</b>（型式ごとに 1 冊）", [("<b>章</b>（概要・日常点検・交換手順 …）", [("<b>節</b> → 1 段落 = 1 Chunk <small>長い節は段落で分割</small>", [("言及する部位・故障モードへのリンク（MENTIONS）", [])])])])])}
</section>""")

# 8. 事例でつなぐ
add(f"""<section class="page">
<h2>8. 1 つの事例ですべてをつなぐ：P-301 の振動</h2>
<p>「3号ラインの冷却ポンプ P-301 で振動が上がっている」という問いに対して、データは次の順に辿られる。</p>
<div class="fig">{story_svg()}</div>
<div class="cap">図2　P-301 の振動増大から、故障モード・過去の作業報告・手順・部品・サプライヤー・技術者・手順書の段落まで</div>
<ol>
<li><b>入口</b>：症状「振動増大」と手順書の段落 CH-cp-200-002（p.1「振動・異音の確認」）から、故障モード候補として主軸ベアリング内輪摩耗・カップリング芯ずれ・インペラ不釣合いが挙がる。</li>
<li><b>過去事例</b>：P-301 の作業報告のうち主軸ベアリング内輪摩耗と診断されたものが 6 件あり、再発間隔が短くなっている。候補の確度が件数で裏付けられる。</li>
<li><b>横断</b>：P-301 の型式 CP-200 を経由して、第1ラインの P-101 にも同じ故障が 4 件あることが分かる。</li>
<li><b>次の行動</b>：手順 PR-001 に必要な部品 6306ZZ（在庫 4、納期 3 日、東和ベアリング商会）と、資格「回転機械整備」を持ち P-301 で実施経験のある真壁・大槌が出る。</li>
</ol>
<div class="note">デモの代表質問 4 本は、この図の一部を切り出したものである。質問1 は上段と中段、質問2 は型式を経由した横断、質問3 は下段の手順→部品→サプライヤーと技術者、質問4 は故障モードのカテゴリで作業報告を集計する。</div>
</section>""")

# 9. 用語・ID
id_rows = [
    ("Line", "L1〜L3", "L3"), ("Equipment", "種類の略号-ライン番号+連番", "P-301（第3ラインの1号ポンプ）"), ("Model", "メーカー型式", "CP-200"),
    ("Component", "型式-部位略号", "CP-200-BRG"), ("Part", "PT-連番", "PT-001"), ("Supplier", "S-連番", "S-01"),
    ("FailureMode", "FM-連番", "FM-001"), ("Symptom", "SY-連番", "SY-01"), ("Procedure", "PR-連番", "PR-001"),
    ("Technician", "T-連番", "T-05"), ("WorkOrder", "WO-年-連番", "WO-2026-015"), ("Chunk", "CH-型式-連番", "CH-cp-200-002"),
]
add(f"""<section class="page">
<h2>9. ID の体系と用語</h2>
<p>すべての「もの」は ID で一意に呼べる。AI の回答に出てくる ID は、この体系に従って読める。</p>
{table(["種類", "ID の付け方", "例"], id_rows)}
<h3>用語</h3>
<table>
<tr><th>タクソノミー</th><td>分類の体系。本資料の第 2 章。場所の階層、設備の種類、故障モードのカテゴリ、資格、症状の 5 軸</td></tr>
<tr><th>オントロジー</th><td>ものの種類と、種類どうしの関係の定義。本資料の第 1 章の図と表</td></tr>
<tr><th>ナレッジグラフ</th><td>オントロジーに従って実データを「もの」と「関係」として格納したもの。本デモでは Neo4j に約 300 ノード・約 900 関係</td></tr>
<tr><th>故障モード</th><td>部位がどう壊れるかの定義。FMEA の用語。症状（現象）とは区別する</td></tr>
<tr><th>段落（Chunk）</th><td>手順書を節ごとに分けた検索単位。出典とページを持ち、部位・故障モードにリンクされる</td></tr>
<tr><th>根拠パス</th><td>AI の回答が辿った「もの」と「関係」の列。例：P-301 → CP-200 → 主軸ベアリング → 主軸ベアリング内輪摩耗 → WO-2026-015 → PR-001</td></tr>
</table>
<div class="note">御社データに置き換える場合：設備台帳（Line・Equipment・Model）、部品構成表と購買マスタ（Component・Part・Supplier）、故障辞書または作業報告の原因欄（FailureMode・Symptom）、作業標準書（Procedure）、技能台帳（Technician）、保全管理システム（WorkOrder）、マニュアル PDF（Chunk）がそれぞれの元になる。</div>
</section>""")

doc = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>A工場 設備保全データの関係性ガイド</title><style>{CSS}</style></head>
<body>{"".join(parts_html)}</body></html>"""
OUT_HTML.write_text(doc, encoding="utf-8")
print(f"html: {OUT_HTML}")

cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--no-margins",
       f"--print-to-pdf={OUT_PDF}", OUT_HTML.as_uri()]
r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
if not OUT_PDF.exists():
    print(r.stderr[-2000:])
    raise SystemExit("pdf not generated")
print(f"pdf: {OUT_PDF} ({OUT_PDF.stat().st_size // 1024} KB)")
