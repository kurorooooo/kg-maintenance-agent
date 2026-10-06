import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import data from "../data.json";
import { Arrow, C, Caption, NodeBox, SceneFade, Title, clamp, fade, pop, useFps } from "../lib";

/** S8 根拠パス */
export const EvidenceScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const chain = [
    ["P-301", "Equipment 設備", C.lgray],
    ["CP-200", "Model 型式", C.lgray],
    ["主軸ベアリング", "Component 部位", C.lgray],
    ["主軸ベアリング\n内輪摩耗", "FailureMode 故障モード", C.blue],
    ["WO-2026-015", "WorkOrder 作業報告", C.lblue],
    ["PR-001\n軸受交換", "Procedure 手順", C.lgray],
    ["6306ZZ\n在庫4・納期3日", "Part 購入部品", C.lgray],
  ];
  const xs = chain.map((_, i) => 200 + i * 255);
  const y = 520;
  const extras = [
    { label: "振動増大", sub: "Symptom 症状", x: xs[3], y: 300, from: 3 },
    { label: "CH-cp-200-002 p.1", sub: "Chunk 手順書の段落", x: xs[3] + 255, y: 300, from: 3 },
    { label: "真壁 美咲", sub: "Technician 技術者", x: xs[4], y: 760, from: 4 },
    { label: "東和ベアリング商会", sub: "Supplier サプライヤー", x: xs[6], y: 760, from: 6 },
  ];
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Title tracker="フロントエンド　根拠パス" title="回答に添えられたパスは、そのままグラフ上の経路として検証できる" />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {chain.slice(1).map((_, i) => (
          <Arrow key={i} x1={xs[i] + 100} y1={y} x2={xs[i + 1] - 100} y2={y} progress={fade(frame, 25 + i * 14, 10)} color={C.blue} width={4} />
        ))}
        {extras.map((e, i) => {
          const dir = e.y < y ? -1 : 1;
          return <Arrow key={i} x1={e.x === xs[e.from] ? xs[e.from] : xs[e.from] + 100} y1={y + dir * 40} x2={e.x} y2={e.y - dir * 40} progress={fade(frame, 130 + i * 10, 10)} color={C.dgray} width={3} />;
        })}
      </svg>
      {chain.map(([label, sub, fill], i) => (
        <NodeBox key={label} x={xs[i]} y={y} w={210} h={96} label={label} sub={sub} fill={fill} color={fill === C.blue ? C.white : C.black} scale={pop(frame, fps, 10 + i * 14)} fontSize={22} />
      ))}
      {extras.map((e, i) => (
        <NodeBox key={e.label} x={e.x} y={e.y} w={230} h={80} label={e.label} sub={e.sub} fill={C.lgray} scale={pop(frame, fps, 135 + i * 10)} fontSize={20} />
      ))}
      <div style={{ position: "absolute", left: 80, top: 880, fontFamily: "Menlo, monospace", fontSize: 22, color: C.dgray, opacity: fade(frame, 120) }}>
        パス: P-301 → CP-200 → 主軸ベアリング → 主軸ベアリング内輪摩耗 → WO-2026-015 → PR-001 → 6306ZZ
      </div>
      <Caption delay={170} text="「どの設備の、どの部位が、どう壊れ、いつ誰が何をして、次に何が要るか」を1本の経路で示せる。人が追えるから、幻覚ではないと確認できる。" />
    </SceneFade>
  );
};

/** S9 横断と集計 */
export const AnalysisScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const others = [
    ["P-101", "第1ライン・4件", 330],
    ["P-201", "第2ライン・1件", 520],
    ["P-302", "第3ライン・記録なし", 710],
  ] as const;
  const bars = data.q4;
  const maxV = 1000;
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Title tracker="フロントエンド　横断と集計" title="型式を経由すれば別ラインの同型機へ横断でき、故障モードの分類で絞れば集計も1本の問い合わせで済む" />
      {/* 左：横断 */}
      <div style={{ position: "absolute", left: 80, top: 250, fontSize: 24, fontWeight: 700, color: C.blue, opacity: fade(frame, 10) }}>質問2　同型ポンプで同じ症状は他ラインにも？</div>
      <NodeBox x={190} y={520} w={200} h={90} label="P-301" sub="第3ライン・6件" fill={C.blue} color={C.white} scale={pop(frame, fps, 15)} />
      <NodeBox x={480} y={520} w={220} h={90} label="型式 CP-200" sub="渦巻型冷却水ポンプ" fill={C.lblue} scale={pop(frame, fps, 30)} />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        <Arrow x1={292} y1={520} x2={368} y2={520} progress={fade(frame, 25, 10)} color={C.blue} width={4} />
        {others.map(([, , y], i) => (
          <Arrow key={i} x1={592} y1={520} x2={670} y2={y} progress={fade(frame, 50 + i * 12, 10)} color={C.blue} width={4} />
        ))}
        {/* 右：棒グラフ */}
        {bars.map(([label, v, n], i) => {
          const p = interpolate(frame, [120 + i * 8, 150 + i * 8], [0, 1], clamp);
          const y0 = 320 + i * 72;
          const w = (Number(v) / maxV) * 520 * p;
          return (
            <g key={label}>
              <text x={1230} y={y0 + 30} textAnchor="end" fontSize={18} fill={C.dgray} fontFamily='"Hiragino Sans", sans-serif' opacity={fade(frame, 110 + i * 8)}>{label}</text>
              <rect x={1245} y={y0} width={w} height={44} fill={i === 0 ? C.blue : C.lblue} rx={6} />
              <text x={1245 + w + 12} y={y0 + 30} fontSize={20} fill={C.black} fontFamily='"Hiragino Sans", sans-serif' opacity={p}>{v} 分（{n}件）</text>
            </g>
          );
        })}
      </svg>
      {others.map(([label, sub, y], i) => (
        <NodeBox key={label} x={780} y={y} w={220} h={90} label={label} sub={sub} fill={C.lgray} scale={pop(frame, fps, 55 + i * 12)} />
      ))}
      <div style={{ position: "absolute", left: 1000, top: 250, fontSize: 24, fontWeight: 700, color: C.blue, opacity: fade(frame, 100) }}>質問4　直近1年でベアリング起因の停止が多い設備は？</div>
      <div style={{ position: "absolute", left: 1000, top: 840, fontSize: 20, color: C.dgray, opacity: fade(frame, 190) }}>
        FailureMode.category = bearing かつ 日付が1年以内の作業報告を設備ごとに集計（実行 0.05 秒）
      </div>
      <Caption delay={210} text="P-101 の作業報告には「P-301」という語はない。文章の類似では届かず、「同じ型式」という関係を辿って初めて見つかる。" />
    </SceneFade>
  );
};
