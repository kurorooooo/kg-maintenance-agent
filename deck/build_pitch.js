// AI Builder Cup 2026 pitch deck (English). Usage: cd deck && NODE_PATH=$PWD/node_modules node build_pitch.js → docs/pitch_deck.pptx
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

const OUT = path.resolve(__dirname, "..", "docs", "pitch_deck.pptx");

// ---------------------------------------------------------------- theme (6色)
const BLUE = "2F54F7", LBLUE = "DCE4FE", DGRAY = "3C4049", LGRAY = "EEF0F3", BLACK = "000000", WHITE = "FFFFFF";
const THEME = {
  name: "Plant A Maintenance Agent",
  headFontFace: "Helvetica Neue",
  bodyFontFace: "Helvetica Neue",
  colors: {
    dk1: BLACK, lt1: WHITE, dk2: DGRAY, lt2: LBLUE,
    accent1: BLUE, accent2: LBLUE, accent3: LGRAY, accent4: DGRAY, accent5: BLUE, accent6: LGRAY,
    hlink: BLUE, folHlink: DGRAY,
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = "Kakeru Kurosawa, Junichi Fujioka, Kotaro Fukuo";
pres.title = "Plant A Maintenance Agent — AI Builder Cup 2026";
const C = pres.SchemeColor;

const W = 13.33, H = 7.5, MX = 0.55; // 余白
const FOOTER = "Plant A Maintenance Agent  |  AI Builder Cup 2026  |  Manufacturing";

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
function section(num, title) {
  // pitch deck: sections group slides in the outline but add no divider slide
  currentSection = `${num}. ${title}`;
  pres.addSection({ title: currentSection });
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


// ================================================================ slides (English pitch deck, 12 slides)
const SHOT = path.resolve(__dirname, "shots", "app_q1.png");
const TEAM = [
  ["Kakeru Kurosawa", "Product & engineering lead", "Built the agent, the graph pipeline and the web app. COO at AIdeaLab; previously PwC consulting and new-business development for edge AI at Sony."],
  ["Junichi Fujioka", "Manufacturing & impact", "Manufacturing CFO. About 30 years in a global electronics group across plants, finance and operations. Validates the problem and quantifies the value."],
  ["Kotaro Fukuo", "Software engineering", "Software engineer with 8+ years in mobile and backend (React Native, TypeScript, Ruby on Rails, AWS). B.E. Mechanical Engineering Informatics, Meiji University."],
];

async function build() {
  await loadIcons();

  // ---------- 1. Title
  pres.addSection({ title: "Title" });
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Title" });
    s.addText("Plant A\nMaintenance\nAgent", { placeholder: "title" });
    s.addText(
      [
        { text: "An ontology-backed AI agent for field engineers in Japanese manufacturing", options: { fontSize: 18, bold: true, color: BLACK, breakLine: true } },
        { text: "", options: { breakLine: true } },
        { text: "Every answer comes with evidence you can trace on a graph.", options: { breakLine: true } },
        { text: "Gemini 3.8 Flash · Agent Development Kit · Vertex AI · Cloud Run · Neo4j AuraDB", options: { breakLine: true } },
        { text: "", options: { breakLine: true } },
        { text: "AI Builder Cup 2026 · Manufacturing · October 2026", options: { color: BLUE, bold: true, breakLine: true } },
        { text: "Kakeru Kurosawa · Junichi Fujioka · Kotaro Fukuo", options: { color: DGRAY } },
      ],
      { placeholder: "body" }
    );
    txt(s, "All data in this deck is synthetic (“Plant A”). No real company, product or person is referenced.", { x: 6.2, y: 6.5, w: 6.4, h: 0.5, fontSize: 9, color: C.text2 });
  }

  // ---------- 2. Executive summary
  currentSection = "Executive summary";
  pres.addSection({ title: currentSection });
  {
    const s = content("Maintenance know-how that lives in four systems and in retiring veterans can become an AI agent that answers with traceable evidence, on the data a plant already has", { tracker: "Executive summary" });
    const items = [
      ["alert", "Problem", "When a machine fails at night, the facts needed to decide are scattered across the equipment register, work orders, the parts inventory and manuals, and the veteran who connects them is off duty or retiring. Document search cannot connect them."],
      ["graph", "Solution", "We model the plant as an ontology (equipment, components, failure modes, symptoms, work orders, procedures, parts, people) in a knowledge graph. A Gemini agent built with ADK walks it through read-only tools and cites work-order IDs and manual pages."],
      ["check", "Proof", "Deployed on Cloud Run with Neo4j AuraDB. In rehearsal, 45 of 45 reference answers were correct across diagnosis, cross-line comparison, parts and people, aggregation and “no record” questions. ADK hallucination score 1.0; median answer about 20 seconds."],
      ["trend", "Impact", "Shorter diagnosis on every unplanned stop, cross-line patterns that registers alone hide, and know-how that survives retirements. The same pipeline runs on a plant's own registers, work orders and manuals, in Japanese or English, in four weeks."],
    ];
    items.forEach(([icon, head, body], i) => {
      const y = 1.75 + i * 1.3;
      iconCircle(s, icon, MX, y, 0.65);
      txt(s, head, { x: MX + 0.9, y, w: 2.0, h: 0.65, fontSize: 15, bold: true, color: C.accent1, valign: "middle" });
      txt(s, body, { x: MX + 2.9, y: y - 0.02, w: W - MX * 2 - 2.9, h: 1.15, fontSize: 12 });
    });
  }

  // ========== 1. Problem
  section(1, "The problem", "Where maintenance know-how lives, and why today's AI cannot reach it");
  {
    const s = content("Field engineers lose hours on every unplanned stop because the facts needed to decide live in four places, and in one veteran's head");
    const cards = [
      ["db", "Equipment register & BOM", ["Models, install years and component structure in a CMMS or Excel", "Finding “the same model on another line” means searching across registers"]],
      ["file", "Work orders", ["“What happened, when, what we did” in a CMMS, daily reports or paper", "Similar past cases are found from memory, if at all"]],
      ["book", "Manuals", ["Vendor PDFs with judgement thresholds and procedures", "Someone has to remember which page"]],
      ["user", "Veteran experience", ["Which cause to suspect from a symptom; what to check on a repeat failure", "Not on the night shift; lost at retirement"]],
    ];
    cards.forEach(([icon, head, body], i) => card(s, MX + i * 3.1, 1.8, 2.95, 2.75, { icon, head, body, bodySize: 11.5 }));
    rrect(s, MX, 4.95, W - 2 * MX, 1.45, C.background2);
    txt(s, [
      { text: "Plant A (our synthetic demo plant)   ", options: { bold: true, color: C.accent1 } },
      { text: "Three press procedures (slide-guide, clutch-brake and flywheel-bearing replacement) can only be performed by one technician who holds the press-operation certificate and retires at the end of FY2026. The register, the work orders and the skills ledger each know one piece of this; nobody sees it until the three are connected." },
    ], { x: MX + 0.3, y: 5.1, w: W - 2 * MX - 0.6, h: 1.2, fontSize: 12 });
  }
  {
    const s = content("Document search (RAG alone) cannot answer the questions that matter most on the floor: cross-line similarity, counts, and “who can do this”");
    const colW = (W - 2 * MX - 0.4) / 2;
    const cols = [
      ["Document search only", C.accent3, C.text1, [
        "Retrieves text chunks that look similar. The P-301 manual and P-301 reports are found",
        "Reports from the same model on another line never say “P-301”, so they are missed",
        "Cannot count: “which machines had the most bearing-related stops this year?”",
        "Evidence is a text fragment; a person must work out which machine and which report",
        "May infer a part number or lead time from context and state it as fact",
      ]],
      ["Knowledge graph + agent (ours)", C.background2, C.accent1, [
        "Stores equipment, components, failure modes and work orders as things and relationships",
        "Crosses lines through the model node: P-301 → CP-200 ← P-101",
        "Aggregates by failure-mode category and date in one query",
        "Evidence is work-order IDs, procedure IDs and manual pages, drawn as a sub-graph",
        "Answers “no record” when the graph has nothing; never invents an ID",
      ]],
    ];
    cols.forEach(([head, fill, hc, body], i) => {
      const x = MX + i * (colW + 0.4);
      rrect(s, x, 1.8, colW, 4.9, fill);
      txt(s, head, { x: x + 0.3, y: 2.0, w: colW - 0.6, h: 0.5, fontSize: 15, bold: true, color: hc });
      txt(s, body.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < body.length - 1, paraSpaceAfter: 8 } })), { x: x + 0.3, y: 2.6, w: colW - 0.6, h: 4.0, fontSize: 12.5 });
    });
    hArrow(s, MX + colW + 0.05, 4.25, 0.3, BLUE);
  }

  // ========== 2. Solution
  section(2, "The solution", "Model the plant as an ontology and let Gemini walk it");
  {
    const s = content("Vector search over the manuals finds where to start; the knowledge graph supplies the ranked answer, the next action and the evidence");
    const srcs = [["db", "Equipment register & BOM"], ["file", "Work orders (CMMS)"], ["book", "Manuals (PDF)"], ["users", "Skills ledger · purchasing"]];
    txt(s, "A plant's existing data", { x: MX, y: 1.75, w: 2.6, h: 0.35, fontSize: 11, bold: true, color: C.text2 });
    srcs.forEach(([icon, label], i) => {
      const y = 2.15 + i * 0.95;
      rrect(s, MX, y, 2.6, 0.75, C.accent3);
      iconCircle(s, icon, MX + 0.12, y + 0.08, 0.58, C.background1);
      txt(s, label, { x: MX + 0.85, y, w: 1.7, h: 0.75, fontSize: 11, bold: true, valign: "middle" });
    });
    hArrow(s, MX + 2.7, 3.9, 0.55, BLUE);
    rrect(s, 3.85, 2.15, 1.9, 3.55, C.background2);
    txt(s, [{ text: "Transform & load", options: { bold: true, breakLine: true } }, { text: "Normalise names, build the failure-mode dictionary, chunk manuals, embed with Gemini", options: { fontSize: 10.5, color: C.text2 } }], { x: 3.95, y: 2.3, w: 1.7, h: 3.2, fontSize: 12.5, align: "center", valign: "middle" });
    hArrow(s, 5.8, 3.9, 0.55, BLUE);
    rrect(s, 6.4, 2.15, 2.4, 3.55, C.accent1);
    s.addImage({ data: ICONS.graph_w, x: 7.3, y: 2.45, w: 0.6, h: 0.6 });
    txt(s, [{ text: "Ontology graph", options: { bold: true, breakLine: true } }, { text: "Neo4j AuraDB", options: { breakLine: true } }, { text: "Equipment · components · failure modes · symptoms · work orders · procedures · parts · people · manual chunks with a vector index", options: { fontSize: 10.5 } }], { x: 6.5, y: 3.1, w: 2.2, h: 2.4, fontSize: 12.5, color: C.background1, align: "center" });
    hArrow(s, 8.85, 3.9, 0.55, BLUE);
    rrect(s, 9.45, 2.15, 3.33, 3.55, C.background2);
    s.addImage({ data: ICONS.cpu, x: 10.8, y: 2.4, w: 0.6, h: 0.6 });
    txt(s, [{ text: "Gemini agent (ADK)", options: { bold: true, breakLine: true } }, { text: "Three read-only tools: semantic manual search, keyword search, Cypher", options: { fontSize: 10.5, breakLine: true } }, { text: "", options: { breakLine: true } }, { text: "Answers in a fixed format: conclusion · ranked causes · action · evidence IDs", options: { fontSize: 10.5 } }], { x: 9.6, y: 3.05, w: 3.0, h: 2.5, fontSize: 12.5, align: "center" });
    rrect(s, MX, 5.95, W - 2 * MX, 0.95, C.accent3);
    txt(s, [
      { text: "Three mechanisms   ", options: { bold: true, color: C.accent1 } },
      { text: "1  Vector search picks the entry point (a manual passage linked to failure modes).   2  The graph walk delivers the answer: causes ranked by history, procedure, parts in stock, certified people.   3  Every ID in the answer is a node the user can inspect on screen." },
    ], { x: MX + 0.3, y: 6.05, w: W - 2 * MX - 0.6, h: 0.8, fontSize: 11.5, valign: "middle" });
  }
  {
    const s = content("Twelve node types and seventeen relationships, with the failure mode as the hub, cover diagnosis, history, the procedure, parts and people in one walk");
    const N = {
      model: [1.0, 2.0, "Model", "CP-200"], comp: [3.6, 2.0, "Component", "main shaft bearing"], wo: [6.2, 2.0, "Work order", "WO-2026-020 · 6 cases"], tech: [8.8, 2.0, "Technician", "cert: rotating machinery"],
      sym: [1.0, 3.4, "Symptom", "vibration ↑"], fm: [3.6, 3.4, "Failure mode", "bearing inner ring wear"],
      eq: [1.0, 4.8, "Equipment", "P-301 · line 3"], ch: [3.6, 4.8, "Manual chunk", "CP-200 manual p.1"], pr: [6.2, 4.8, "Procedure", "PR-001 · 240 min"], part: [8.8, 4.8, "Part", "6306ZZ · stock 4 · 3 days"], sup: [11.0, 4.8, "Supplier", "lead time"],
      line: [1.0, 6.05, "Line", "Line 3 · cooling utility"],
    };
    const E = [["line", "eq", "HAS_EQUIPMENT"], ["eq", "model", "OF_MODEL"], ["model", "comp", "HAS_COMPONENT"], ["comp", "fm", "HAS_FAILURE_MODE"], ["fm", "sym", "HAS_SYMPTOM"],
      ["wo", "fm", "DIAGNOSED"], ["wo", "eq", "ON_EQUIPMENT"], ["pr", "fm", "RESOLVES"], ["wo", "pr", "PERFORMED"], ["wo", "tech", "PERFORMED_BY"], ["pr", "part", "REQUIRES_PART"], ["part", "sup", "SUPPLIED_BY"], ["ch", "fm", "MENTIONS"]];
    const bw = 1.7, bh = 0.62;
    E.forEach(([a, b, label]) => {
      const A = N[a], B = N[b];
      s.addShape(pres.ShapeType.line, { x: Math.min(A[0], B[0]) + bw / 2, y: Math.min(A[1], B[1]) + bh / 2, w: Math.abs(B[0] - A[0]) || 0.01, h: Math.abs(B[1] - A[1]) || 0.01, line: { color: "B9C2CC", width: 1 }, flipV: (B[1] - A[1]) * (B[0] - A[0]) < 0 });
      txt(s, label, { x: (A[0] + B[0]) / 2 + bw / 2 - 0.9, y: (A[1] + B[1]) / 2 + bh / 2 - 0.17, w: 1.8, h: 0.25, fontSize: 7, color: C.text2, align: "center", fontFace: "Menlo" });
    });
    Object.entries(N).forEach(([k, [x, y, t, sub]]) => nodeBox(s, x, y, bw, bh, t, sub, k === "fm" ? C.accent1 : C.background2, BLUE, k === "fm" ? C.background1 : C.text1));
    rrect(s, 3.3, 5.95, W - MX - 3.3, 0.95, C.accent3);
    txt(s, [{ text: "Why an ontology, not tables   ", options: { bold: true, color: C.accent1 } },
      { text: "The same question (“has this happened before?”) is one path, whatever the plant. New data sources attach as new nodes; the agent's tools do not change.   ", options: { fontSize: 10.5 } },
      { text: "Plant A   ", options: { bold: true, color: C.accent1 } }, { text: "295 nodes · 901 relationships · 43 manual chunks (768-dim Gemini embeddings).", options: { fontSize: 10.5 } }], { x: 3.45, y: 6.0, w: W - MX - 3.6, h: 0.85, fontSize: 11, valign: "middle" });
  }

  // ========== 3. Demo
  section(3, "The product", "A question becomes a tool timeline, a ranked answer and an evidence graph");
  {
    const s = content("In the live app every cited ID is a clickable node: the engineer sees what the agent did, reads the answer, and checks the evidence on the graph");
    s.addImage({ path: SHOT, x: MX, y: 1.75, w: 8.6, h: 5.375 });
    const notes = [
      ["1", "What the agent did", "Semantic manual search, then one Cypher query. Each step shows the search text or the Cypher, row counts and seconds."],
      ["2", "Answer in a fixed format", "Conclusion · candidate causes with past-case counts · recommended action with the required certification · evidence IDs."],
      ["3", "Evidence graph", "Shortest paths between the cited nodes. Clicking WO-2026-020 in the answer highlights it on the graph."],
      ["4", "Bilingual over Japanese records", "Ask in English or Japanese; the graph values stay in Japanese with English names, IDs never change."],
    ];
    notes.forEach(([n, h, b], i) => {
      const y = 1.75 + i * 1.35;
      rrect(s, 9.4, y, 0.45, 0.45, C.accent1);
      txt(s, n, { x: 9.4, y, w: 0.45, h: 0.45, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle" });
      txt(s, [{ text: h, options: { bold: true, breakLine: true } }, { text: b, options: { fontSize: 10.5, color: C.text2 } }], { x: 9.95, y: y - 0.05, w: W - MX - 9.95, h: 1.25, fontSize: 12 });
    });
  }

  // ========== 4. Technology
  section(4, "Technical merit", "Gen AI implementation on Google Cloud");
  {
    const s = content("An ADK agent with three read-only tools, Gemini for reasoning and embeddings, two Cloud Run services, and guardrails that reject writes and invented IDs");
    const B = {
      user: [MX, 2.95, 1.6, 0.8, "Browser", "field engineer"],
      web: [2.5, 2.75, 2.5, 1.2, "Cloud Run · kg-web", "Next.js 16: chat, tool timeline, evidence graph"],
      agent: [5.45, 2.55, 2.8, 1.6, "Cloud Run · kg-agent", "Google ADK · Gemini 3.8 Flash · 3 read-only tools · SSE streaming"],
      vai: [9.0, 1.85, 3.2, 0.9, "Vertex AI", "Gemini 3.8 Flash · gemini-embedding-001 (768-dim)"],
      db: [9.0, 3.45, 3.2, 1.1, "Neo4j AuraDB (on Google Cloud)", "ontology graph · vector index · full-text index"],
      sm: [2.5, 4.35, 5.75, 0.55, "Secret Manager · Cloud Scheduler · Cloud Logging · Cloud Build · Artifact Registry", ""],
    };
    [["user", "web"], ["web", "agent"], ["agent", "vai"], ["agent", "db"]].forEach(([a, b]) => {
      const A = B[a], Bb = B[b];
      arrow(s, A[0] + A[2], A[1] + A[3] / 2, Bb[0], Bb[1] + Bb[3] / 2, DGRAY, 1.25);
    });
    Object.entries(B).forEach(([k, [x, y, w, h, t, sub]]) => nodeBox(s, x, y, w, h, t, sub, k === "agent" ? C.accent1 : k === "db" ? DGRAY : C.background2, k === "agent" ? BLUE : k === "db" ? DGRAY : BLUE, k === "agent" || k === "db" ? C.background1 : C.text1));
    const guard = [
      ["Read-only by construction", "Write clauses are rejected before execution; transactions open in READ mode; 20-second query timeout. Covered by unit tests."],
      ["Evidence is mandatory", "Fixed answer format with an Evidence section. IDs become chips and are resolved against the graph, so an unknown ID cannot appear as a node."],
      ["Private agent, public UI", "kg-agent accepts only ID tokens from the web service account and Cloud Scheduler. Neo4j credentials come from Secret Manager."],
      ["Evaluated, not assumed", "ADK eval set with LLM-judged response match and hallucination metrics, plus a rehearsal harness with fact checkers (next slide)."],
    ];
    const gw = (W - 2 * MX - 0.6) / 4;
    guard.forEach(([h, b], i) => {
      const x = MX + i * (gw + 0.2);
      rrect(s, x, 5.15, gw, 1.75, C.accent3);
      txt(s, [{ text: h, options: { bold: true, color: C.accent1, breakLine: true } }, { text: b, options: { fontSize: 10 } }], { x: x + 0.15, y: 5.22, w: gw - 0.3, h: 1.6, fontSize: 11.5 });
    });
  }
  {
    const s = content("Rehearsal and ADK evaluation: 45 of 45 reference answers correct, hallucination score 1.0, median answer about 20 seconds with two to three tool calls");
    stat(s, MX, 1.8, 2.6, "45 / 45", "reference answers correct\n(9 cases × 5 runs, fact-checked)");
    stat(s, MX + 2.9, 1.8, 2.6, "1.0", "ADK hallucinations_v1\n(7 / 7 eval cases pass)");
    stat(s, MX + 5.8, 1.8, 2.6, "≈ 20 s", "median answer time\n2–3 tool calls");
    stat(s, MX + 8.7, 1.8, 3.2, "0", "invented work-order IDs,\nparts or people", DGRAY);
    tbl(s, [
      ["Case", "Question", "Correct", "Median (min–max)", "Tool calls"],
      ["Q1", "P-301 vibrating: causes and past fixes (JA / EN)", "10 / 10", "23 s (18–32)", "2.4"],
      ["Q2", "Same model on other lines (follow-up)", "5 / 5", "32 s (22–42)", "2.0"],
      ["Q3", "Parts in stock, lead times, certified technicians", "5 / 5", "24 s (22–30)", "2.2"],
      ["Q4", "Most bearing-related stops in the last 12 months", "5 / 5", "26 s (20–37)", "2.6"],
      ["B2", "Who can take over when T-01 retires", "5 / 5", "35 s (19–44)", "3.2"],
      ["D2", "Which machine uses bearing NU320 (keyword)", "5 / 5", "20 s (18–44)", "3.0"],
      ["E1 / E2", "Bearing failures on P-302 · unknown machine → “no record”", "10 / 10", "19–23 s", "2.4–3.4"],
    ], { x: MX, y: 3.55, w: W - 2 * MX, colW: [0.9, 5.3, 1.4, 2.6, 2.03], fontSize: 10.5 });
    txt(s, "Rehearsal on the deployed AuraDB graph with gemini-3.8-flash, 2026-10-06 (agent/rehearse.py, log in docs/eval). ADK eval: final_response_match_v2 = 1.00 on all 7 cases, hallucinations_v1 = 1.00 on 6 cases and 0.86 on the three-turn conversation (judge gemini-3.5-flash, 3 samples).", { x: MX, y: 6.35, w: W - 2 * MX, h: 0.55, fontSize: 9.5, color: C.text2 });
  }

  // ========== 5. Impact & innovation
  section(5, "Impact and innovation", "What changes for a plant, and what is new");
  {
    const s = content("For a plant the value is hours of downtime avoided on every incident, patterns that registers hide, and know-how that survives retirements");
    const cols = [
      ["activity", "Faster diagnosis on every stop", ["Plant A: 80 unplanned stops in two years, 9 bearing-related in the last 12 months alone (P-301: 3 stops, 935 minutes).", "The agent returns ranked causes, the procedure, parts and people in about 20 seconds instead of a search across four systems.", "Illustrative: one hour saved per incident × 40 incidents a year × ¥500k per hour of line stop (assumption) ≈ ¥20M a year per plant."]],
      ["eye", "Patterns registers hide", ["Same-model failures across lines (P-101 ×4, P-201 ×1) surface in one answer.", "A part shared by 8 machines with stock for two replacements; procedures that depend on a zero-stock part.", "Bearing-related downtime concentrated on the CP-200 pumps: a maintenance-plan decision, not a repair."]],
      ["users", "Know-how that survives", ["One technician holds the only press certification and retires in FY2026; the graph shows which procedures have no successor.", "Work orders become searchable history; manual pages become cited evidence.", "New engineers and night shifts get the veteran's path, with the IDs to verify it."]],
    ];
    const cw = (W - 2 * MX - 0.6) / 3;
    stat(s, MX, 1.7, 2.9, "80", "unplanned stops in two years at Plant A");
    stat(s, MX + 3.1, 1.7, 2.9, "935 min", "bearing-related downtime on one pump in 12 months");
    stat(s, MX + 6.2, 1.7, 2.9, "1", "technician holding the only press certification, retiring FY2026", DGRAY);
    stat(s, MX + 9.3, 1.7, 3.2, "≈ 20 s", "from question to ranked causes, parts and people");
    cols.forEach(([icon, head, body], i) => card(s, MX + i * (cw + 0.3), 3.35, cw, 2.9, { icon, head, body, bodySize: 10.5 }));
    rrect(s, MX, 6.4, W - 2 * MX, 0.5, C.background2);
    txt(s, "Cost figures are illustrative assumptions for a mid-size plant; the team's manufacturing CFO is validating them against industry benchmarks for the final pitch.", { x: MX + 0.3, y: 6.42, w: W - 2 * MX - 0.6, h: 0.46, fontSize: 10, color: C.text1, valign: "middle" });
  }
  {
    const s = content("What is new: answers grounded in an ontology with graph evidence, bilingual access to Japanese floor documents, and an agent that is read-only and says “no record”");
    const cols = [
      ["graph", "Ontology-grounded GraphRAG", ["Vector search only chooses where to start; the content of the answer comes from graph structure, so every claim maps to a node and a path.", "Cross-line, aggregation and “who can do it” questions that document RAG cannot answer become one Cypher query."]],
      ["map", "Built for Japanese plants", ["Registers, work orders and manuals stay in Japanese; the master data carries Gemini-generated English names.", "An engineer asks in either language and gets the same IDs. JAPAC plants with mixed teams get one assistant."]],
      ["shield", "Honest and safe by design", ["The agent cannot write to the graph and rejects write clauses before execution.", "When there is no record it says so and lists only the IDs it checked. Verified in rehearsal and ADK eval."]],
    ];
    const cw = (W - 2 * MX - 0.6) / 3;
    cols.forEach(([icon, head, body], i) => card(s, MX + i * (cw + 0.3), 1.8, cw, 3.6, { icon, head, body, bodySize: 11.5 }));
    rrect(s, MX, 5.6, W - 2 * MX, 1.3, C.accent3);
    txt(s, [
      { text: "Why Gemini + ADK made this possible in days   ", options: { bold: true, color: C.accent1, breakLine: true } },
      { text: "Gemini 3.8 Flash writes correct Cypher against a schema it is shown once and keeps a fixed answer format across languages; gemini-embedding-001 indexes Japanese manuals without a local model; ADK gives the tool loop, SSE streaming to the UI, Cloud Run deployment and an evaluation harness. The whole build, from synthetic plant to deployed app, took one week." },
    ], { x: MX + 0.3, y: 5.7, w: W - 2 * MX - 0.6, h: 1.1, fontSize: 11 });
  }

  // ========== 6. Roadmap & team
  section(6, "Roadmap and team", "From a plant's own data to a working assistant in four weeks");
  {
    const s = content("Four weeks from a plant's own registers to a working assistant; next: sensor time series, approved write-back, and a mobile UI for the floor");
    const weeks = [["Week 1", "Data inventory, ontology fit, load the equipment register, parts and people"], ["Week 2", "Work orders: normalise names, build the failure-mode dictionary, load history"], ["Week 3", "Manuals: chunk, embed, link to components and failure modes; define reference questions"], ["Week 4", "Agent prompts, evaluation with floor engineers, evidence graph, hand-over"]];
    const ww = (W - 2 * MX - 0.6) / 4;
    weeks.forEach(([h, b], i) => {
      const x = MX + i * (ww + 0.2);
      rrect(s, x, 1.8, ww, 1.55, i === 3 ? C.accent1 : C.background2);
      txt(s, [{ text: h, options: { bold: true, breakLine: true } }, { text: b, options: { fontSize: 10.5 } }], { x: x + 0.15, y: 1.9, w: ww - 0.3, h: 1.35, fontSize: 12.5, color: i === 3 ? C.background1 : C.text1 });
      if (i < 3) hArrow(s, x + ww + 0.02, 2.57, 0.16, BLUE);
    });
    const next = [["Sensor time series", "Attach vibration and temperature trends to equipment nodes; predict the failure mode and propose the procedure before the stop."], ["Approved write-back", "Draft the work order from the conversation; a person approves before anything is written to the graph."], ["Mobile UI for the floor", "Voice and camera input on a phone, offline manual pages, the same evidence graph."]];
    const nw = (W - 2 * MX - 0.4) / 3;
    txt(s, "After the first four weeks", { x: MX, y: 3.55, w: 6, h: 0.35, fontSize: 11, bold: true, color: C.text2 });
    next.forEach(([h, b], i) => {
      const x = MX + i * (nw + 0.2);
      rrect(s, x, 3.95, nw, 1.25, C.accent3);
      txt(s, [{ text: h, options: { bold: true, color: C.accent1, breakLine: true } }, { text: b, options: { fontSize: 10.5 } }], { x: x + 0.15, y: 4.02, w: nw - 0.3, h: 1.15, fontSize: 12 });
    });
    txt(s, "Team", { x: MX, y: 5.4, w: 6, h: 0.35, fontSize: 11, bold: true, color: C.text2 });
    const tw = (W - 2 * MX - 0.4) / 3;
    TEAM.forEach(([name, role, bio], i) => {
      const x = MX + i * (tw + 0.2);
      rrect(s, x, 5.75, tw, 1.15, C.background2);
      txt(s, [{ text: name, options: { bold: true, breakLine: true } }, { text: role, options: { color: C.accent1, bold: true, fontSize: 10, breakLine: true } }, { text: bio, options: { fontSize: 9 } }], { x: x + 0.15, y: 5.8, w: tw - 0.3, h: 1.08, fontSize: 12 });
    });
  }
  {
    const s = pres.addSlide({ masterName: "SECTION", sectionTitle: currentSection });
    s.addText("Try it, read the code, ask it a question.", { placeholder: "title" });
    s.addText(
      [
        { text: "Live app   kg-web-7ikzkb2evq-an.a.run.app", options: { breakLine: true } },
        { text: "Source     github.com/kurorooooo/kg-maintenance-agent", options: { breakLine: true } },
        { text: "", options: { breakLine: true } },
        { text: "Kakeru Kurosawa · Junichi Fujioka · Kotaro Fukuo", options: {} },
      ],
      { placeholder: "body" }
    );
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written:", OUT);
}

build().catch((e) => { console.error(e); process.exit(1); });
