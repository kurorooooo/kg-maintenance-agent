import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// 6色パレット（ディスカッション資料と共通）
export const C = {
  blue: "#2F54F7",
  lblue: "#DCE4FE",
  dgray: "#3C4049",
  lgray: "#EEF0F3",
  black: "#000000",
  white: "#FFFFFF",
};
export const FONT = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

export const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** 0→1 のフェード。start から dur フレーム */
export const fade = (frame: number, start: number, dur = 15) => interpolate(frame, [start, start + dur], [0, 1], clamp);

/** spring で 0→1 */
export const pop = (frame: number, fps: number, delay: number) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });

/** タイプライター表示 */
export const typed = (text: string, frame: number, start: number, cps = 1.2) => {
  const n = Math.max(0, Math.floor((frame - start) * cps));
  return text.slice(0, n);
};

/** シーン全体のフェードイン・アウト */
export const SceneFade: React.FC<{ children: React.ReactNode; durationInFrames: number; bg?: string }> = ({ children, durationInFrames, bg = C.white }) => {
  const frame = useCurrentFrame();
  const o = Math.min(fade(frame, 0, 12), interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp));
  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONT, color: C.black, opacity: o }}>{children}</AbsoluteFill>
  );
};

/** 左上の章トラッカーとアクションタイトル */
export const Title: React.FC<{ tracker: string; title: string; delay?: number }> = ({ tracker, title, delay = 0 }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, delay, 12);
  const y = interpolate(frame, [delay, delay + 12], [10, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 80, top: 56, right: 80, opacity: o, transform: `translateY(${y}px)` }}>
      <div style={{ fontSize: 22, color: C.dgray, marginBottom: 8 }}>{tracker}</div>
      <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
    </div>
  );
};

/** 画面下のナレーション字幕 */
export const Caption: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, delay, 10);
  return (
    <div
      style={{
        position: "absolute", left: 80, right: 80, bottom: 48, opacity: o,
        background: C.lgray, borderRadius: 14, padding: "18px 28px", fontSize: 28, color: C.black, lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
};

/** 角丸カード */
export const Card: React.FC<{
  x: number; y: number; w: number; h: number; fill?: string; border?: string; children?: React.ReactNode; style?: React.CSSProperties; scale?: number; opacity?: number;
}> = ({ x, y, w, h, fill = C.lgray, border, children, style, scale = 1, opacity = 1 }) => (
  <div
    style={{
      position: "absolute", left: x, top: y, width: w, height: h, background: fill, borderRadius: 18,
      border: border ? `2px solid ${border}` : undefined, boxSizing: "border-box", padding: 24,
      transform: `scale(${scale})`, opacity, transformOrigin: "center", ...style,
    }}
  >
    {children}
  </div>
);

/** SVG 矢印（線を描画しながら伸ばす） */
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; progress: number; color?: string; width?: number }> = ({ x1, y1, x2, y2, progress, color = C.dgray, width = 3 }) => {
  const p = Math.max(0, Math.min(1, progress));
  const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hx = ex - Math.cos(ang) * 14, hy = ey - Math.sin(ang) * 14;
  const lx = hx + Math.cos(ang + Math.PI / 2) * 7, ly = hy + Math.sin(ang + Math.PI / 2) * 7;
  const rx = hx - Math.cos(ang + Math.PI / 2) * 7, ry = hy - Math.sin(ang + Math.PI / 2) * 7;
  if (p <= 0) return null;
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={width} />
      {p > 0.15 && <polygon points={`${ex},${ey} ${lx},${ly} ${rx},${ry}`} fill={color} />}
    </g>
  );
};

/** グラフ用ノード（矩形） */
export const NodeBox: React.FC<{ x: number; y: number; w?: number; h?: number; label: string; sub?: string; fill?: string; color?: string; scale?: number; fontSize?: number }> = ({ x, y, w = 190, h = 70, label, sub, fill = C.lblue, color = C.black, scale = 1, fontSize = 22 }) => (
  <div
    style={{
      position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, background: fill, color, borderRadius: 12,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${scale})`,
      fontSize, fontWeight: 700, lineHeight: 1.15, textAlign: "center", padding: 6, boxSizing: "border-box",
    }}
  >
    <div>{label}</div>
    {sub && <div style={{ fontSize: fontSize * 0.62, fontWeight: 400, opacity: 0.85, marginTop: 4 }}>{sub}</div>}
  </div>
);

/** 線分上を流れる点（データの流れ） */
export const Packet: React.FC<{ x1: number; y1: number; x2: number; y2: number; t: number; color?: string; r?: number }> = ({ x1, y1, x2, y2, t, color = C.blue, r = 9 }) => {
  const u = ((t % 1) + 1) % 1;
  return <circle cx={x1 + (x2 - x1) * u} cy={y1 + (y2 - y1) * u} r={r} fill={color} opacity={0.95} />;
};

export const useFps = () => useVideoConfig().fps;
