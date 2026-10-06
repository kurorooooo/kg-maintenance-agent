// 設備保全ナレッジグラフ × AI エージェント ディスカッション資料（AIdeaLab → 大手製造業）
// 使い方: node deck/build.js  → docs/discussion_deck.pptx
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Fi = require("react-icons/fi");
const { applyTheme } = require(
  "/Users/kuro/.claude/skills/synced/8153ea84-272f-432f-95e7-b8da24bde249_5a237aca-224f-468d-b79b-259e1da3326c/pptx/scripts/apply_theme.js"
);

const OUT = path.resolve(__dirname, "..", "docs", "discussion_deck.pptx");

// ---------------------------------------------------------------- theme (6色)
const BLUE = "2F54F7", LBLUE = "DCE4FE", DGRAY = "3C4049", LGRAY = "EEF0F3", BLACK = "000000", WHITE = "FFFFFF";
const THEME = {
  name: "AIdeaLab KG",
  headFontFace: "Yu Gothic",
  bodyFontFace: "Yu Gothic",
  colors: {
    dk1: BLACK, lt1: WHITE, dk2: DGRAY, lt2: LBLUE,
    accent1: BLUE, accent2: LBLUE, accent3: LGRAY, accent4: DGRAY, accent5: BLUE, accent6: LGRAY,
    hlink: BLUE, folHlink: DGRAY,
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = "AIdeaLab";
pres.title = "設備保全ナレッジグラフ × AIエージェント ディスカッション資料";
const C = pres.SchemeColor;

const W = 13.33, H = 7.5, MX = 0.55; // 余白
const FOOTER = "AIdeaLab  |  設備保全ナレッジグラフ × AIエージェント  |  ディスカッション資料";

// ---------------------------------------------------------------- icons
async function iconData(Icon, color = "#" + BLUE) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color, size: 256, strokeWidth: 1.75 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
const ICONS = {};
async function loadIcons() {
  const list = {
    db: Fi.FiDatabase, file: Fi.FiFileText, book: Fi.FiBookOpen, user: Fi.FiUser, users: Fi.FiUsers,
    search: Fi.FiSearch, graph: Fi.FiShare2, link: Fi.FiLink, shield: Fi.FiShield, activity: Fi.FiActivity,
    box: Fi.FiPackage, clock: Fi.FiClock, layers: Fi.FiLayers, cpu: Fi.FiCpu, check: Fi.FiCheckCircle,
    alert: Fi.FiAlertTriangle, trend: Fi.FiTrendingUp, chat: Fi.FiMessageSquare, target: Fi.FiTarget,
    eye: Fi.FiEye, tool: Fi.FiTool, grid: Fi.FiGrid, zap: Fi.FiZap, map: Fi.FiMap, help: Fi.FiHelpCircle,
    flag: Fi.FiFlag, server: Fi.FiServer, edit: Fi.FiEdit3, bar: Fi.FiBarChart2, compass: Fi.FiCompass,
  };
  for (const [k, Icon] of Object.entries(list)) {
    ICONS[k] = await iconData(Icon);
    ICONS[k + "_w"] = await iconData(Icon, "#" + WHITE);
  }
}

// ---------------------------------------------------------------- layouts
pres.defineSlideMaster({
  title: "TITLE",
  background: { color: WHITE },
  objects: [
    { rect: { x: 0, y: 0, w: 5.6, h: H, fill: { color: BLUE } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.6, w: 4.6, h: 3.2, fontSize: 30, bold: true, color: WHITE, valign: "top", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 6.2, y: 1.7, w: 6.4, h: 3.6, fontSize: 16, color: DGRAY, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "SECTION",
  background: { color: BLUE },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 1.0, y: 2.9, w: 11.3, h: 1.2, fontSize: 34, bold: true, color: WHITE, valign: "top", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 1.0, y: 4.2, w: 11.3, h: 1.4, fontSize: 16, color: LBLUE, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "section", type: "body", x: MX, y: 0.32, w: 8, h: 0.3, fontSize: 10, color: DGRAY, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.62, w: W - 2 * MX, h: 0.95, fontSize: 20, bold: true, color: BLACK, valign: "top", align: "left", margin: 0 }, text: "" } },
    { text: { text: FOOTER, options: { x: MX, y: 7.02, w: 9, h: 0.3, fontSize: 9, color: DGRAY, margin: 0 } } },
  ],
  slideNumber: { x: W - MX - 0.8, y: 7.02, w: 0.8, h: 0.3, fontSize: 9, color: DGRAY, align: "right" },
});

// ---------------------------------------------------------------- helpers
let currentSection = "";
function content(title, opts = {}) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: currentSection });
  s.addText(opts.tracker || currentSection, { placeholder: "section" });
  s.addText(title, { placeholder: "title" });
  if (opts.notes) s.addNotes(opts.notes);
  return s;
}
function section(num, title, sub) {
  currentSection = `${num}. ${title}`;
  pres.addSection({ title: currentSection });
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: currentSection });
  s.addText([{ text: `${num}  `, options: { color: LBLUE } }, { text: title }], { placeholder: "title" });
  if (sub) s.addText(sub, { placeholder: "body" });
  return s;
}
function txt(s, text, o) {
  s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontSize: 13, color: C.text1, valign: "top" }, o));
}
function rect(s, x, y, w, h, fill, o = {}) {
  s.addShape(pres.ShapeType.rectangle, Object.assign({ x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 } }, o));
}
function rrect(s, x, y, w, h, fill, o = {}) {
  s.addShape(pres.ShapeType.roundRect, Object.assign({ x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.08 }, o));
}
function iconCircle(s, key, x, y, d = 0.6, fill = C.background2) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } });
  s.addImage({ data: ICONS[key], x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56 });
}
// カード：アイコン＋見出し＋本文
function card(s, x, y, w, h, { icon, head, body, fill = C.accent3, headColor = C.text1, bodySize = 12 }) {
  rrect(s, x, y, w, h, fill);
  if (icon) iconCircle(s, icon, x + 0.25, y + 0.25, 0.6, C.background1);
  txt(s, head, { x: x + (icon ? 1.0 : 0.25), y: y + 0.28, w: w - (icon ? 1.25 : 0.5), h: 0.55, fontSize: 14, bold: true, color: headColor });
  const b = Array.isArray(body) ? body.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < body.length - 1, paraSpaceAfter: 4 } })) : body;
  txt(s, b, { x: x + 0.25, y: y + 0.95, w: w - 0.5, h: h - 1.15, fontSize: bodySize, color: C.text1 });
}
function stat(s, x, y, w, value, label, color = C.accent1) {
  txt(s, value, { x, y, w, h: 0.9, fontSize: 40, bold: true, color, align: "left" });
  txt(s, label, { x, y: y + 0.9, w, h: 0.6, fontSize: 11, color: C.text2 });
}
function arrow(s, x1, y1, x2, y2, color = DGRAY, width = 1.25) {
  const o = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color, width, endArrowType: "triangle" } };
  if (y2 < y1) o.flipV = true;
  if (x2 < x1) o.flipH = true;
  s.addShape(pres.ShapeType.line, o);
}
function hArrow(s, x, y, w, color = DGRAY) { arrow(s, x, y, x + w, y, color, 1.5); }
function tbl(s, rows, o) {
  const header = rows[0].map((h) => ({ text: h, options: { bold: true, fill: { color: LBLUE }, color: BLACK } }));
  const body = rows.slice(1).map((r) => r.map((c) => (typeof c === "object" ? c : { text: String(c) })));
  s.addTable([header, ...body], Object.assign({ fontSize: 11, color: BLACK, border: { type: "solid", color: "C9D0DA", pt: 0.75 }, valign: "middle", margin: 0.05 }, o));
}
function nodeBox(s, x, y, w, h, title, sub, fill = C.background2, lineColor = BLUE, color = C.text1) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: lineColor, width: 1 }, rectRadius: 0.06 });
  const runs = sub ? [{ text: title, options: { bold: true, breakLine: true } }, { text: sub, options: { fontSize: 9 } }] : [{ text: title, options: { bold: true } }];
  txt(s, runs, { x, y, w, h, fontSize: 10.5, align: "center", valign: "middle", color });
}

// ================================================================ slides
async function build() {
  await loadIcons();

  // ---------- 1. 表紙
  pres.addSection({ title: "表紙" });
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "表紙" });
    s.addText("設備保全\nナレッジグラフ ×\nAIエージェント", { placeholder: "title" });
    s.addText(
      [
        { text: "根拠付きで答える保全アシスタントの構築に向けて", options: { fontSize: 18, bold: true, color: BLACK, breakLine: true } },
        { text: "", options: { breakLine: true } },
        { text: "新規提案に向けたディスカッション資料", options: { breakLine: true } },
        { text: "大手製造業 設備保全・生産技術・DX推進部門 向け", options: { breakLine: true } },
        { text: "", options: { breakLine: true } },
        { text: "AIdeaLab　2026年10月", options: { color: BLUE, bold: true } },
      ],
      { placeholder: "body" }
    );
    txt(s, "本資料は合成データによるデモ結果に基づく議論用の資料です。実在の企業・設備・人物とは関係ありません。", { x: 6.2, y: 6.5, w: 6.4, h: 0.5, fontSize: 9, color: C.text2 });
  }

  // ---------- 2. エグゼクティブサマリー
  currentSection = "エグゼクティブサマリー";
  pres.addSection({ title: currentSection });
  {
    const s = content("設備保全のノウハウをグラフにつなげば、根拠付きで答えるAIアシスタントを数週間で作れる", { tracker: "エグゼクティブサマリー" });
    const items = [
      ["alert", "課題", "保全の判断材料は設備台帳・作業報告・マニュアル・ベテランの頭に散在し、夜間や退職で途切れる。文書検索型のAIでは「別ラインの同型機の事例」のような横断の問いに答えられない。"],
      ["graph", "提案", "設備→部品→故障モード→過去対応→担当者をナレッジグラフとしてつなぎ、AIエージェントが読み取り専用で辿って答える。回答には作業報告IDや手順書のページを根拠として必ず添える。"],
      ["check", "検証", "架空のA工場（3ライン12設備、作業報告80件、手順書5冊）で代表質問4本すべてに正しい根拠付きで回答。横断・集計・出典提示が実データなしで再現できることを確認した。"],
      ["chat", "本日の論点", "御社でどのライン・設備から始めるか、台帳・作業報告・マニュアルの所在と形式、代表質問と正解の定義、現場・保全・DXの体制。4週間のPoCを提案する。"],
    ];
    items.forEach(([icon, head, body], i) => {
      const y = 1.75 + i * 1.3;
      iconCircle(s, icon, MX, y, 0.65);
      txt(s, head, { x: MX + 0.9, y, w: 2.0, h: 0.65, fontSize: 15, bold: true, color: C.accent1, valign: "middle" });
      txt(s, body, { x: MX + 2.9, y: y - 0.02, w: W - MX * 2 - 2.9, h: 1.15, fontSize: 12.5 });
    });
  }

  // ========== 1. 背景と課題
  section(1, "背景と課題", "保全ノウハウはどこにあり、なぜ今のAIでは届かないのか");
  {
    const s = content("保全の判断材料は4か所に散在し、夜間の異常やベテランの退職で判断が途切れる");
    const cards = [
      ["db", "設備台帳・部品表", ["設備管理システムやExcelに型式・設置年・部品構成", "同型機がどこに何台あるかは台帳をまたいで探す"]],
      ["file", "作業報告", ["CMMSや日報、紙に「いつ・何が起き・何をしたか」", "過去の類似事例は担当者の記憶に頼って探す"]],
      ["book", "マニュアル", ["メーカー発行のPDFや紙。判定基準や交換手順", "「どのページに書いてあったか」を覚えている人が必要"]],
      ["user", "ベテランの経験", ["症状から原因を絞る勘所、再発時に疑うべき箇所", "夜勤帯は不在。定年で失われる"]],
    ];
    cards.forEach(([icon, head, body], i) => card(s, MX + i * 3.1, 1.8, 2.95, 2.75, { icon, head, body, bodySize: 12 }));
    rrect(s, MX, 4.95, W - 2 * MX, 1.45, C.background2);
    txt(s, [
      { text: "A工場（デモ）での例　", options: { bold: true, color: C.accent1 } },
      { text: "プレス機の3つの手順（スライドガイド交換、クラッチブレーキ交換、フライホイールベアリング交換）は資格「プレス機械作業主任者」を持つ技術者が1名のみで、2026年度末に定年予定。この事実は台帳・作業報告・技能台帳を別々に見ていると気づけない。" },
    ], { x: MX + 0.3, y: 5.1, w: W - 2 * MX - 0.6, h: 1.2, fontSize: 12.5 });
  }
  {
    const s = content("文書検索型のAI（RAG）は「別ラインの同型機の事例」のような横断の問いに答えられない");
    const colW = (W - 2 * MX - 0.4) / 2;
    const cols = [
      ["文書検索型AI（RAG のみ）", C.accent3, C.text1, [
        "文書の断片を「似ている文章」で探す。P-301 のマニュアルや報告書は見つかる",
        "別ラインの同型機の報告書には「P-301」と書かれていないため出てこない",
        "「直近1年でベアリング起因の停止が多い設備」のような集計ができない",
        "根拠は文章の断片。どの設備・どの作業報告かを人が読み解く必要がある",
        "部品番号や納期を文脈から推測して書いてしまう危険がある",
      ]],
      ["ナレッジグラフ ＋ AIエージェント（提案）", C.background2, C.accent1, [
        "設備・部品・故障モード・作業報告を「もの」と「関係」として格納する",
        "P-301 → 型式 CP-200 ← P-101 と型式を経由して別ラインの同型機へ横断する",
        "故障モードのカテゴリや日付で絞って集計できる",
        "根拠は作業報告ID・手順ID・手順書のページ。グラフ上のパスとして可視化できる",
        "グラフにない部品番号・納期は作らず「記録なし」と答える",
      ]],
    ];
    cols.forEach(([head, fill, hc, body], i) => {
      const x = MX + i * (colW + 0.4);
      rrect(s, x, 1.8, colW, 4.9, fill);
      txt(s, head, { x: x + 0.3, y: 2.0, w: colW - 0.6, h: 0.5, fontSize: 15, bold: true, color: hc });
      txt(s, body.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < body.length - 1, paraSpaceAfter: 8 } })), { x: x + 0.3, y: 2.6, w: colW - 0.6, h: 4.0, fontSize: 13 });
    });
    hArrow(s, MX + colW + 0.05, 4.25, 0.3, BLUE);
  }

  // ========== 2. 提案するアプローチ
  section(2, "提案するアプローチ", "社内データをナレッジグラフにつなぎ、AIが根拠パス付きで答える");
  {
    const s = content("社内の設備情報と対応履歴をグラフにつなぎ、AIエージェントが読み取り専用で辿って答える構成を提案する");
    // 左: データ源
    const srcs = [["db", "設備台帳・部品構成"], ["file", "作業報告（CMMS）"], ["book", "マニュアル PDF"], ["users", "技能台帳・購買"]];
    txt(s, "御社の既存データ", { x: MX, y: 1.75, w: 2.6, h: 0.35, fontSize: 11, bold: true, color: C.text2 });
    srcs.forEach(([icon, label], i) => {
      const y = 2.15 + i * 0.95;
      rrect(s, MX, y, 2.6, 0.75, C.accent3);
      iconCircle(s, icon, MX + 0.12, y + 0.08, 0.58, C.background1);
      txt(s, label, { x: MX + 0.85, y, w: 1.7, h: 0.75, fontSize: 11.5, bold: true, valign: "middle" });
    });
    // 変換
    hArrow(s, MX + 2.7, 3.9, 0.55, BLUE);
    rrect(s, 3.85, 2.15, 1.9, 3.55, C.background2);
    txt(s, [{ text: "変換・投入", options: { bold: true, breakLine: true } }, { text: "表記ゆれの正規化、故障モード辞書化、マニュアルの段落分割と埋め込み", options: { fontSize: 10.5, color: C.text2 } }], { x: 3.95, y: 2.3, w: 1.7, h: 3.2, fontSize: 12.5, align: "center", valign: "middle" });
    hArrow(s, 5.8, 3.9, 0.55, BLUE);
    // KG
    rrect(s, 6.4, 2.15, 2.4, 3.55, C.accent1);
    s.addImage({ data: ICONS.graph_w, x: 7.3, y: 2.45, w: 0.6, h: 0.6 });
    txt(s, [{ text: "ナレッジグラフ", options: { bold: true, breakLine: true } }, { text: "Neo4j", options: { breakLine: true } }, { text: "設備・部品・故障モード・作業報告・手順・技術者・手順書の段落を「もの」と「関係」で格納", options: { fontSize: 10.5 } }], { x: 6.5, y: 3.1, w: 2.2, h: 2.4, fontSize: 12.5, color: C.background1, align: "center" });
    hArrow(s, 8.85, 3.9, 0.55, BLUE);
    // MCP + AI
    rrect(s, 9.45, 2.15, 3.3, 1.65, C.background2);
    txt(s, [{ text: "接続層（MCP）読み取り専用", options: { bold: true, breakLine: true } }, { text: "AIが実行できるのは読み取りクエリと手順書検索のみ。書き込みは物理的に不可", options: { fontSize: 10.5, color: C.text2 } }], { x: 9.6, y: 2.25, w: 3.0, h: 1.45, fontSize: 12, valign: "middle" });
    rrect(s, 9.45, 4.05, 3.3, 1.65, C.background2);
    txt(s, [{ text: "AIエージェント（Claude）", options: { bold: true, breakLine: true } }, { text: "症状から起点を決め、グラフを辿り、固定の形式で回答。末尾に根拠IDとパスを列挙", options: { fontSize: 10.5, color: C.text2 } }], { x: 9.6, y: 4.15, w: 3.0, h: 1.45, fontSize: 12, valign: "middle" });
    // 下: 利用者
    rrect(s, MX, 6.0, W - 2 * MX, 0.7, C.accent3);
    txt(s, [{ text: "利用者（保全担当者）　", options: { bold: true } }, { text: "チャットで質問し、回答と並べてグラフ上の根拠パスを画面で確認する。自作部分はデータ変換・投入・手順書検索の3スクリプトのみで、グラフDBとAIは既製品を組み合わせる。" }], { x: MX + 0.3, y: 6.0, w: W - 2 * MX - 0.6, h: 0.7, fontSize: 11.5, valign: "middle" });
  }
  {
    const s = content("仕組みは3つ：ベクトルで入口を見つけ、グラフで文脈を辿り、IDで根拠を示す");
    const cw = (W - 2 * MX - 0.8) / 3;
    const cards = [
      ["search", "① 意味検索で入口を決める", "「振動が上がっている」という言い回しを数値ベクトルにし、手順書の中で意味の近い段落を探す。段落は部位・故障モードにリンク済みなので、ここから構造検索に入れる。", "手順書検索ツール（ローカル埋め込みモデル、APIキー不要）"],
      ["graph", "② グラフで文脈を辿る", "設備→型式→部品→故障モード→作業報告→手順→部品→サプライヤー、という関係を問い合わせ言語（Cypher）で辿る。件数や停止時間の集計もここで行う。", "グラフ問い合わせツール（読み取り専用）"],
      ["link", "③ IDで根拠を固定する", "回答の末尾に作業報告ID・手順ID・手順書の段落ID（出典とページ）と、辿ったパスを必ず列挙する。グラフにないことは「記録なし」と答える。", "システムプロンプトで回答形式を固定"],
    ];
    cards.forEach(([icon, head, body, foot], i) => {
      const x = MX + i * (cw + 0.4);
      rrect(s, x, 1.8, cw, 4.3, C.accent3);
      iconCircle(s, icon, x + 0.3, 2.05, 0.7, C.background1);
      txt(s, head, { x: x + 0.3, y: 2.9, w: cw - 0.6, h: 0.5, fontSize: 14.5, bold: true, color: C.accent1 });
      txt(s, body, { x: x + 0.3, y: 3.45, w: cw - 0.6, h: 1.9, fontSize: 12 });
      txt(s, foot, { x: x + 0.3, y: 5.4, w: cw - 0.6, h: 0.6, fontSize: 10.5, color: C.text2, italic: true });
    });
    txt(s, "説明の一言：「ベクトルで入口を見つけ、グラフで文脈を辿り、IDで根拠を示す」。ベクトル検索は入口を決めるだけで、答えの中身は常にグラフの構造から取る。", { x: MX, y: 6.3, w: W - 2 * MX, h: 0.5, fontSize: 12, bold: true, color: C.text2 });
  }
  {
    const s = content("12種類のデータを18の関係でつなぎ、故障モードをハブに置く");
    // 図（左 8.2in）
    const bw = 1.45, bh = 0.52;
    const pos = {
      Line: [0.6, 1.95], Equipment: [2.75, 1.95], Model: [4.9, 1.95], Component: [7.05, 1.95],
      Symptom: [2.75, 3.55], FailureMode: [4.9, 3.55], Part: [7.05, 3.55],
      Technician: [0.6, 5.15], WorkOrder: [2.75, 5.15], Procedure: [4.9, 5.15], Supplier: [7.05, 5.15],
      Chunk: [7.05, 6.25],
    };
    const ja = { Line: "ライン", Equipment: "設備", Model: "型式", Component: "部位", Symptom: "症状", FailureMode: "故障モード", Part: "購入部品", Technician: "技術者", WorkOrder: "作業報告", Procedure: "対処手順", Supplier: "サプライヤー", Chunk: "手順書の段落" };
    const edges = [
      ["Line", "Equipment"], ["Equipment", "Model"], ["Model", "Component"], ["Component", "Part"], ["Component", "FailureMode"],
      ["FailureMode", "Symptom"], ["Procedure", "FailureMode"], ["Procedure", "Part"], ["Part", "Supplier"],
      ["WorkOrder", "Equipment"], ["WorkOrder", "Symptom"], ["WorkOrder", "FailureMode"], ["WorkOrder", "Procedure"], ["WorkOrder", "Technician"],
      ["Technician", "Line"], ["Chunk", "FailureMode"], ["Chunk", "Part"],
    ];
    const ctr = (k) => [pos[k][0] + bw / 2, pos[k][1] + bh / 2];
    for (const [a, b] of edges) {
      const [x1, y1] = ctr(a), [x2, y2] = ctr(b);
      const dx = x2 - x1, dy = y2 - y1;
      const t1 = Math.min(dx ? bw / 2 / Math.abs(dx) : 9, dy ? bh / 2 / Math.abs(dy) : 9);
      const t2 = Math.min(dx ? bw / 2 / Math.abs(dx) : 9, dy ? bh / 2 / Math.abs(dy) : 9);
      arrow(s, x1 + dx * t1, y1 + dy * t1, x2 - dx * t2 * 1.08, y2 - dy * t2 * 1.08, DGRAY, 1);
    }
    for (const [k, [x, y]] of Object.entries(pos)) {
      const fill = k === "FailureMode" ? C.accent1 : k === "WorkOrder" ? C.background2 : C.accent3;
      const col = k === "FailureMode" ? C.background1 : C.text1;
      s.addShape(pres.ShapeType.roundRect, { x, y, w: bw, h: bh, fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.06 });
      txt(s, [{ text: ja[k], options: { bold: true, breakLine: true } }, { text: k, options: { fontSize: 8.5 } }], { x, y, w: bw, h: bh, fontSize: 10.5, color: col, align: "center", valign: "middle" });
    }
    // 右：説明
    const rx = 9.1, rw = W - MX - rx;
    const pts = [
      ["故障モードがハブ", "症状から故障モードへ入り、部位・型式を経由して同型機へ横断し、作業報告と手順で過去の対応に降り、部品からサプライヤーへ辿る。"],
      ["作業報告が5つを結ぶ", "作業報告1件が設備・症状・故障モード・手順・技術者を同時に結ぶ。過去事例を起点にどの方向にも辿れる。"],
      ["手順書は段落単位でリンク", "マニュアルの段落は言及する部位・故障モードにつながる。意味検索の入口であり、回答の出典になる。"],
      ["名前は英語、値は日本語", "種類と関係の名前は英語で固定し、設備名や故障モード名は現場の日本語のまま。AIの問い合わせを安定させる。"],
    ];
    pts.forEach(([h, b], i) => {
      const y = 1.9 + i * 1.2;
      txt(s, h, { x: rx, y, w: rw, h: 0.35, fontSize: 12.5, bold: true, color: C.accent1 });
      txt(s, b, { x: rx, y: y + 0.35, w: rw, h: 0.85, fontSize: 11 });
    });
  }
  {
    const s = content("分類体系（タクソノミー）は現場の既存の分け方を5つの軸としてそのまま使う");
    tbl(s, [
      ["分類の軸", "階層・値", "元になる台帳", "AIが使う場面"],
      ["場所の階層", "工場 → ライン（3） → 設備個体（12）。設備IDの頭文字が種類を表す（P: ポンプ、CV: コンベア …）", "設備台帳", "「3号ラインの冷却ポンプ」から起点の設備を特定する"],
      ["設備の種類", "カテゴリ（5） → 型式（5） → 設備個体。同型機は部品構成と故障モードを共有", "設備台帳・メーカー仕様", "型式を経由して別ラインの同型機へ横断する"],
      ["故障モードの分類", "9カテゴリ（ベアリング、潤滑、芯ずれ、シール、詰まり、電気、摩耗、センサ、不釣合い）× 重大度3段階", "FMEA・故障辞書", "「ベアリング起因の停止」を1語で絞って集計する"],
      ["資格", "回転機械整備、電気工事士、プレス機械作業主任者、資格不要", "作業標準書・技能台帳", "手順の必要資格と技術者の保有資格を突き合わせる"],
      ["症状", "振動増大、異音、軸受温度上昇、漏れ、過電流 … 15種。故障モードとは重み付きで多対多", "作業報告の記述", "症状から故障モード候補を重み順に挙げる"],
    ], { x: MX, y: 1.8, w: W - 2 * MX, colW: [1.7, 4.6, 2.2, 3.73], fontSize: 11, rowH: [0.4, 0.8, 0.8, 0.8, 0.7, 0.8] });
    txt(s, "ポイント：分類は新たに設計するものではなく、設備台帳・FMEA・技能台帳にすでにある分け方を属性として持たせるだけで、AIの問いが「1語で絞れる」ようになる。", { x: MX, y: 6.3, w: W - 2 * MX, h: 0.5, fontSize: 12, bold: true, color: C.text2 });
  }

  // ========== 3. デモ
  section(3, "デモ：架空のA工場", "合成データで、横断・集計・出典提示が再現できることを確かめた");
  {
    const s = content("架空のA工場（3ライン12設備）に、同型ポンプの横断と故障の偏りを意図的に埋め込んだ");
    tbl(s, [
      ["ライン", "工程", "設備（型式）"],
      ["第1ライン", "プレス", "PR-101・PR-102 プレス機（PM-800）、P-101 冷却ポンプ（CP-200）、CV-101 搬出コンベア（BC-50）"],
      ["第2ライン", "搬送", "CV-201・CV-202・CV-203 コンベア（BC-50）、P-201 冷却ポンプ（CP-200）"],
      ["第3ライン", "冷却ユーティリティ", "P-301・P-302 冷却ポンプ（CP-200）、CT-301 冷却塔（CT-10）、AC-301 エアコンプレッサ（AC-75）"],
    ], { x: MX, y: 1.8, w: 7.6, colW: [1.3, 1.6, 4.7], fontSize: 11, rowH: [0.4, 0.75, 0.75, 0.75] });
    txt(s, "意図的に埋め込んだ「気づき」", { x: MX, y: 4.75, w: 7.6, h: 0.35, fontSize: 12.5, bold: true, color: C.accent1 });
    txt(s, [
      { text: "同型の冷却ポンプ CP-200 を全ラインに配置し、主軸ベアリング内輪摩耗が P-301 と P-101 で繰り返し起きている", options: { bullet: true, breakLine: true, paraSpaceAfter: 4 } },
      { text: "ベアリング起因の停止時間が P-301 と CV-201 に偏っている", options: { bullet: true, breakLine: true, paraSpaceAfter: 4 } },
      { text: "P-301 は再発間隔が短くなり、作業報告に「据付ベースの沈下を疑うべき」という現場コメントがある", options: { bullet: true } },
    ], { x: MX, y: 5.15, w: 7.6, h: 1.5, fontSize: 11.5 });
    const sx = 8.7;
    stat(s, sx, 1.8, 2.0, "12", "設備・5型式・40部位");
    stat(s, sx + 2.1, 1.8, 2.0, "25", "故障モード・15症状");
    stat(s, sx, 3.4, 2.0, "80", "作業報告（直近2年）");
    stat(s, sx + 2.1, 3.4, 2.0, "43", "手順書の段落（5冊）");
    stat(s, sx, 5.0, 4.1, "約300 / 900", "グラフ上のノード数 / 関係数");
  }
  {
    const s = content("シナリオは夜勤帯のポンプ異常。4つの質問で診断から次の行動、全体の傾向までを辿る");
    txt(s, "設定：第3ラインの冷却ポンプ P-301 で振動が上がった。夜勤帯でベテランは不在。担当者がAIアシスタントに順に尋ねる。", { x: MX, y: 1.75, w: W - 2 * MX, h: 0.45, fontSize: 12.5, color: C.text2 });
    const steps = [
      ["Q1 診断", "P-301 で振動が上がっている。考えられる原因と過去の対処は？", "症状から故障モードを件数順に絞り、手順書の該当ページで裏付ける"],
      ["Q2 横断", "同じ型式のポンプで同じ症状が出た事例は他ラインにもある？", "型式を経由して別ラインの同型機の作業報告に横断する"],
      ["Q3 行動", "その対処に必要な部品の在庫と納期、対応できる技術者は？", "手順→部品→サプライヤー、資格→技術者と一気通貫で出す"],
      ["Q4 傾向", "直近1年でベアリング起因の停止が多い設備はどこ？", "故障モードのカテゴリと日付で作業報告を集計する"],
    ];
    const cw = (W - 2 * MX - 3 * 0.35) / 4;
    steps.forEach(([h, q, b], i) => {
      const x = MX + i * (cw + 0.35);
      rrect(s, x, 2.4, cw, 0.6, C.accent1);
      txt(s, h, { x, y: 2.4, w: cw, h: 0.6, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle" });
      rrect(s, x, 3.0, cw, 3.4, C.accent3);
      txt(s, [{ text: "質問", options: { bold: true, color: C.text2, fontSize: 10, breakLine: true } }, { text: q }], { x: x + 0.2, y: 3.15, w: cw - 0.4, h: 1.5, fontSize: 12 });
      txt(s, [{ text: "見せ場", options: { bold: true, color: C.text2, fontSize: 10, breakLine: true } }, { text: b }], { x: x + 0.2, y: 4.75, w: cw - 0.4, h: 1.5, fontSize: 11.5 });
      if (i < 3) hArrow(s, x + cw + 0.03, 2.7, 0.29, BLUE);
    });
    txt(s, "各回答のあと、グラフ可視化ツールで同じパスを表示し、「根拠がグラフ上にある」ことを並べて見せる。", { x: MX, y: 6.55, w: W - 2 * MX, h: 0.4, fontSize: 11.5, color: C.text2 });
  }
  {
    const s = content("質問1：症状から故障モードを過去事例の件数順に絞り、マニュアルの該当ページで裏付ける");
    txt(s, "AIの回答（要旨）", { x: MX, y: 1.75, w: 7.6, h: 0.35, fontSize: 12, bold: true, color: C.accent1 });
    txt(s, "結論：P-301 の振動増大は主軸ベアリング内輪摩耗の可能性が最も高い。ただし約半年周期で再発しており、直近の報告で据付ベースの傾きが確認されているため、交換に加えて芯出し・据付状態の確認が必要。", { x: MX, y: 2.1, w: 7.6, h: 0.95, fontSize: 11.5 });
    tbl(s, [
      ["原因候補（確度順）", "分類", "症状の重み", "P-301 過去事例", "対処手順"],
      ["主軸ベアリング内輪摩耗", "ベアリング", "0.9", "6件", "PR-001 主軸ベアリング交換（240分・要資格）"],
      ["インペラ不釣合い", "不釣合い", "0.7", "2件", "PR-003 インペラ清掃・バランス確認"],
      ["カップリング芯ずれ", "芯ずれ", "0.6", "2件", "PR-004 芯出し調整"],
      ["軸受グリース劣化", "潤滑", "0.4", "2件", "PR-002 グリース補給（資格不要）"],
    ], { x: MX, y: 3.15, w: 7.6, colW: [2.1, 1.0, 0.9, 1.1, 2.5], fontSize: 10.5, rowH: 0.42 });
    txt(s, "手順書の判定基準（出典 CH-cp-200-002、p.1）：振動 4.5mm/s 以下が良、7.1mm/s 超で要注意。高周波の転走音ならベアリング、回転同期成分が卓越なら不釣合い・芯ずれ。", { x: MX, y: 5.45, w: 7.6, h: 0.9, fontSize: 11, color: C.text2 });
    // 根拠
    const rx = 8.55, rw = W - MX - rx;
    rrect(s, rx, 1.75, rw, 4.95, C.background2);
    txt(s, "回答末尾の「根拠」節（固定形式）", { x: rx + 0.25, y: 1.9, w: rw - 0.5, h: 0.4, fontSize: 12, bold: true, color: C.accent1 });
    txt(s, [
      { text: "作業報告", options: { bold: true, breakLine: true } },
      { text: "WO-2026-020, WO-2026-015, WO-2026-002, WO-2025-028, WO-2025-015, WO-2024-006（ベアリング）ほか", options: { breakLine: true, paraSpaceAfter: 6 } },
      { text: "手順", options: { bold: true, breakLine: true } },
      { text: "PR-001, PR-004, PR-003, PR-002", options: { breakLine: true, paraSpaceAfter: 6 } },
      { text: "手順書", options: { bold: true, breakLine: true } },
      { text: "CH-cp-200-002（CP-200 保全マニュアル 第3版, p.1）、CH-cp-200-006（同, p.1）、CH-cp-200-007（同, p.1）", options: { breakLine: true, paraSpaceAfter: 6 } },
      { text: "パス", options: { bold: true, breakLine: true } },
      { text: "P-301 → CP-200 → 主軸ベアリング → 主軸ベアリング内輪摩耗 → WO-2026-020 → PR-001" },
    ], { x: rx + 0.25, y: 2.35, w: rw - 0.5, h: 4.2, fontSize: 10.5 });
  }
  {
    const s = content("質問2：型式ノードを経由することで、別ラインの同型機の事例に横断できる");
    // パス図
    const by = 3.3;
    nodeBox(s, MX, by, 1.9, 0.9, "P-301", "第3ライン・6件", C.accent1, BLUE, C.background1);
    hArrow(s, MX + 1.95, by + 0.45, 0.8, BLUE);
    nodeBox(s, 3.35, by, 1.9, 0.9, "型式 CP-200", "渦巻型冷却水ポンプ", C.background2);
    const others = [["P-101", "第1ライン・4件", 1.75], ["P-201", "第2ライン・1件", 3.3], ["P-302", "第3ライン・記録なし", 4.85]];
    others.forEach(([n, sub, y]) => {
      arrow(s, 5.3, by + 0.45, 6.25, y + 0.45, BLUE, 1.5);
      nodeBox(s, 6.3, y, 1.9, 0.9, n, sub, C.accent3, DGRAY);
    });
    txt(s, "OF_MODEL", { x: 2.2, y: by + 0.05, w: 1.2, h: 0.3, fontSize: 9, color: C.text2, align: "center" });
    txt(s, "OF_MODEL（逆向き）", { x: 5.0, y: by - 0.45, w: 1.6, h: 0.3, fontSize: 9, color: C.text2, align: "center" });
    // 右: 説明
    const rx = 8.9, rw = W - MX - rx;
    txt(s, "AIの回答（要旨）", { x: rx, y: 1.75, w: rw, h: 0.35, fontSize: 12, bold: true, color: C.accent1 });
    txt(s, "あります。同型 CP-200 の冷却ポンプでは、第1ラインの P-101 で4件、第2ラインの P-201 で1件、主軸ベアリング内輪摩耗の作業報告があります。予備機 P-302 は記録なしです。", { x: rx, y: 2.1, w: rw, h: 1.5, fontSize: 11.5 });
    txt(s, "なぜ文書検索では出ないか", { x: rx, y: 3.75, w: rw, h: 0.35, fontSize: 12, bold: true, color: C.accent1 });
    txt(s, "P-101 の作業報告には「P-301」という語が一切ない。文章の類似で探す限り届かず、「同じ型式」という関係を辿って初めて見つかる。これが構造を持つことの価値。", { x: rx, y: 4.1, w: rw, h: 1.5, fontSize: 11.5 });
    txt(s, "根拠：WO-2024-007, WO-2025-021, WO-2026-008, WO-2026-025（P-101）／ WO-2025-032（P-201）", { x: rx, y: 5.7, w: rw, h: 0.9, fontSize: 10.5, color: C.text2 });
    txt(s, "回答に添えられたパス：P-301 → CP-200 ← P-101（第1ライン） → WO-2026-025 → 主軸ベアリング内輪摩耗 → PR-001", { x: MX, y: 6.1, w: 8.0, h: 0.5, fontSize: 10.5, color: C.text2 });
  }
  {
    const s = content("質問3：対処手順から必要部品の在庫・納期と、有資格で実績のある技術者まで一気通貫で出る");
    txt(s, "手順 PR-001 冷却ポンプ主軸ベアリング交換（標準240分、要資格「回転機械整備」）に必要な部品", { x: MX, y: 1.75, w: W - 2 * MX, h: 0.35, fontSize: 12, bold: true, color: C.accent1 });
    tbl(s, [
      ["部品", "品番", "必要数", "在庫", "納期", "サプライヤー", "判定"],
      ["深溝玉軸受 6306ZZ", "6306ZZ", "2", "4", "3日", "東和ベアリング商会", "在庫あり（残り1回分）"],
      ["軸受グリース EP2", "GR-EP2-400", "1", "12", "2日", "東和ベアリング商会", "在庫あり"],
      ["メカニカルシール CP-200用", "MS-200-A", "1", "2", "14日", "北陽ポンプ工業", "在庫あり（納期長・要発注）"],
    ], { x: MX, y: 2.15, w: W - 2 * MX, colW: [2.6, 1.4, 0.9, 0.8, 0.9, 2.3, 3.33], fontSize: 11, rowH: 0.4 });
    txt(s, "資格「回転機械整備」を持つ技術者と PR-001 の実施実績", { x: MX, y: 4.0, w: W - 2 * MX, h: 0.35, fontSize: 12, bold: true, color: C.accent1 });
    tbl(s, [
      ["技術者", "所属", "保有資格", "経験", "PR-001 実績", "備考（技能台帳より）"],
      ["佐伯 恒夫", "第1ライン", "プレス機械作業主任者、回転機械整備", "28年", "5件", "ベテラン。2026年度末で定年予定"],
      ["真壁 美咲", "第3ライン", "回転機械整備", "12年", "3件（すべて P-301）", "ポンプ・冷却塔の回転機械担当。第一候補"],
      ["大槌 健", "第3ライン", "回転機械整備、電気工事士", "17年", "2件（すべて P-301）", "P-301 の履歴を最も知る"],
      ["乾 修一", "第2ライン", "回転機械整備", "21年", "1件", "コンベア系主担当。夜勤帯の対応が多い"],
    ], { x: MX, y: 4.4, w: W - 2 * MX, colW: [1.5, 1.2, 3.0, 0.9, 1.9, 3.73], fontSize: 11, rowH: 0.38 });
    txt(s, "AIは資格の照合（手順の必要資格 ∈ 技術者の保有資格）と実績の集計をグラフ上で行い、「第3ラインの真壁・大槌が第一候補」と結論づけた。部品番号・在庫数・納期はすべてグラフの値で、推測は含まれない。", { x: MX, y: 6.35, w: W - 2 * MX, h: 0.6, fontSize: 11, color: C.text2 });
  }
  {
    const s = content("質問4：故障モードのカテゴリで集計し、ベアリング起因の停止がP-301に偏ることを示す");
    const labels = ["P-301 冷却ポンプ", "P-101 冷却ポンプ", "CV-201 主搬送コンベア", "CT-301 冷却塔", "P-201 冷却ポンプ", "CV-203 梱包前コンベア", "CV-101 搬出コンベア"];
    const vals = [935, 646, 521, 386, 328, 321, 273];
    s.addChart(pres.ChartType.bar, [{ name: "停止時間（分）", labels, values: vals }], {
      x: MX, y: 1.75, w: 7.9, h: 4.9, barDir: "bar", barGapWidthPct: 60,
      chartColors: [BLUE], invertedColors: [LBLUE],
      showTitle: true, title: "直近1年のベアリング起因の停止時間（分）", titleFontSize: 12, titleColor: DGRAY, titleFontFace: "+mn-lt",
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: DGRAY, dataLabelFontFace: "+mn-lt",
      catAxisLabelFontSize: 10, catAxisLabelColor: DGRAY, catAxisLabelFontFace: "+mn-lt", catAxisOrientation: "maxMin",
      valAxisLabelFontSize: 9, valAxisLabelColor: DGRAY, valAxisLabelFontFace: "+mn-lt", valAxisMinVal: 0, valAxisMaxVal: 1100,
      valGridLine: { color: LGRAY, size: 0.5 }, catGridLine: { style: "none" }, showLegend: false,
    });
    const rx = 8.85, rw = W - MX - rx;
    txt(s, "AIの回答（要旨）", { x: rx, y: 1.75, w: rw, h: 0.35, fontSize: 12, bold: true, color: C.accent1 });
    txt(s, "最も多いのは P-301（3件・935分）。次いで P-101 と CV-201 が各2件。同型 CP-200 の3台で全11件の半数以上を占め、P-301 は約3か月間隔で再発している。", { x: rx, y: 2.1, w: rw, h: 1.4, fontSize: 11.5 });
    txt(s, "集計の中身", { x: rx, y: 3.6, w: rw, h: 0.35, fontSize: 12, bold: true, color: C.accent1 });
    txt(s, [
      { text: "故障モードの属性 category = bearing で絞る", options: { bullet: true, breakLine: true, paraSpaceAfter: 4 } },
      { text: "作業報告の日付が1年以内のものを数える", options: { bullet: true, breakLine: true, paraSpaceAfter: 4 } },
      { text: "設備ごとに件数と停止時間を合計する", options: { bullet: true, breakLine: true, paraSpaceAfter: 4 } },
      { text: "1本の問い合わせ、実行時間 0.05 秒", options: { bullet: true } },
    ], { x: rx, y: 3.95, w: rw, h: 1.7, fontSize: 11.5 });
    txt(s, "根拠：11件の作業報告IDを列挙（WO-2026-002, WO-2026-015, WO-2026-020 … ）", { x: rx, y: 5.8, w: rw, h: 0.8, fontSize: 10.5, color: C.text2 });
  }
  {
    const s = content("横断検索は、台帳を別々に見ていては気づけない3つの事実を引き出す");
    const cw = (W - 2 * MX - 0.8) / 3;
    const cards = [
      ["box", "共用部品の在庫リスク", "軸受 6306ZZ はポンプ4台（主軸ベアリング）とコンベア4台（テールプーリーベアリング）の計8台で共用。在庫4個は1回の交換で2個使うため2回分しかない。", "部品 ← 部位 ← 型式 ← 設備 と逆向きに辿る"],
      ["users", "技能伝承の空白", "佐伯氏が実施したプレス系3手順（計8件）は、必要資格「プレス機械作業主任者」を持つ人が他におらず後継なし。ポンプ系は3名が引き継げる。", "技術者 ← 作業報告 → 手順 → 必要資格 → 他の技術者"],
      ["clock", "在庫ゼロ部品の長期停止", "在庫ゼロの部品を必要とする手順は2つ。モーター交換（納期21日）が2回、エアエンド交換（納期60日）が1回実施され、後者は工場全体のエア供給に影響した。", "部品{在庫0} ← 手順 ← 作業報告"],
    ];
    cards.forEach(([icon, head, body, path], i) => {
      const x = MX + i * (cw + 0.4);
      rrect(s, x, 1.8, cw, 4.4, C.accent3);
      iconCircle(s, icon, x + 0.3, 2.05, 0.7, C.background1);
      txt(s, head, { x: x + 0.3, y: 2.9, w: cw - 0.6, h: 0.5, fontSize: 14.5, bold: true, color: C.accent1 });
      txt(s, body, { x: x + 0.3, y: 3.45, w: cw - 0.6, h: 2.0, fontSize: 12 });
      txt(s, path, { x: x + 0.3, y: 5.5, w: cw - 0.6, h: 0.6, fontSize: 10, color: C.text2, italic: true });
    });
    txt(s, "いずれも「どの設備が」「誰が」「いつ」を結ぶ関係が1か所にあるから答えられる。文書検索や個別の台帳検索では問い自体を立てにくい。", { x: MX, y: 6.4, w: W - 2 * MX, h: 0.45, fontSize: 11.5, bold: true, color: C.text2 });
  }
  {
    const s = content("幻覚を防ぐ設計：グラフにないことは「記録なし」と答え、AIからの書き込みはできない");
    const cw = (W - 2 * MX - 0.8) / 3;
    const cards = [
      ["link", "根拠の固定", ["回答形式を固定し、末尾に作業報告ID・手順ID・段落ID・パスを必ず列挙する", "根拠のない回答はデモの評価で不合格扱いにする", "部品番号・在庫・納期・人名はグラフの値以外から作らない"]],
      ["eye", "「記録なし」の明示", ["P-302 でベアリング起因の故障はあった？ → 記録なし（実際に0件）", "P-401 の状態は？ → 該当設備の記録なし（存在しないID）", "推測で作業報告番号を作らないことを、デモの中で見せる"]],
      ["shield", "読み取り専用の接続", ["AIに公開するのはスキーマ取得・読み取りクエリ・手順書検索の3ツールのみ", "書き込み文は接続層が実行前に拒否する（検証済み）", "将来の自動登録は人の承認を挟む設計にする"]],
    ];
    cards.forEach(([icon, head, body], i) => card(s, MX + i * (cw + 0.4), 1.8, cw, 3.7, { icon, head, body, bodySize: 12.5 }));
    txt(s, "説明可能性はデモの価値そのもの。「正しいことを言う」より「言ったことを人が検証できる」設計を優先している。", { x: MX, y: 5.8, w: W - 2 * MX, h: 0.4, fontSize: 11.5, bold: true, color: C.text2 });
  }
  {
    const s = content("回答が辿ったパスはグラフ可視化ツール上で同じ形に表示でき、人が検証できる");
    const img = path.resolve(__dirname, "..", ".playwright-mcp", "neo4j_browser_p301.png");
    if (fs.existsSync(img)) {
      s.addImage({ path: img, x: MX, y: 1.8, w: 7.9, h: 4.5, rounding: false });
      txt(s, "Neo4j Browser：P-301 周辺（設備1、型式1、部位7、故障モード7、作業報告16、関係32）", { x: MX, y: 6.35, w: 7.9, h: 0.4, fontSize: 10, color: C.text2 });
    }
    const rx = 8.85, rw = W - MX - rx;
    const pts = [
      ["回答と根拠を並べて見せる", "左にAIの回答、右にグラフの可視化。回答に出た作業報告IDを可視化クエリに入れると、同じパスが光る。"],
      ["「自分の現場の構造だ」と分かる", "型式→部位→故障モードの放射状の形は、どの工場でも設備台帳とBOMから同じ形になる。"],
      ["グラフは説明用、AIは実務用", "可視化は検証と説明のためで、日常の利用はチャットだけで完結する。"],
    ];
    pts.forEach(([h, b], i) => {
      const y = 1.85 + i * 1.5;
      txt(s, h, { x: rx, y, w: rw, h: 0.4, fontSize: 12.5, bold: true, color: C.accent1 });
      txt(s, b, { x: rx, y: y + 0.4, w: rw, h: 1.05, fontSize: 11.5 });
    });
  }
  {
    const s = content("実測：代表質問4本すべてに正しい根拠付きで回答し、応答時間はAIモデルの選択で20〜55秒");
    stat(s, MX, 1.8, 2.9, "4 / 4", "代表質問の正答数（期待する故障モード・設備・根拠IDと一致）");
    stat(s, MX + 3.1, 1.8, 2.9, "0.17 秒", "グラフ問い合わせの最長実行時間（約300ノードで索引あり）");
    stat(s, MX + 6.2, 1.8, 2.9, "0.4 秒", "手順書の意味検索（ローカルモデル、起動時に先読み）");
    stat(s, MX + 9.3, 1.8, 2.9, "6 / 6", "本日の実行回数と正答数（正式リハーサルは5回を予定）");
    tbl(s, [
      ["条件", "質問1（診断）", "質問4（集計）", "回答の特徴"],
      ["初版プロンプト・高精度モデル", "63秒", "62秒", "正答。根拠は網羅的だが冗長で、聞かれていない提案まで書く"],
      ["簡潔化プロンプト・高精度モデル", "55秒", "25秒", "正答。400〜700字に収まり、形式の遵守が良い"],
      ["簡潔化プロンプト・高速モデル", "21秒", "—", "正答。形式がやや緩く、技術者の照会を省略した"],
    ], { x: MX, y: 3.75, w: W - 2 * MX, colW: [3.2, 1.6, 1.6, 5.83], fontSize: 11, rowH: 0.42 });
    txt(s, "応答時間の内訳は「手順書検索 → グラフ問い合わせ2〜3回 → 回答生成」というAIの往復回数で決まり、データベース側はほぼ時間を使っていない。目標は当初10秒としていたが、構造上30秒前後が現実的で、精度と速度のどちらを優先するかはデモの性質で選ぶ。", { x: MX, y: 5.7, w: W - 2 * MX, h: 0.9, fontSize: 11.5, color: C.text2 });
  }

  // ========== 4. 御社で構築するには
  section(4, "御社で構築するには", "既存データをそのまま元にして、4週間で動くものを作る");
  {
    const s = content("御社の既存データがそのままグラフの元になり、新たなデータ整備は最小限で済む");
    tbl(s, [
      ["御社での所在（想定）", "グラフ上の種類", "最低限必要な項目", "整備のポイント"],
      ["設備台帳（設備管理システム・Excel）", "ライン・設備・型式", "設備ID、設備名、型式、ライン、設置年", "型式の表記を統一する"],
      ["部品構成表・購買／資材システム", "部位・購入部品・サプライヤー", "型式、部位名、部品番号、在庫、納期、仕入先", "部位と購入部品を分けて持つ"],
      ["故障辞書・FMEA、または作業報告の原因欄", "故障モード・症状", "故障モード名、対象部位、分類、重大度、典型症状", "表記ゆれをLLMで正規化し辞書化する"],
      ["作業標準書", "対処手順", "手順名、所要時間、必要部品、必要資格", "手順と故障モードを対応づける"],
      ["技能台帳・人事", "技術者", "氏名、所属、保有資格", "資格名を手順側と揃える"],
      ["保全管理システム（CMMS）・日報・紙", "作業報告", "日付、設備、症状、原因、対処、担当、停止時間", "紙はOCR＋LLMで項目抽出する"],
      ["マニュアル PDF・Word", "手順書の段落", "本文（章・節）、ページ", "段落に分け、部位・故障モードへ紐づける"],
    ], { x: MX, y: 1.8, w: W - 2 * MX, colW: [3.4, 2.3, 3.6, 2.93], fontSize: 10.5, rowH: 0.47 });
    txt(s, "設備台帳と作業報告の2つがあれば初版は作れる。マニュアルと技能台帳は後から足しても構造は変わらない。", { x: MX, y: 6.0, w: W - 2 * MX, h: 0.5, fontSize: 12, bold: true, color: C.text2 });
  }
  {
    const s = content("構築は4週間。週ごとに動くものを積み上げ、現場担当者の評価で締める");
    const weeks = [
      ["第1週", "データ棚卸しとモデル調整", ["台帳・BOM・作業報告・マニュアルの所在と形式を確認", "グラフモデルを御社向けに調整（分類の軸を決める）", "設備・部品・技術者を投入"], "御社向けモデル定義、設備グラフ"],
      ["第2週", "作業報告の変換と投入", ["原因欄の表記ゆれを正規化し故障モード辞書を作成", "作業報告を設備・症状・故障モード・手順・担当者に結ぶ", "紙・Excelは項目抽出スクリプトで変換"], "故障モード辞書、作業報告グラフ"],
      ["第3週", "マニュアルと代表質問", ["マニュアルを段落化し埋め込み、部位・故障モードへ紐づけ", "現場と一緒に代表質問5〜10本と正解パスを定義", "読み取り専用の接続を設定"], "手順書検索、質問テンプレート"],
      ["第4週", "評価と可視化", ["AIを接続し回答形式と根拠の出し方を調整", "現場担当者が代表質問で評価（5回中4回以上一致）", "根拠パスの可視化クエリを用意"], "評価結果、デモ環境、次フェーズ提案"],
    ];
    const cw = (W - 2 * MX - 3 * 0.3) / 4;
    weeks.forEach(([wk, head, body, out], i) => {
      const x = MX + i * (cw + 0.3);
      rrect(s, x, 1.8, cw, 0.55, C.accent1);
      txt(s, wk, { x, y: 1.8, w: cw, h: 0.55, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle" });
      rrect(s, x, 2.35, cw, 3.9, C.accent3);
      txt(s, head, { x: x + 0.2, y: 2.5, w: cw - 0.4, h: 0.5, fontSize: 13, bold: true });
      txt(s, body.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < body.length - 1, paraSpaceAfter: 5 } })), { x: x + 0.2, y: 3.05, w: cw - 0.4, h: 2.2, fontSize: 11 });
      txt(s, [{ text: "成果物：", options: { bold: true } }, { text: out }], { x: x + 0.2, y: 5.4, w: cw - 0.4, h: 0.75, fontSize: 10.5, color: C.text2 });
    });
    txt(s, "体制の目安：御社側は保全担当1名（週2〜3時間の質問・評価）とデータ提供窓口1名。AIdeaLab側はデータ設計1名、AI調整1名。", { x: MX, y: 6.45, w: W - 2 * MX, h: 0.45, fontSize: 11.5, color: C.text2 });
  }
  {
    const s = content("構成はオンプレでも成立し、AIは読み取り専用でグラフに触れる。コストはAI利用料が中心");
    const cw = (W - 2 * MX - 0.8) / 3;
    const cards = [
      ["server", "データとグラフDB", ["グラフDBは社内サーバーのコンテナでも、クラウドでも動く", "デモ規模（約300ノード）は無償版で十分。数十万ノードまで同じ構成", "元データは社内に留まり、AIには問い合わせ結果だけが渡る"]],
      ["cpu", "検索と埋め込み", ["手順書の意味検索はローカルの埋め込みモデル。外部APIキー不要", "会場やオンプレのネットワークでも動作（オフライン起動を確認済み）", "全文検索を併用し、型番など固有名も引ける"]],
      ["shield", "AIと権限", ["AIはClaude（API）。オンプレLLMへの置き換えも構成上は可能", "接続層を読み取り専用にし、書き込み文は実行前に拒否", "費用はAI利用料が中心で、質問1本あたり数十円〜百円程度（モデルによる）"]],
    ];
    cards.forEach(([icon, head, body], i) => card(s, MX + i * (cw + 0.4), 1.8, cw, 3.8, { icon, head, body, bodySize: 12.5 }));
    txt(s, "本番導入時に追加で検討する項目：SSO・監査ログ、個人名の扱い（技術者の表示範囲）、マニュアルの著作権と社外秘の範囲。", { x: MX, y: 5.9, w: W - 2 * MX, h: 0.45, fontSize: 11.5, color: C.text2 });
  }
  {
    const s = content("次フェーズでは、センサー時系列の接続、作業報告の自動下書き、根拠パスのクリック表示へ拡張する");
    const cw = (W - 2 * MX - 0.8) / 3;
    const cards = [
      ["activity", "センサー時系列の接続", "設備ノードに振動・温度のトレンドをつなぎ、「振動が上がり始めた設備」を起点に故障モードと手順を先回りで提案する。予知保全への入口。", "変更箇所：設備にセンサー・計測値のノードを追加"],
      ["edit", "作業報告の自動下書き", "対応後の会話から作業報告の下書き（設備・症状・故障モード・手順・担当・停止時間）を生成し、人が承認して登録する。入力負荷を下げ、グラフが育ち続ける。", "変更箇所：承認付きの書き込みツールを追加"],
      ["grid", "根拠パスのクリック表示", "回答中の作業報告IDや手順IDをクリックすると、その根拠パスを画面上に描く。専用の可視化画面を持つチャットUIとして提供する。", "変更箇所：Web画面（チャット＋グラフ描画）"],
    ];
    cards.forEach(([icon, head, body, foot], i) => {
      const x = MX + i * (cw + 0.4);
      rrect(s, x, 1.8, cw, 4.4, C.accent3);
      iconCircle(s, icon, x + 0.3, 2.05, 0.7, C.background1);
      txt(s, head, { x: x + 0.3, y: 2.9, w: cw - 0.6, h: 0.5, fontSize: 14.5, bold: true, color: C.accent1 });
      txt(s, body, { x: x + 0.3, y: 3.45, w: cw - 0.6, h: 2.0, fontSize: 12 });
      txt(s, foot, { x: x + 0.3, y: 5.5, w: cw - 0.6, h: 0.6, fontSize: 10.5, color: C.text2, italic: true });
    });
    txt(s, "いずれも今回のグラフモデルを変えずに足せる拡張。順番は御社の課題感（予知／入力負荷／説明責任）で決める。", { x: MX, y: 6.4, w: W - 2 * MX, h: 0.45, fontSize: 11.5, bold: true, color: C.text2 });
  }

  // ========== 5. ディスカッション
  section(5, "ディスカッション", "本日ご相談したい論点と、進め方の提案");
  {
    const s = content("本日ご相談したい4つの論点：対象、データ、評価、体制");
    const items = [
      ["target", "対象：どのライン・設備から始めるか", "故障が繰り返す設備、同型機が複数ラインにある設備、ベテラン依存が強い工程など、効果が見えやすい範囲を1つ選びたい。"],
      ["db", "データ：台帳・作業報告・マニュアルの所在と形式", "設備管理システムの有無、作業報告が CMMS か Excel か紙か、マニュアルが PDF で揃っているか。初版は台帳と作業報告の2つで作れる。"],
      ["check", "評価：代表質問と正解をどう定義するか", "現場が実際に困っている問いを5〜10本挙げ、「正しい答え」と「根拠として示すべき記録」を事前に決める。これが合否の基準になる。"],
      ["users", "体制：現場・保全・DX の役割分担", "保全担当者が質問と評価を担い、DX部門がデータ提供と環境を担う分担が進めやすい。週2〜3時間の関与で足りる。"],
    ];
    items.forEach(([icon, head, body], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const cw = (W - 2 * MX - 0.4) / 2, x = MX + col * (cw + 0.4), y = 1.8 + row * 2.45;
      rrect(s, x, y, cw, 2.2, C.accent3);
      iconCircle(s, icon, x + 0.25, y + 0.25, 0.65, C.background1);
      txt(s, head, { x: x + 1.05, y: y + 0.25, w: cw - 1.3, h: 0.65, fontSize: 13.5, bold: true, color: C.accent1, valign: "middle" });
      txt(s, body, { x: x + 0.25, y: y + 1.0, w: cw - 0.5, h: 1.1, fontSize: 11.5 });
    });
  }
  {
    const s = content("進め方の提案：4週間のPoCで御社データの代表質問に答え、その結果で展開範囲を決める");
    const phases = [
      ["PoC（4週間）", "御社データで1ライン分のグラフを構築し、代表質問5〜10本に根拠付きで答える", ["対象ライン・設備の選定", "データ受領と変換", "現場担当者による評価"], "評価結果と費用対効果の見積り"],
      ["判断（1〜2週間）", "評価結果をもとに、展開する範囲と優先する拡張（予知／自動下書き／UI）を決める", ["正答率と応答時間の確認", "現場の受け止めのヒアリング", "展開計画の合意"], "展開計画と体制案"],
      ["展開（3か月〜）", "ライン横展開と業務への組み込み。チャットUIと根拠パス表示を整え、運用に乗せる", ["全ライン・全型式への拡張", "作業報告の自動下書き", "運用体制と教育"], "本番環境と運用手順"],
    ];
    const cw = (W - 2 * MX - 2 * 0.5) / 3;
    phases.forEach(([h, lead, body, out], i) => {
      const x = MX + i * (cw + 0.5);
      rrect(s, x, 1.8, cw, 0.6, i === 0 ? C.accent1 : C.background2);
      txt(s, h, { x, y: 1.8, w: cw, h: 0.6, fontSize: 14, bold: true, color: i === 0 ? C.background1 : C.text1, align: "center", valign: "middle" });
      if (i < 2) hArrow(s, x + cw + 0.08, 2.1, 0.34, BLUE);
      rrect(s, x, 2.4, cw, 3.6, C.accent3);
      txt(s, lead, { x: x + 0.2, y: 2.55, w: cw - 0.4, h: 1.1, fontSize: 12 });
      txt(s, body.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < body.length - 1, paraSpaceAfter: 5 } })), { x: x + 0.2, y: 3.7, w: cw - 0.4, h: 1.4, fontSize: 11.5 });
      txt(s, [{ text: "成果物：", options: { bold: true } }, { text: out }], { x: x + 0.2, y: 5.2, w: cw - 0.4, h: 0.7, fontSize: 11, color: C.text2 });
    });
    rrect(s, MX, 6.2, W - 2 * MX, 0.65, C.background2);
    txt(s, [{ text: "次のアクション　", options: { bold: true, color: C.accent1 } }, { text: "対象ラインの候補と、設備台帳・作業報告のサンプル（数十件で可）を共有いただければ、2週間以内にPoC計画書を提示します。" }], { x: MX + 0.3, y: 6.2, w: W - 2 * MX - 0.6, h: 0.65, fontSize: 12, valign: "middle" });
  }

  // ========== 付録：バックエンド比較
  currentSection = "付録";
  pres.addSection({ title: currentSection });
  {
    const s = content("多段の関係と根拠パスの可視化は Neo4j が得意、既存レイクハウスとセンサー時系列の活用は Databricks が得意。併用も現実的", { tracker: "付録　バックエンドの選択肢" });
    tbl(s, [
      ["観点", "Neo4j をバックエンドにする場合", "Databricks をバックエンドにする場合"],
      ["データの持ち方", "ノードと関係をそのまま格納するグラフDB。設備→部位→故障モード→作業報告の「つながり」が第一級のデータ", "Delta Lake の表（ノード表・エッジ表）として格納。既存の台帳・作業報告・センサーと同じ場所に置ける"],
      ["多段の関係の問い合わせ", "Cypher で 3〜5 ホップを 1 文で書け、約300ノードで 0.2 秒以下。横断（型式経由）や経路の取得が自然", "SQL の結合や再帰 CTE、GraphFrames で表現。ホップが増えると結合が深くなり、経路を返す問いは書きにくい"],
      ["集計・時系列", "件数・停止時間の集計は可能。センサー時系列の大量データは不向きで、別基盤から要約を持ち込む", "Spark と SQL ウェアハウスで大規模集計・時系列が本領。センサー劣化データとの結合が容易"],
      ["手順書の意味検索", "ベクトル索引を内蔵。段落ノードを部位・故障モードにリンクし、検索結果から直接グラフを辿れる", "Databricks Vector Search を利用。検索結果の段落 ID をキーに表を結合して部位・故障モードへ辿る"],
      ["根拠パスの可視化", "Neo4j Browser が同梱。回答のパスをそのまま図で見せられる（本デモの見せ場）", "グラフ描画は標準にない。ノートブックや外部ツールで描くか、表形式で根拠を示す"],
      ["AI エージェントとの接続", "mcp-neo4j-cypher（既製の MCP、読み取り専用モードあり）と自作の手順書検索ツール", "マネージド MCP（Unity Catalog 関数・Genie・Vector Search）や Mosaic AI Agent Framework。Claude からも接続可能"],
      ["権限・ガバナンス", "Community 版はロール分離なし（MCP 側で読み取り専用化）。Enterprise で RBAC", "Unity Catalog で表・列単位の権限、監査ログ、系譜（リネージ）が標準。本番の統制は作りやすい"],
      ["運用・コスト", "Docker 1 コンテナまたは Aura。デモ規模は無償。運用対象が 1 つ増える", "既にレイクハウスがあれば追加基盤なし。計算は DBU 課金で、小規模デモにはやや重い"],
      ["向いている状況", "初回デモ、多段の「なぜ」と根拠パスを現場に見せたい、オンプレ・小規模から始めたい", "Databricks が全社基盤として既にある、センサー時系列や予知保全まで扱いたい、統制要件が先に立つ"],
    ], { x: MX, y: 1.75, w: W - 2 * MX, colW: [1.9, 5.16, 5.17], fontSize: 9.5, rowH: [0.32, 0.42, 0.42, 0.42, 0.42, 0.4, 0.42, 0.4, 0.4, 0.42] });
    rrect(s, MX, 6.42, W - 2 * MX, 0.52, C.background2);
    txt(s, [{ text: "併用案　", options: { bold: true, color: C.accent1 } }, { text: "Databricks を蓄積・集計の基盤（台帳・作業報告・センサーを Delta に集約し正規化）、Neo4j を現場向けの提供層（グラフ問い合わせと根拠パスの可視化）とし日次で同期する。本デモの投入スクリプトは Delta からの読み出しに置き換えるだけで流用できる。" }], { x: MX + 0.3, y: 6.42, w: W - 2 * MX - 0.6, h: 0.52, fontSize: 10, valign: "middle" });
  }

  // ========== 付録：二層アーキテクチャ（Databricks = System of Record、Neo4j = Serving）
  {
    const s = content("Databricks を正本（System of Record）と加工の層、Neo4j を探索専用の提供層に分け、集計は SQL、探索は Cypher に振り分ける", { tracker: "付録　二層アーキテクチャ案" });
    const LX = MX, LW = 7.75;            // 左：データ層
    const RX = 8.65, RW = W - MX - RX;   // 右：MCP とエージェント
    // --- ソース
    const srcs = ["設備台帳", "作業報告（CMMS）", "購買・技能台帳", "マニュアル PDF", "センサー（将来）"];
    const sw = (LW - 0.12 * 4) / 5;
    srcs.forEach((n, i) => {
      rrect(s, LX + i * (sw + 0.12), 1.72, sw, 0.5, C.accent3);
      txt(s, n, { x: LX + i * (sw + 0.12), y: 1.72, w: sw, h: 0.5, fontSize: 10, bold: true, align: "center", valign: "middle" });
    });
    arrow(s, LX + LW / 2, 2.24, LX + LW / 2, 2.48, BLUE, 1.5);
    txt(s, "取り込み（Auto Loader / バッチ）", { x: LX + LW / 2 + 0.1, y: 2.22, w: 3.2, h: 0.26, fontSize: 9, color: C.text2 });
    // --- Databricks 層
    rrect(s, LX, 2.5, LW, 1.85, C.background2);
    txt(s, [{ text: "Databricks　", options: { bold: true, fontSize: 13 } }, { text: "System of Record / Data Engineering 層 ― 原データと加工済みデータの正本", options: { bold: true, fontSize: 11 } }],
      { x: LX + 0.2, y: 2.56, w: LW - 0.4, h: 0.35, fontSize: 12 });
    const med = [
      ["Bronze", "原データをそのまま保持\n台帳・作業報告・PDF・センサー"],
      ["Silver", "正規化・辞書化\n表記ゆれ、故障モード辞書、ID 採番"],
      ["Gold", "ノード表・エッジ表・集計マート\n手順書段落と埋め込み（Vector Search）"],
    ];
    const mw = (LW - 0.4 - 0.5 * 2) / 3;
    med.forEach(([h, b], i) => {
      const x = LX + 0.2 + i * (mw + 0.5);
      rrect(s, x, 2.98, mw, 0.95, C.background1);
      txt(s, [{ text: h, options: { bold: true, color: C.accent1, breakLine: true } }, { text: b, options: { fontSize: 9 } }], { x: x + 0.1, y: 3.0, w: mw - 0.2, h: 0.9, fontSize: 11, valign: "middle" });
      if (i < 2) hArrow(s, x + mw + 0.08, 3.45, 0.34, BLUE);
    });
    txt(s, "Unity Catalog：権限・監査・リネージ　｜　SQL / Genie：集計・時系列　｜　Vector Search：症状テキストから手順書段落を探す入口", { x: LX + 0.2, y: 4.0, w: LW - 0.4, h: 0.3, fontSize: 9, color: C.text2 });
    // --- 同期
    arrow(s, LX + LW / 2, 4.37, LX + LW / 2, 4.73, BLUE, 1.5);
    txt(s, "Gold → Neo4j へ片方向の同期（日次、必要なら差分）。逆方向の書き込みはない", { x: LX + LW / 2 + 0.1, y: 4.4, w: 3.9, h: 0.3, fontSize: 9, color: C.text2 });
    // --- Neo4j 層
    rrect(s, LX, 4.75, LW, 1.15, C.accent1);
    txt(s, [{ text: "Neo4j　", options: { bold: true, fontSize: 13 } }, { text: "Knowledge Graph Serving 層 ― 読み取り専用の派生ビュー。マスターにはしない", options: { bold: true, fontSize: 11 } }],
      { x: LX + 0.2, y: 4.8, w: LW - 0.4, h: 0.35, fontSize: 12, color: C.background1 });
    const nv = [["グラフ問い合わせ", "多段の関係・経路・類似事例の横断"], ["根拠パスの可視化", "Neo4j Browser で回答のパスを表示"], ["再構築可能", "Gold からいつでも作り直せる使い捨ての層"]];
    nv.forEach(([h, b], i) => {
      const x = LX + 0.2 + i * (mw + 0.5);
      txt(s, [{ text: h, options: { bold: true, breakLine: true } }, { text: b, options: { fontSize: 9 } }], { x, y: 5.2, w: mw, h: 0.6, fontSize: 10.5, color: C.background1 });
    });
    // --- 右：MCP とエージェント
    rrect(s, RX, 2.5, RW, 1.25, C.accent3);
    txt(s, [{ text: "Databricks MCP（マネージド）", options: { bold: true, color: C.accent1, breakLine: true } },
      { text: "Genie / SQL：何件・どれくらい・推移の集計と時系列", options: { bullet: true, breakLine: true } },
      { text: "Vector Search：症状の自然文から段落 ID と故障モード ID を得る入口", options: { bullet: true } }],
      { x: RX + 0.2, y: 2.58, w: RW - 0.4, h: 1.1, fontSize: 9.5 });
    rrect(s, RX, 3.95, RW, 0.75, C.background2);
    txt(s, [{ text: "AIエージェント（Claude）", options: { bold: true, breakLine: true } }, { text: "質問の型で MCP を振り分け、両層に共通の ID（WO- / PR- / CH-）で根拠を返す", options: { fontSize: 9 } }],
      { x: RX + 0.2, y: 3.98, w: RW - 0.4, h: 0.7, fontSize: 11, valign: "middle" });
    rrect(s, RX, 4.9, RW, 1.0, C.accent3);
    txt(s, [{ text: "Neo4j MCP（mcp-neo4j-cypher 読み取り専用）", options: { bold: true, color: C.accent1, breakLine: true } },
      { text: "Cypher：なぜ・どうつながる・他にどこで、の探索と多段の経路", options: { bullet: true, breakLine: true } },
      { text: "書き込みツールは公開しない（本デモで検証済み）", options: { bullet: true } }],
      { x: RX + 0.2, y: 4.96, w: RW - 0.4, h: 0.9, fontSize: 9.5 });
    // 層 → MCP、MCP → エージェント の矢印
    hArrow(s, LX + LW + 0.05, 3.1, RX - LX - LW - 0.1, DGRAY);
    hArrow(s, LX + LW + 0.05, 5.35, RX - LX - LW - 0.1, DGRAY);
    arrow(s, RX + RW / 2, 3.77, RX + RW / 2, 3.93, BLUE, 1.5);
    arrow(s, RX + RW / 2, 4.88, RX + RW / 2, 4.72, BLUE, 1.5);
    // --- 設計原則
    const pr = [
      ["① 正本は Databricks だけ", "Bronze→Silver→Gold で原データと加工済みデータを保持し、権限・監査・リネージもここで担う"],
      ["② Neo4j はマスターにしない", "Gold から片方向で同期する読み取り専用の派生ビュー。AI も人も直接書かず、捨てて再構築できる"],
      ["③ ID は Gold で採番し両層で共通", "根拠 ID はどちらの層でも同じ行・同じノードを指す。Vector Search の結果から Cypher の探索へそのまま渡せる"],
      ["④ 集計は SQL、探索は Cypher", "「何件・どれくらい・推移」は Databricks、「なぜ・つながり・他にどこで」は Neo4j。センサー時系列は Databricks に留め、要約だけを属性として同期"],
    ];
    const pw = (W - 2 * MX - 0.2 * 3) / 4;
    pr.forEach(([h, b], i) => {
      const x = MX + i * (pw + 0.2);
      rrect(s, x, 6.08, pw, 0.85, C.accent3);
      txt(s, [{ text: h, options: { bold: true, color: C.accent1, breakLine: true } }, { text: b, options: { fontSize: 8.5 } }], { x: x + 0.12, y: 6.1, w: pw - 0.24, h: 0.8, fontSize: 10, valign: "top" });
    });
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written:", OUT);
}

build().catch((e) => { console.error(e); process.exit(1); });
