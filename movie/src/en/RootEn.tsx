import React from "react";
import { Audio, Composition, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import narration from "../narration.json";
import marks from "../marks.json";
import { ApproachEn, Clip, ClosingEn, ProblemEn, Segment, TechnologyEn, TitleEn } from "./Scenes";

export const FPS = 30;
const TAIL = 0.9; // seconds of silence after each narration clip

const secs = (scene: string) => narration.find((n) => n.scene === scene)!.seconds;
const mark = (name: string) => marks.find((m) => m.name === name)!.t;
const frames = (s: number) => Math.round(s * FPS);

/** Fit a list of segments to the narration length: scale the last segment's end so the clip is narration + TAIL. */
function fit(segments: Segment[], target: number): Segment[] {
  const total = segments.reduce((a, s) => a + (s.to - s.from) / (s.rate ?? 1), 0);
  const last = segments[segments.length - 1];
  const diff = target - total;
  return [...segments.slice(0, -1), { ...last, to: Math.max(last.from + 1, last.to + diff * (last.rate ?? 1)) }];
}

// Screen-recording cuts (seconds in rec/demo.mp4), from marks.json written by record.mjs
const Q1: Segment[] = fit(
  [
    { from: mark("q1:click") - 1.0, to: mark("q1:click") + 6.5, key: "Searches the manual, then queries the graph once." },
    { from: mark("q1:answered") - 1.5, to: mark("q1:chip") + 7, key: "Six past cases, procedure PR-001, manual page 1. Click an ID: the evidence graph lights up." },
  ],
  secs("demo_q1") + TAIL,
);
const Q2: Segment[] = fit(
  [
    { from: mark("q2:click") - 0.5, to: mark("q2:click") + 4.5, key: "Follow-up: same model on other lines?" },
    { from: mark("q2:answered") - 1.5, to: mark("q2:evidence") + 8, key: "Crosses through the model node: 4 cases on line 1, 1 on line 2." },
  ],
  secs("demo_q2") + TAIL,
);
const Q3: Segment[] = fit([{ from: mark("q3:answered") - 1.0, to: mark("q3:evidence") + 8, key: "Parts in stock, lead times, certified technicians." }], secs("demo_q3") + TAIL);
const E1: Segment[] = fit([{ from: mark("e1:answered") - 1.0, to: mark("e1:evidence") + 8, key: "No record. Nothing invented." }], secs("honesty") + TAIL);

const clipLen = (segs: Segment[]) => frames(segs.reduce((a, s) => a + (s.to - s.from) / (s.rate ?? 1), 0));

export const SCENES: { name: string; dur: number; C: React.FC<{ durationInFrames: number }> }[] = [
  { name: "title", dur: frames(secs("title") + TAIL), C: TitleEn },
  { name: "problem", dur: frames(secs("problem") + TAIL), C: ProblemEn },
  { name: "approach", dur: frames(secs("approach") + TAIL), C: ApproachEn },
  { name: "demo_q1", dur: clipLen(Q1), C: (p) => <Clip {...p} audio="audio/demo_q1.wav" segments={Q1} badge="Live app · unedited screen recording" /> },
  { name: "demo_q2", dur: clipLen(Q2), C: (p) => <Clip {...p} audio="audio/demo_q2.wav" segments={Q2} /> },
  { name: "demo_q3", dur: clipLen(Q3), C: (p) => <Clip {...p} audio="audio/demo_q3.wav" segments={Q3} /> },
  { name: "honesty", dur: clipLen(E1), C: (p) => <Clip {...p} audio="audio/honesty.wav" segments={E1} /> },
  { name: "technology", dur: frames(secs("technology") + TAIL), C: TechnologyEn },
  { name: "closing", dur: frames(secs("closing") + TAIL + 1.5), C: ClosingEn },
];
export const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);

/** Background music under the narration: quiet, fades in at the start and out over the last 5 s. */
const Bgm: React.FC = () => {
  const frame = useCurrentFrame();
  const base = 0.08;
  const v = interpolate(frame, [0, FPS * 1.5, TOTAL - FPS * 5, TOTAL], [0, base, base, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <Audio src={staticFile("bgm.m4a")} volume={v} />;
};

const DemoEn: React.FC = () => {
  let from = 0;
  return (
    <>
      <Bgm />
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

export const DemoEnComposition: React.FC = () => <Composition id="DemoEn" component={DemoEn} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />;
