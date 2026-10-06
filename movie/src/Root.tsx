import React from "react";
import { Composition, Sequence } from "remotion";
import { ClosingScene, ProblemScene, TitleScene } from "./scenes/Intro";
import { BrowserScene, RawDataScene, TransformScene } from "./scenes/Data";
import { AgentScene, ArchitectureScene } from "./scenes/Flow";
import { AnalysisScene, EvidenceScene } from "./scenes/Results";

export const FPS = 30;

// シーンと長さ（フレーム）。順にバックエンド → フロントエンド
export const SCENES: { name: string; dur: number; C: React.FC<{ durationInFrames: number }> }[] = [
  { name: "title", dur: 120, C: TitleScene },
  { name: "problem", dur: 180, C: ProblemScene },
  { name: "rawdata", dur: 330, C: RawDataScene },
  { name: "transform", dur: 390, C: TransformScene },
  { name: "browser", dur: 270, C: BrowserScene },
  { name: "architecture", dur: 360, C: ArchitectureScene },
  { name: "agent", dur: 720, C: AgentScene },
  { name: "evidence", dur: 300, C: EvidenceScene },
  { name: "analysis", dur: 360, C: AnalysisScene },
  { name: "closing", dur: 180, C: ClosingScene },
];
export const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);

const Demo: React.FC = () => {
  let from = 0;
  return (
    <>
      {SCENES.map((s) => {
        const el = (
          <Sequence key={s.name} from={from} durationInFrames={s.dur} name={s.name}>
            <s.C durationInFrames={s.dur} />
          </Sequence>
        );
        from += s.dur;
        return el;
      })}
    </>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition id="Demo" component={Demo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
