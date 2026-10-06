import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import data from "../data.json";
import { Arrow, C, Caption, Card, NodeBox, SceneFade, Title, clamp, fade, pop, useFps } from "../lib";

const Mono: React.CSSProperties = { fontFamily: 'Menlo, "SF Mono", monospace', fontSize: 17, lineHeight: 1.55, whiteSpace: "pre", color: C.black };

/** ウィンドウ風の枠 */
const Win: React.FC<{ x: number; y: number; w: number; h: number; title: string; opacity: number; children: React.ReactNode }> = ({ x, y, w, h, title, opacity, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity, background: C.white, border: `2px solid ${C.lgray}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
    <div style={{ background: C.lgray, padding: "10px 18px", fontSize: 20, fontWeight: 700, color: C.dgray }}>{title}</div>
    <div style={{ padding: 16 }}>{children}</div>
  </div>
);

/** S3 ローデータ */
export const RawDataScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const eqRows = data.equipment;
  const woRows = data.workorders;
  const rowsShown = (start: number, n: number, perRow = 6) => Math.min(n, Math.max(0, Math.floor((frame - start) / perRow)));
  const chunkText = data.chunk.text;
  const shownChars = Math.max(0, Math.floor((frame - 120) * 3));
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Title tracker="バックエンド ①　ローデータ" title="元になるのは設備台帳・作業報告・マニュアルという、どの工場にもある3種類のデータ" />
      <Win x={80} y={250} w={560} h={560} title="data/equipment.csv（設備台帳）" opacity={fade(frame, 20)}>
        <div style={Mono}>
          {"id,name,modelId,lineId,year\n"}
          {eqRows.slice(0, rowsShown(30, eqRows.length, 5)).map((e) => `${e.id},${e.name},${e.modelId},${e.lineId},${e.installedYear}\n`).join("")}
        </div>
      </Win>
      <Win x={680} y={250} w={700} h={560} title="data/workorders.csv（作業報告 80件のうち）" opacity={fade(frame, 60)}>
        <div style={Mono}>
          {"id,date,equipment,failureMode,downtime\n"}
          {woRows.slice(0, rowsShown(75, woRows.length, 8)).map((w) => `${w.id},${w.date},${w.equipmentId},${w.failureMode},${w.downtimeMin}分\n  note: ${w.note}\n`).join("")}
        </div>
      </Win>
      <Win x={1420} y={250} w={420} h={560} title="manuals/CP-200_cooling_pump.md" opacity={fade(frame, 110)}>
        <div style={{ fontSize: 17, lineHeight: 1.6, color: C.black }}>
          <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8 }}>{data.chunk.section}</div>
          {chunkText.slice(0, shownChars)}
        </div>
      </Win>
      <Caption delay={200} text="設備台帳は「どこに何があるか」、作業報告は「いつ何が起きて何をしたか」、マニュアルは「どう判断しどう直すか」。この3つをつなぐ。" />
    </SceneFade>
  );
};

/** S4 変換・投入：CSV がグラフになる */
export const TransformScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  const bw = 190, bh = 70;
  const pos: Record<string, [number, number]> = {
    Line: [860, 290], Equipment: [1100, 290], Model: [1340, 290], Component: [1580, 290],
    Symptom: [1100, 480], FailureMode: [1340, 480], Part: [1580, 480],
    Technician: [860, 670], WorkOrder: [1100, 670], Procedure: [1340, 670], Supplier: [1580, 670],
    Chunk: [1580, 840],
  };
  const ja: Record<string, string> = { Line: "ライン", Equipment: "設備", Model: "型式", Component: "部位", Symptom: "症状", FailureMode: "故障モード", Part: "購入部品", Technician: "技術者", WorkOrder: "作業報告", Procedure: "対処手順", Supplier: "サプライヤー", Chunk: "手順書の段落" };
  const order = ["Line", "Equipment", "Model", "Component", "Part", "FailureMode", "Symptom", "Procedure", "Supplier", "WorkOrder", "Technician", "Chunk"];
  const edges: [string, string][] = [
    ["Line", "Equipment"], ["Equipment", "Model"], ["Model", "Component"], ["Component", "Part"], ["Component", "FailureMode"],
    ["FailureMode", "Symptom"], ["Procedure", "FailureMode"], ["Procedure", "Part"], ["Part", "Supplier"],
    ["WorkOrder", "Equipment"], ["WorkOrder", "Symptom"], ["WorkOrder", "FailureMode"], ["WorkOrder", "Procedure"], ["WorkOrder", "Technician"],
    ["Technician", "Line"], ["Chunk", "FailureMode"], ["Chunk", "Part"],
  ];
  const nodeStart = 40, nodeGap = 7, edgeStart = nodeStart + order.length * nodeGap + 10;
  const clipEnd = (a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.min(dx ? bw / 2 / Math.abs(dx) : 9, dy ? bh / 2 / Math.abs(dy) : 9);
    return [a[0] + dx * t, a[1] + dy * t, b[0] - dx * t, b[1] - dy * t];
  };
  const counter = (target: number, start: number) => Math.round(interpolate(frame, [start, start + 50], [0, target], clamp));
  const srcs = ["設備台帳 .csv", "部品表・購買 .csv", "作業報告 .csv", "マニュアル .md"];
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Title tracker="バックエンド ②　変換・投入" title="表形式のデータを「もの」と「関係」に変換し、グラフデータベースに投入する" />
      {srcs.map((s, i) => (
        <Card key={s} x={80} y={300 + i * 120} w={300} h={90} opacity={fade(frame, 10 + i * 6)} style={{ display: "flex", alignItems: "center", fontSize: 24, fontWeight: 700 }}>
          {s}
        </Card>
      ))}
      <Card x={440} y={300} w={260} h={440} fill={C.lblue} opacity={fade(frame, 25)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>変換・投入</div>
        <div style={{ fontSize: 20, color: C.dgray, marginTop: 14, lineHeight: 1.5 }}>表記ゆれの正規化<br />故障モードの辞書化<br />マニュアルの段落分割<br />と埋め込み</div>
      </Card>
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {srcs.map((_, i) => (
          <Arrow key={i} x1={380} y1={345 + i * 120} x2={436} y2={345 + i * 120} progress={fade(frame, 20 + i * 6, 10)} color={C.blue} />
        ))}
        <Arrow x1={700} y1={525} x2={760} y2={525} progress={fade(frame, 35, 10)} color={C.blue} width={4} />
        {edges.map(([a, b], i) => {
          const [x1, y1, x2, y2] = clipEnd(pos[a], pos[b]);
          return <Arrow key={i} x1={x1} y1={y1} x2={x2} y2={y2} progress={fade(frame, edgeStart + i * 4, 10)} color={C.dgray} width={2.5} />;
        })}
      </svg>
      {order.map((k, i) => {
        const p = pop(frame, fps, nodeStart + i * nodeGap);
        const fill = k === "FailureMode" ? C.blue : k === "WorkOrder" ? C.lblue : C.lgray;
        return <NodeBox key={k} x={pos[k][0]} y={pos[k][1]} w={bw} h={bh} label={ja[k]} sub={k} fill={fill} color={k === "FailureMode" ? C.white : C.black} scale={p} fontSize={21} />;
      })}
      <div style={{ position: "absolute", left: 80, top: 770, opacity: fade(frame, edgeStart + 60, 12) }}>
        <div style={{ fontSize: 22, color: C.dgray }}>投入結果（Neo4j）</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: C.blue, marginTop: 6 }}>
          {counter(data.counts.nodes, edgeStart + 60)} ノード　/　{counter(data.counts.rels, edgeStart + 60)} 関係
        </div>
        <div style={{ fontSize: 22, color: C.dgray, marginTop: 6 }}>＋ 手順書の段落 {counter(data.counts.chunks, edgeStart + 60)} 件（ベクトル索引付き）</div>
      </div>
      <Caption delay={edgeStart + 70} text="12種類の「もの」を18種類の「関係」でつなぐ。中心は故障モードで、症状から入り、型式で同型機へ横断し、作業報告と手順で過去の対応に降りる。" />
    </SceneFade>
  );
};

/** S5 Neo4j Browser */
export const BrowserScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.12], clamp);
  const tx = interpolate(frame, [0, durationInFrames], [0, -60], clamp);
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Title tracker="バックエンド ③　グラフの確認" title="投入したグラフは Neo4j Browser でそのまま見える。P-301 の周りに型式・部位・故障モード・作業報告がつながる" />
      <div style={{ position: "absolute", left: 80, top: 250, width: 1260, height: 700, overflow: "hidden", borderRadius: 14, border: `2px solid ${C.lgray}`, boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
        <Img src={staticFile("neo4j_browser.png")} style={{ width: "100%", transform: `scale(${scale}) translate(${tx}px, 0)`, transformOrigin: "40% 45%" }} />
      </div>
      <Card x={1400} y={250} w={440} h={330} fill={C.lblue} opacity={fade(frame, 40)}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.blue }}>表示しているクエリ</div>
        <div style={{ fontFamily: "Menlo, monospace", fontSize: 16, lineHeight: 1.5, marginTop: 12, whiteSpace: "pre-wrap" }}>
          {"MATCH (e:Equipment {id:'P-301'})\nOPTIONAL MATCH p2 = (e)-[:OF_MODEL]->(:Model)\n  -[:HAS_COMPONENT]->(:Component)\n  -[:HAS_FAILURE_MODE]->(:FailureMode)\nOPTIONAL MATCH p3 = (e)<-[:ON_EQUIPMENT]-(:WorkOrder)\nRETURN p1, p2, p3"}
        </div>
      </Card>
      <Card x={1400} y={610} w={440} h={340} opacity={fade(frame, 90)}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.blue }}>結果</div>
        <div style={{ fontSize: 22, lineHeight: 1.7, marginTop: 10 }}>
          ノード 33：設備 1、ライン 1、型式 1<br />部位 7、故障モード 7、作業報告 16<br />関係 32
        </div>
        <div style={{ fontSize: 18, color: C.dgray, marginTop: 10 }}>中央の青が P-301、周囲の緑が作業報告 16 件</div>
      </Card>
      <Caption delay={130} text="この画面はデモ中に AI の回答と並べて見せる。回答に出た作業報告 ID を入れると、同じパスが光る。" />
    </SceneFade>
  );
};
