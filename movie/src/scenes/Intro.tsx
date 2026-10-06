import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, Caption, Card, SceneFade, Title, clamp, fade, pop, useFps } from "../lib";

/** S1 表紙 */
export const TitleScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const panel = interpolate(frame, [0, 20], [-900, 0], clamp);
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 820, height: 1080, background: C.blue, transform: `translateX(${panel}px)` }}>
        <div style={{ position: "absolute", left: 80, top: 330, color: C.white, fontSize: 64, fontWeight: 700, lineHeight: 1.3, opacity: fade(frame, 18, 15) }}>
          設備保全<br />ナレッジグラフ ×<br />AIエージェント
        </div>
      </div>
      <div style={{ position: "absolute", left: 900, top: 360, opacity: fade(frame, 30, 15) }}>
        <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 24 }}>根拠付きで答える保全アシスタント</div>
        <div style={{ fontSize: 30, color: C.dgray, lineHeight: 1.6 }}>
          ローデータから AI の回答まで<br />バックエンドとフロントエンドのデータフロー
        </div>
        <div style={{ fontSize: 30, color: C.blue, fontWeight: 700, marginTop: 40 }}>AIdeaLab　デモ</div>
      </div>
    </SceneFade>
  );
};

/** S2 課題：4か所に散在 */
export const ProblemScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const items = [
    ["設備台帳・部品表", "設備管理システム / Excel", "📋"],
    ["作業報告", "CMMS / 日報 / 紙", "🗒️"],
    ["マニュアル", "メーカー発行の PDF", "📘"],
    ["ベテランの経験", "夜勤帯は不在、定年で失われる", "👷"],
  ];
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Title tracker="課題" title="保全の判断材料は4か所に散在し、夜間の異常やベテランの退職で判断が途切れる" />
      {items.map(([h, s, emoji], i) => {
        const p = pop(frame, fps, 20 + i * 12);
        return (
          <Card key={h} x={80 + i * 445} y={330} w={410} h={420} scale={0.8 + 0.2 * p} opacity={p}>
            <div style={{ fontSize: 64 }}>{emoji}</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 24 }}>{h}</div>
            <div style={{ fontSize: 24, color: C.dgray, marginTop: 12, lineHeight: 1.5 }}>{s}</div>
          </Card>
        );
      })}
      <Caption delay={80} text="これらは別々の場所にあり、「別ラインの同型機で同じ故障は起きていないか」のような横断の問いに、人もAIも答えにくい。" />
    </SceneFade>
  );
};

/** S10 クロージング */
export const ClosingScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const items = [
    ["設備台帳 + 作業報告", "初版はこの2つで作れる"],
    ["4週間", "御社データで代表質問に答えるPoC"],
    ["読み取り専用", "AIは書き込めない。根拠はIDで示す"],
  ];
  return (
    <SceneFade durationInFrames={durationInFrames} bg={C.blue}>
      <AbsoluteFill style={{ color: C.white }}>
        <div style={{ position: "absolute", left: 120, top: 220, fontSize: 56, fontWeight: 700, lineHeight: 1.35, opacity: fade(frame, 5, 15) }}>
          御社の設備台帳・作業報告・マニュアルで<br />同じものを 4 週間で
        </div>
        {items.map(([h, s], i) => {
          const p = pop(frame, fps, 30 + i * 12);
          return (
            <div key={h} style={{ position: "absolute", left: 120 + i * 560, top: 520, width: 500, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: C.white }}>{h}</div>
              <div style={{ fontSize: 26, color: C.lblue, marginTop: 10 }}>{s}</div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 120, bottom: 100, fontSize: 34, fontWeight: 700, opacity: fade(frame, 80, 15) }}>AIdeaLab</div>
        <div style={{ position: "absolute", right: 120, bottom: 100, fontSize: 20, color: C.lblue, opacity: fade(frame, 80, 15) }}>
          本動画は合成データによるデモです。実在の企業・設備・人物とは関係ありません。
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};
