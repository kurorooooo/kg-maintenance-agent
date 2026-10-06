import React from "react";
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/* Product-launch look: deep navy, large tight type, generous space, restrained motion. */
export const T = {
  bg: "#0B1220",
  bg2: "#111A2C",
  line: "#223049",
  text: "#F4F6FA",
  muted: "#9AA6B8",
  accent: "#4F6DFF",
  accent2: "#7C93FF",
};
export const GRAPH = { asset: "#4F6DFF", material: "#2BB3A3", problem: "#F2884A", action: "#9B7BFF", manual: "#E0B341" };
export const FONT_EN = '"Helvetica Neue", Helvetica, "Hiragino Sans", Arial, sans-serif';

const clampO = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = Easing.out(Easing.cubic);
/** 0→1 eased fade from `start` over `dur` frames. */
export const rise = (frame: number, start: number, dur = 18) => interpolate(frame, [start, start + dur], [0, 1], { ...clampO, easing: ease });

export const Narration: React.FC<{ file: string }> = ({ file }) => <Audio src={staticFile(file)} />;

/** Scene wrapper: dark background, eased fade in/out. */
const Scene: React.FC<{ children: React.ReactNode; durationInFrames: number; bg?: string }> = ({ children, durationInFrames, bg = T.bg }) => {
  const frame = useCurrentFrame();
  const o = Math.min(rise(frame, 0, 14), interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], clampO));
  return <AbsoluteFill style={{ background: bg, color: T.text, fontFamily: FONT_EN, opacity: o }}>{children}</AbsoluteFill>;
};

/** Headline with a thin accent rule that draws in. */
const Headline: React.FC<{ eyebrow?: string; text: string; delay?: number; size?: number; width?: number; top?: number }> = ({ eyebrow, text, delay = 0, size = 60, width = 1500, top = 96 }) => {
  const frame = useCurrentFrame();
  const o = rise(frame, delay, 18);
  const y = interpolate(frame, [delay, delay + 18], [16, 0], { ...clampO, easing: ease });
  const rule = rise(frame, delay + 6, 22);
  return (
    <div style={{ position: "absolute", left: 96, top, width, opacity: o, transform: `translateY(${y}px)` }}>
      {eyebrow && <div style={{ fontSize: 22, color: T.accent2, letterSpacing: 0.2, marginBottom: 18 }}>{eyebrow}</div>}
      <div style={{ fontSize: size, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.6 }}>{text}</div>
      <div style={{ height: 3, width: 120 * rule, background: T.accent, marginTop: 26, borderRadius: 2 }} />
    </div>
  );
};

/** Lower-third key phrase: small, no box, accent bar. */
const Lower: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const o = rise(frame, delay, 14);
  const x = interpolate(frame, [delay, delay + 14], [-12, 0], { ...clampO, easing: ease });
  return (
    <div style={{ position: "absolute", left: 96, bottom: 72, opacity: o, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 4, height: 34, background: T.accent, borderRadius: 2 }} />
      <div style={{ fontSize: 28, color: T.text, letterSpacing: -0.2 }}>{text}</div>
    </div>
  );
};

/* ---------------------------------------------------------------- 1. Title */
export const TitleEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = interpolate(frame, [0, fps * 3], [0.25, 0.5], clampO);
  return (
    <Scene durationInFrames={durationInFrames}>
      <Narration file="audio/title.wav" />
      <div style={{ position: "absolute", left: 1180, top: 120, width: 900, height: 900, borderRadius: 450, background: `radial-gradient(circle, rgba(79,109,255,${glow}) 0%, rgba(11,18,32,0) 62%)` }} />
      <div style={{ position: "absolute", left: 96, top: 300, width: 1300 }}>
        <div style={{ fontSize: 24, color: T.accent2, opacity: rise(frame, 8), letterSpacing: 0.4 }}>AI Builder Cup 2026 · Manufacturing</div>
        <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1.0, letterSpacing: -4, marginTop: 26, opacity: rise(frame, 16, 22), transform: `translateY(${(1 - rise(frame, 16, 22)) * 24}px)` }}>
          Plant A<br />Maintenance Agent
        </div>
        <div style={{ fontSize: 34, color: T.muted, lineHeight: 1.4, marginTop: 40, width: 1100, opacity: rise(frame, 46, 20) }}>
          An ontology-backed AI agent for field engineers on the factory floor. Every answer comes with evidence you can trace on a graph.
        </div>
      </div>
      <div style={{ position: "absolute", left: 96, bottom: 84, display: "flex", gap: 36, alignItems: "baseline", opacity: rise(frame, fps * 8, 20) }}>
        <div style={{ fontSize: 22, color: T.text }}>Kakeru Kurosawa · Junichi Fujioka</div>
        <div style={{ fontSize: 20, color: T.muted }}>Gemini 3.8 Flash · Agent Development Kit · Vertex AI · Cloud Run · Neo4j AuraDB</div>
      </div>
    </Scene>
  );
};

/* ---------------------------------------------------------------- 2. Problem */
export const ProblemEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    ["Equipment register", "12 machines · models · install years"],
    ["Work orders", "80 reports over two years"],
    ["Parts inventory", "stock · lead times · suppliers"],
    ["Manuals", "40 pages per model"],
  ];
  return (
    <Scene durationInFrames={durationInFrames}>
      <Narration file="audio/problem.wav" />
      <Headline eyebrow="02:14 · night shift" text="A pump is vibrating. The answer exists. It lives in four places, and in a veteran who is off duty." />
      <div style={{ position: "absolute", left: 96, right: 96, top: 480, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
        {items.map(([h, s], i) => {
          const o = rise(frame, fps * 3 + i * 10, 18);
          return (
            <div key={h} style={{ opacity: o, transform: `translateY(${(1 - o) * 18}px)`, borderTop: `1px solid ${T.line}`, paddingTop: 26, minHeight: 200 }}>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>{h}</div>
              <div style={{ fontSize: 22, color: T.muted, marginTop: 10, lineHeight: 1.5 }}>{s}</div>
            </div>
          );
        })}
      </div>
      <Lower delay={fps * 14} text="Document search alone cannot connect them." />
    </Scene>
  );
};

/* ---------------------------------------------------------------- 3. Approach: the ontology */
export const ApproachEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const N = {
    sym: { x: 300, y: 540, label: "Symptom", sub: "vibration ↑", fill: GRAPH.problem },
    fm: { x: 700, y: 540, label: "Failure mode", sub: "bearing wear", fill: GRAPH.problem },
    wo: { x: 1100, y: 400, label: "Work orders", sub: "6 past cases", fill: GRAPH.action },
    pr: { x: 1100, y: 680, label: "Procedure", sub: "PR-001", fill: GRAPH.action },
    pt: { x: 1480, y: 680, label: "Parts", sub: "stock · lead time", fill: GRAPH.material },
    tech: { x: 1480, y: 400, label: "Technician", sub: "certified", fill: GRAPH.action },
    eq: { x: 700, y: 820, label: "Equipment", sub: "P-301 · model CP-200", fill: GRAPH.asset },
    ch: { x: 300, y: 820, label: "Manual page", sub: "vector search", fill: GRAPH.manual },
  } as const;
  const order: (keyof typeof N)[] = ["ch", "sym", "fm", "eq", "wo", "pr", "pt", "tech"];
  const edges: [keyof typeof N, keyof typeof N, string][] = [
    ["ch", "fm", "MENTIONS"], ["sym", "fm", "HAS_SYMPTOM"], ["eq", "fm", "HAS_FAILURE_MODE"], ["wo", "fm", "DIAGNOSED"],
    ["pr", "fm", "RESOLVES"], ["pr", "pt", "REQUIRES_PART"], ["wo", "tech", "PERFORMED_BY"], ["wo", "pr", "PERFORMED"],
  ];
  const t = frame / fps;
  return (
    <Scene durationInFrames={durationInFrames}>
      <Narration file="audio/approach.wav" />
      <Headline eyebrow="The approach" text="The plant as an ontology. Vector search finds where to start; the graph supplies the answer and the evidence." size={52} width={1700} />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {edges.map(([a, b, label], i) => {
          const A = N[a], B = N[b];
          const p = rise(frame, fps * 3 + i * 8, 16);
          const ex = A.x + (B.x - A.x) * p, ey = A.y + (B.y - A.y) * p;
          const u = ((t * 0.45 + i * 0.13) % 1 + 1) % 1;
          return (
            <g key={label + i}>
              <line x1={A.x} y1={A.y} x2={ex} y2={ey} stroke={T.line} strokeWidth={2.5} />
              {p >= 1 && <text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 - 10} fontSize={15} fill={T.muted} textAnchor="middle" fontFamily="Menlo, monospace">{label}</text>}
              {p >= 1 && t > 6 && <circle cx={A.x + (B.x - A.x) * u} cy={A.y + (B.y - A.y) * u} r={5} fill={T.accent2} />}
            </g>
          );
        })}
      </svg>
      {order.map((k, i) => {
        const n = N[k];
        const o = rise(frame, fps * 1.2 + i * 7, 16);
        return (
          <div key={k} style={{ position: "absolute", left: n.x - 120, top: n.y - 46, width: 240, height: 92, borderRadius: 14, background: T.bg2, border: `1.5px solid ${n.fill}`, opacity: o, transform: `scale(${0.94 + 0.06 * o})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>{n.label}</div>
            <div style={{ fontSize: 16, color: n.fill, marginTop: 4 }}>{n.sub}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1680, top: 420, width: 200 }}>
        {["Vector search → entry point", "Graph walk → ranked answer", "IDs → evidence"].map((s, i) => (
          <div key={s} style={{ fontSize: 20, lineHeight: 1.4, marginBottom: 26, color: T.muted, opacity: rise(frame, fps * 12 + i * 24, 14) }}>
            <span style={{ color: T.accent2, fontWeight: 700, marginRight: 10 }}>{i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <Lower delay={fps * 21} text="Every ID in the answer is a node you can inspect." />
    </Scene>
  );
};

/* ---------------------------------------------------------------- 4–7. Screen recording clips */
export type Segment = { from: number; to: number; key?: string; rate?: number };

/** Consecutive segments of the recording, framed like a product shot on the dark background. */
export const Clip: React.FC<{ durationInFrames: number; audio: string; segments: Segment[]; badge?: string }> = ({ durationInFrames, audio, segments, badge }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const enter = rise(frame, 0, 20);
  const W = 1920 * 0.85, H = 1080 * 0.85, X = (1920 - W) / 2, Y = 40;
  const starts: number[] = [];
  let at = 0;
  const lens = segments.map((s) => {
    const len = Math.round(((s.to - s.from) / (s.rate ?? 1)) * fps);
    starts.push(at);
    at += len;
    return len;
  });
  return (
    <Scene durationInFrames={durationInFrames}>
      <Narration file={audio} />
      <div style={{ position: "absolute", left: X, top: Y, width: W, height: H, borderRadius: 18, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: "0 30px 80px rgba(0,0,0,0.55)", opacity: enter, transform: `translateY(${(1 - enter) * 16}px)` }}>
        {segments.map((s, i) => (
          <Sequence key={i} from={starts[i]} durationInFrames={lens[i]} name={`seg${i}`} layout="none">
            <OffthreadVideo src={staticFile("rec/demo.mp4")} startFrom={Math.round(s.from * fps)} endAt={Math.round(s.to * fps)} playbackRate={s.rate ?? 1} muted style={{ width: W, height: H, display: "block" }} />
          </Sequence>
        ))}
      </div>
      {segments.map((s, i) =>
        s.key ? (
          <Sequence key={`k${i}`} from={starts[i]} durationInFrames={lens[i]} layout="none">
            <Lower text={s.key} delay={8} />
          </Sequence>
        ) : null,
      )}
      {badge && <div style={{ position: "absolute", right: 144, bottom: 78, fontSize: 18, color: T.muted, opacity: rise(frame, 10, 14), letterSpacing: 0.3 }}>{badge}</div>}
    </Scene>
  );
};

/* ---------------------------------------------------------------- 8. Technology */
export const TechnologyEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const B = {
    user: { x: 250, y: 560, w: 230, h: 110, label: "Browser", sub: "field engineer", accent: T.line },
    web: { x: 610, y: 560, w: 300, h: 150, label: "Cloud Run · kg-web", sub: "Next.js 16\nchat · tool timeline · evidence graph", accent: T.line },
    agent: { x: 1030, y: 560, w: 340, h: 190, label: "Cloud Run · kg-agent", sub: "Google ADK · 3 read-only tools\nGemini 3.8 Flash", accent: T.accent },
    vai: { x: 1480, y: 420, w: 300, h: 120, label: "Vertex AI", sub: "Gemini · gemini-embedding-001", accent: T.line },
    db: { x: 1480, y: 700, w: 300, h: 140, label: "Neo4j AuraDB", sub: "ontology graph + vector index\n295 nodes · 901 edges", accent: GRAPH.material },
    sm: { x: 1030, y: 850, w: 340, h: 80, label: "Secret Manager · Cloud Scheduler · Logging", sub: "", accent: T.line },
  };
  const links: [keyof typeof B, keyof typeof B][] = [["user", "web"], ["web", "agent"], ["agent", "vai"], ["agent", "db"], ["web", "db"], ["sm", "agent"]];
  const stats = [["45 / 45", "reference questions answered correctly in rehearsal"], ["1.0", "ADK hallucination score · 7 / 7 eval cases pass"], ["≈ 20 s", "median answer · 2–3 tool calls"]];
  return (
    <Scene durationInFrames={durationInFrames}>
      <Narration file="audio/technology.wav" />
      <Headline eyebrow="Under the hood" text="An ADK agent with read-only graph tools. Gemini for reasoning and embeddings. Two Cloud Run services." size={48} width={1700} />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {links.map(([a, b], i) => {
          const A = B[a], Bb = B[b];
          const p = rise(frame, fps * 2.5 + i * 7, 14);
          return <line key={i} x1={A.x} y1={A.y} x2={A.x + (Bb.x - A.x) * p} y2={A.y + (Bb.y - A.y) * p} stroke={T.line} strokeWidth={2.5} />;
        })}
      </svg>
      {Object.entries(B).map(([k, b], i) => {
        const o = rise(frame, fps * 0.8 + i * 7, 16);
        return (
          <div key={k} style={{ position: "absolute", left: b.x - b.w / 2, top: b.y - b.h / 2, width: b.w, height: b.h, borderRadius: 14, background: T.bg2, border: `1.5px solid ${b.accent}`, opacity: o, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 12, boxSizing: "border-box" }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>{b.label}</div>
            {b.sub && <div style={{ fontSize: 16, marginTop: 6, lineHeight: 1.4, whiteSpace: "pre-line", color: T.muted }}>{b.sub}</div>}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 96, right: 96, bottom: 150, display: "flex", gap: 48 }}>
        {stats.map(([n, s], i) => (
          <div key={n} style={{ flex: 1, opacity: rise(frame, fps * 13 + i * 14, 14), borderTop: `1px solid ${T.line}`, paddingTop: 18 }}>
            <div style={{ fontSize: 54, fontWeight: 700, color: T.text, letterSpacing: -2 }}>{n}</div>
            <div style={{ fontSize: 20, color: T.muted, lineHeight: 1.4, marginTop: 6 }}>{s}</div>
          </div>
        ))}
      </div>
    </Scene>
  );
};

/* ---------------------------------------------------------------- 9. Closing */
export const ClosingEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    ["Registers · work orders · manuals", "the data every plant already has, in Japanese or English"],
    ["Read-only by design", "the agent cannot write; every answer cites IDs"],
    ["Four weeks", "from your data to a working assistant"],
  ];
  return (
    <Scene durationInFrames={durationInFrames}>
      <Narration file="audio/closing.wav" />
      <div style={{ position: "absolute", left: -200, top: 300, width: 1000, height: 1000, borderRadius: 500, background: "radial-gradient(circle, rgba(79,109,255,0.28) 0%, rgba(11,18,32,0) 62%)" }} />
      <Headline text="Downtime is expensive. The know-how to prevent it is retiring. Put it on a graph, and ask." size={64} width={1500} top={140} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 520, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
        {items.map(([h, s], i) => {
          const o = rise(frame, fps * 4 + i * 12, 18);
          return (
            <div key={h} style={{ opacity: o, transform: `translateY(${(1 - o) * 16}px)`, borderTop: `1px solid ${T.line}`, paddingTop: 22 }}>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>{h}</div>
              <div style={{ fontSize: 21, color: T.muted, marginTop: 10, lineHeight: 1.45 }}>{s}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 96, bottom: 84, fontSize: 24, lineHeight: 1.8, opacity: rise(frame, fps * 11, 16) }}>
        <div><span style={{ color: T.accent2, marginRight: 16 }}>Try it</span>kg-web-7ikzkb2evq-an.a.run.app</div>
        <div><span style={{ color: T.accent2, marginRight: 16 }}>Code</span>github.com/kurorooooo/kg-maintenance-agent</div>
      </div>
      <div style={{ position: "absolute", right: 96, bottom: 92, fontSize: 22, color: T.text, opacity: rise(frame, fps * 11, 16) }}>Kakeru Kurosawa · Junichi Fujioka</div>
    </Scene>
  );
};
