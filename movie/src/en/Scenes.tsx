import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Arrow, C, Card, NodeBox, Packet, SceneFade, clamp, fade, pop, useFps } from "../lib";

export const FONT_EN = '"Helvetica Neue", Helvetica, "Hiragino Sans", Arial, sans-serif';
const GRAPH = { asset: "#2F54F7", material: "#1C8C8C", problem: "#E8742C", action: "#7A4DD8", manual: "#B8860B" };

/** Narration audio for a scene (file from narration.json). */
export const Narration: React.FC<{ file: string }> = ({ file }) => <Audio src={staticFile(file)} />;

/** Section tracker + headline, English typography. */
const Head: React.FC<{ tracker: string; title: string; delay?: number }> = ({ tracker, title, delay = 0 }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, delay, 12);
  const y = interpolate(frame, [delay, delay + 12], [10, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 80, top: 56, right: 80, opacity: o, transform: `translateY(${y}px)`, fontFamily: FONT_EN }}>
      <div style={{ fontSize: 22, color: C.dgray, marginBottom: 8 }}>{tracker}</div>
      <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.5 }}>{title}</div>
    </div>
  );
};

/** Key phrase at the bottom (not the full narration). */
const Key: React.FC<{ text: string; delay?: number; dark?: boolean }> = ({ text, delay = 0, dark }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, delay, 10);
  return (
    <div
      style={{
        position: "absolute", left: 80, right: 80, bottom: 48, opacity: o, fontFamily: FONT_EN,
        background: dark ? "rgba(27,36,48,0.92)" : C.lgray, color: dark ? C.white : C.black,
        borderRadius: 14, padding: "16px 26px", fontSize: 28, lineHeight: 1.35,
      }}
    >
      {text}
    </div>
  );
};

/* ---------------------------------------------------------------- 1. Title */
export const TitleEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const panel = interpolate(frame, [0, 20], [-900, 0], clamp);
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Narration file="audio/title.wav" />
      <div style={{ position: "absolute", left: 0, top: 0, width: 820, height: 1080, background: C.blue, transform: `translateX(${panel}px)`, fontFamily: FONT_EN }}>
        <div style={{ position: "absolute", left: 80, top: 300, color: C.white, fontSize: 68, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1, opacity: fade(frame, 18, 15) }}>
          Plant A<br />Maintenance<br />Agent
        </div>
        <div style={{ position: "absolute", left: 80, top: 600, color: C.lblue, fontSize: 26, lineHeight: 1.5, opacity: fade(frame, 30, 15) }}>
          AI Builder Cup 2026 · Manufacturing
        </div>
      </div>
      <div style={{ position: "absolute", left: 900, top: 330, width: 940, opacity: fade(frame, 30, 15), fontFamily: FONT_EN }}>
        <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.3 }}>An AI maintenance assistant that answers with evidence you can trace on a graph.</div>
        <div style={{ fontSize: 26, color: C.dgray, lineHeight: 1.6, marginTop: 28 }}>
          Gemini 3.8 Flash · Agent Development Kit · Vertex AI Embeddings<br />Cloud Run · Neo4j AuraDB on Google Cloud
        </div>
        <div style={{ fontSize: 24, color: C.blue, fontWeight: 700, marginTop: 44 }}>Kakeru Kurosawa · Junichi Fujioka — AIdeaLab</div>
      </div>
    </SceneFade>
  );
};

/* ---------------------------------------------------------------- 2. Problem */
export const ProblemEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const items = [
    ["Equipment register", "12 machines, models, install years", "📋"],
    ["Work orders", "80 reports over two years", "🗒️"],
    ["Parts inventory", "stock, lead times, suppliers", "📦"],
    ["Manuals", "40 pages per model", "📘"],
  ];
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Narration file="audio/problem.wav" />
      <Head tracker="The problem" title="Night shift. A pump is vibrating. The answer exists, but it lives in four places and in a veteran's head." />
      <div style={{ position: "absolute", right: 80, top: 56, fontFamily: FONT_EN, fontSize: 26, color: C.dgray, opacity: fade(frame, 10, 10) }}>🕑 02:14</div>
      {items.map(([h, s, emoji], i) => {
        const p = pop(frame, fps, 40 + i * 12);
        return (
          <Card key={h} x={80 + i * 445} y={300} w={410} h={520} scale={0.8 + 0.2 * p} opacity={p} style={{ fontFamily: FONT_EN }}>
            <div style={{ fontSize: 64 }}>{emoji}</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 24 }}>{h}</div>
            <div style={{ fontSize: 24, color: C.dgray, marginTop: 12, lineHeight: 1.5 }}>{s}</div>
          </Card>
        );
      })}
      <Key delay={fps * 14} text="Document search alone cannot connect them." />
    </SceneFade>
  );
};

/* ---------------------------------------------------------------- 3. Approach: the graph */
export const ApproachEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const N = {
    sym: { x: 240, y: 470, label: "Symptom", sub: "vibration ↑", fill: GRAPH.problem },
    fm: { x: 640, y: 470, label: "Failure mode", sub: "bearing wear", fill: GRAPH.problem },
    wo: { x: 1040, y: 320, label: "Work orders", sub: "6 past cases", fill: GRAPH.action },
    pr: { x: 1040, y: 620, label: "Procedure", sub: "PR-001", fill: GRAPH.action },
    pt: { x: 1420, y: 620, label: "Parts", sub: "stock · lead time", fill: GRAPH.material },
    tech: { x: 1420, y: 320, label: "Technician", sub: "certified", fill: GRAPH.action },
    eq: { x: 640, y: 760, label: "Equipment", sub: "P-301 · model CP-200", fill: GRAPH.asset },
    ch: { x: 240, y: 760, label: "Manual page", sub: "vector search", fill: GRAPH.manual },
  } as const;
  const order: (keyof typeof N)[] = ["ch", "sym", "fm", "eq", "wo", "pr", "pt", "tech"];
  const edges: [keyof typeof N, keyof typeof N, string][] = [
    ["ch", "fm", "MENTIONS"], ["sym", "fm", "HAS_SYMPTOM"], ["eq", "fm", "HAS_FAILURE_MODE"], ["wo", "fm", "DIAGNOSED"],
    ["pr", "fm", "RESOLVES"], ["pr", "pt", "REQUIRES_PART"], ["wo", "tech", "PERFORMED_BY"], ["wo", "pr", "PERFORMED"],
  ];
  const t = frame / fps;
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Narration file="audio/approach.wav" />
      <Head tracker="The approach" title="One knowledge graph. Vector search finds where to start; the graph supplies the answer and the evidence." />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {edges.map(([a, b, label], i) => {
          const A = N[a], B = N[b];
          const p = fade(frame, 55 + i * 9, 12);
          return (
            <g key={label + i}>
              <Arrow x1={A.x} y1={A.y} x2={B.x} y2={B.y} progress={p} color="#B9C2CC" width={3} />
              {p >= 1 && <text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 - 10} fontSize={16} fill="#7B8794" textAnchor="middle" fontFamily="Menlo, monospace">{label}</text>}
              {p >= 1 && t > 5 && <Packet x1={A.x} y1={A.y} x2={B.x} y2={B.y} t={t * 0.5 + i * 0.13} color={C.blue} r={6} />}
            </g>
          );
        })}
      </svg>
      {order.map((k, i) => {
        const n = N[k];
        const p = pop(frame, fps, 20 + i * 8);
        return <NodeBox key={k} x={n.x} y={n.y} w={240} h={92} label={n.label} sub={n.sub} fill={n.fill} color={C.white} scale={p} fontSize={26} />;
      })}
      <div style={{ position: "absolute", left: 1600, top: 360, width: 300, fontFamily: FONT_EN, opacity: fade(frame, fps * 9, 15) }}>
        {["Vector search → where to start", "Graph walk → ranked causes, procedure, parts, people", "Every ID → a node you can inspect"].map((s, i) => (
          <div key={s} style={{ fontSize: 24, lineHeight: 1.4, marginBottom: 22, color: C.black, opacity: fade(frame, fps * 9 + i * 30, 12) }}>
            <span style={{ color: C.blue, fontWeight: 700, marginRight: 10 }}>{i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <Key delay={fps * 15} text="Every ID in the answer is a node you can inspect." />
    </SceneFade>
  );
};

/* ---------------------------------------------------------------- 4–7. Screen recording clips */
export type Segment = { from: number; to: number; key?: string; rate?: number };

/** Play consecutive segments of the recording (seconds) back to back, each with an optional key phrase. */
export const Clip: React.FC<{ durationInFrames: number; audio: string; segments: Segment[]; badge?: string }> = ({ durationInFrames, audio, segments, badge }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  let at = 0;
  return (
    <SceneFade durationInFrames={durationInFrames} bg="#EEF1F4">
      <Narration file={audio} />
      {segments.map((s, i) => {
        const rate = s.rate ?? 1;
        const len = Math.round(((s.to - s.from) / rate) * fps);
        const start = at;
        at += len;
        return (
          <Sequence key={i} from={start} durationInFrames={len} name={`seg${i}`}>
            <OffthreadVideo src={staticFile("rec/demo.mp4")} startFrom={Math.round(s.from * fps)} endAt={Math.round(s.to * fps)} playbackRate={rate} muted style={{ width: 1920, height: 1080 }} />
            {s.key && <Key text={s.key} delay={6} dark />}
            {rate !== 1 && (
              <div style={{ position: "absolute", right: 24, top: 70, fontFamily: FONT_EN, fontSize: 20, color: C.white, background: "rgba(27,36,48,0.85)", borderRadius: 8, padding: "6px 12px" }}>
                ×{rate}
              </div>
            )}
          </Sequence>
        );
      })}
      {badge && (
        <div style={{ position: "absolute", left: 80, bottom: 136, fontFamily: FONT_EN, fontSize: 20, color: C.white, background: C.blue, borderRadius: 8, padding: "6px 12px", opacity: fade(frame, 0, 10) }}>
          {badge}
        </div>
      )}
    </SceneFade>
  );
};

/* ---------------------------------------------------------------- 8. Technology */
export const TechnologyEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const B = {
    user: { x: 200, y: 470, w: 240, h: 130, label: "Browser", sub: "maintenance staff", fill: C.lgray, color: C.black },
    web: { x: 560, y: 470, w: 300, h: 170, label: "Cloud Run · kg-web", sub: "Next.js 16\nchat · tool timeline · evidence graph", fill: C.lblue, color: C.black },
    agent: { x: 980, y: 470, w: 330, h: 210, label: "Cloud Run · kg-agent", sub: "Google ADK\n3 read-only tools\nGemini 3.8 Flash", fill: C.blue, color: C.white },
    vai: { x: 1420, y: 330, w: 300, h: 130, label: "Vertex AI", sub: "Gemini · gemini-embedding-001", fill: C.lgray, color: C.black },
    db: { x: 1420, y: 610, w: 300, h: 150, label: "Neo4j AuraDB", sub: "knowledge graph + vector index\n295 nodes · 901 edges", fill: "#1B2430", color: C.white },
    sm: { x: 980, y: 800, w: 330, h: 90, label: "Secret Manager · Cloud Scheduler · Logging", sub: "", fill: C.lgray, color: C.black },
  };
  const links: [keyof typeof B, keyof typeof B][] = [["user", "web"], ["web", "agent"], ["agent", "vai"], ["agent", "db"], ["web", "db"], ["sm", "agent"]];
  const stats = [["45 / 45", "reference questions answered correctly in rehearsal"], ["1.0", "ADK hallucination check (7 / 7 eval cases pass)"], ["≈ 20 s", "median answer time, 2–3 tool calls"]];
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Narration file="audio/technology.wav" />
      <Head tracker="Under the hood" title="An ADK agent with read-only graph tools, Gemini for reasoning and embeddings, two Cloud Run services." />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {links.map(([a, b], i) => {
          const A = B[a], Bb = B[b];
          return <Arrow key={i} x1={A.x} y1={A.y} x2={Bb.x} y2={Bb.y} progress={fade(frame, 50 + i * 8, 10)} color="#B9C2CC" width={3} />;
        })}
      </svg>
      {Object.entries(B).map(([k, b], i) => {
        const p = pop(frame, fps, 15 + i * 8);
        return (
          <Card key={k} x={b.x - b.w / 2} y={b.y - b.h / 2} w={b.w} h={b.h} fill={b.fill} scale={0.85 + 0.15 * p} opacity={p}
            style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", color: b.color, fontFamily: FONT_EN, padding: 14 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{b.label}</div>
            {b.sub && <div style={{ fontSize: 17, marginTop: 6, lineHeight: 1.4, whiteSpace: "pre-line", opacity: 0.9 }}>{b.sub}</div>}
          </Card>
        );
      })}
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 120, display: "flex", gap: 40, fontFamily: FONT_EN }}>
        {stats.map(([n, s], i) => (
          <div key={n} style={{ flex: 1, opacity: fade(frame, fps * 13 + i * 15, 12) }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: C.blue, letterSpacing: -1 }}>{n}</div>
            <div style={{ fontSize: 22, color: C.dgray, lineHeight: 1.4 }}>{s}</div>
          </div>
        ))}
      </div>
    </SceneFade>
  );
};

/* ---------------------------------------------------------------- 9. Closing */
export const ClosingEn: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const items = [
    ["Registers · work orders · manuals", "the data every plant already has, in any language"],
    ["Read-only by design", "the agent cannot write; every answer cites IDs"],
    ["4 weeks", "from your data to a working assistant"],
  ];
  return (
    <SceneFade durationInFrames={durationInFrames} bg={C.blue}>
      <Narration file="audio/closing.wav" />
      <AbsoluteFill style={{ color: C.white, fontFamily: FONT_EN }}>
        <div style={{ position: "absolute", left: 120, top: 200, fontSize: 56, fontWeight: 700, lineHeight: 1.25, letterSpacing: -1, opacity: fade(frame, 5, 15), width: 1500 }}>
          Downtime is expensive and the knowledge to prevent it is retiring.<br />Put it on a graph, and ask.
        </div>
        {items.map(([h, s], i) => {
          const p = pop(frame, fps, 60 + i * 14);
          return (
            <div key={h} style={{ position: "absolute", left: 120 + i * 560, top: 520, width: 500, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
              <div style={{ fontSize: 34, fontWeight: 700 }}>{h}</div>
              <div style={{ fontSize: 24, color: C.lblue, marginTop: 10, lineHeight: 1.4 }}>{s}</div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 120, bottom: 110, fontSize: 26, color: C.white, lineHeight: 1.7, opacity: fade(frame, fps * 11, 15) }}>
          <div><span style={{ color: C.lblue }}>Try it</span> kg-web-7ikzkb2evq-an.a.run.app</div>
          <div><span style={{ color: C.lblue }}>Code</span> github.com/kurorooooo/kg-maintenance-agent</div>
        </div>
        <div style={{ position: "absolute", right: 120, bottom: 110, fontSize: 28, fontWeight: 700, opacity: fade(frame, fps * 11, 15) }}>AIdeaLab</div>
      </AbsoluteFill>
    </SceneFade>
  );
};

/** Unused helper kept for a still image fallback. */
export const Still: React.FC<{ src: string }> = ({ src }) => <Img src={staticFile(src)} style={{ width: 1920, height: 1080 }} />;
