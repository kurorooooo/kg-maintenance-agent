import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Arrow, C, Caption, Card, Packet, SceneFade, Title, clamp, fade, pop, typed, useFps } from "../lib";

/** S6 アーキテクチャとデータフロー */
export const ArchitectureScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = useFps();
  // 箱の配置（中心座標）
  const B = {
    user: { x: 220, y: 560, w: 260, h: 150, label: "利用者", sub: "保全担当者\nチャットで質問" },
    ai: { x: 640, y: 560, w: 320, h: 190, label: "AIエージェント", sub: "Claude\n起点を決め、グラフを辿り\n固定形式で回答" },
    mcp: { x: 1110, y: 560, w: 340, h: 250, label: "接続層（MCP）読み取り専用", sub: "read_neo4j_cypher\nsearch_manual\n書き込みは拒否" },
    db: { x: 1600, y: 420, w: 300, h: 160, label: "ナレッジグラフ", sub: "Neo4j\n約300ノード・900関係" },
    emb: { x: 1600, y: 720, w: 300, h: 160, label: "手順書チャンク", sub: "ベクトル索引（ローカル埋め込み）\n43 段落" },
  };
  const t = frame / fps;
  const boxes = Object.entries(B);
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Title tracker="バックエンド ④　データフロー" title="質問は AI → 接続層 → グラフ と流れ、答えは根拠 ID を伴って戻る。AI がデータベースに書き込む経路はない" />
      {boxes.map(([k, b], i) => {
        const p = pop(frame, fps, 15 + i * 10);
        const dark = k === "db" || k === "emb";
        return (
          <Card key={k} x={b.x - b.w / 2} y={b.y - b.h / 2} w={b.w} h={b.h} fill={dark ? C.blue : k === "mcp" ? C.lblue : C.lgray} scale={0.85 + 0.15 * p} opacity={p}
            style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", color: dark ? C.white : C.black }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{b.label}</div>
            <div style={{ fontSize: 18, marginTop: 8, lineHeight: 1.45, whiteSpace: "pre-line", opacity: 0.9, fontFamily: k === "mcp" ? "Menlo, monospace" : undefined }}>{b.sub}</div>
          </Card>
        );
      })}
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {/* 往路（上側） */}
        <Arrow x1={352} y1={535} x2={478} y2={535} progress={fade(frame, 60, 10)} color={C.blue} />
        <Arrow x1={802} y1={535} x2={938} y2={535} progress={fade(frame, 70, 10)} color={C.blue} />
        <Arrow x1={1282} y1={500} x2={1448} y2={430} progress={fade(frame, 80, 10)} color={C.blue} />
        <Arrow x1={1282} y1={620} x2={1448} y2={700} progress={fade(frame, 85, 10)} color={C.blue} />
        {/* 復路（下側） */}
        <Arrow x1={1448} y1={470} x2={1282} y2={560} progress={fade(frame, 100, 10)} color={C.dgray} />
        <Arrow x1={1448} y1={740} x2={1282} y2={660} progress={fade(frame, 105, 10)} color={C.dgray} />
        <Arrow x1={938} y1={590} x2={802} y2={590} progress={fade(frame, 110, 10)} color={C.dgray} />
        <Arrow x1={478} y1={590} x2={352} y2={590} progress={fade(frame, 115, 10)} color={C.dgray} />
        {frame > 120 && (
          <>
            <Packet x1={352} y1={535} x2={478} y2={535} t={t * 0.9} />
            <Packet x1={802} y1={535} x2={938} y2={535} t={t * 0.9 - 0.3} />
            <Packet x1={1282} y1={500} x2={1448} y2={430} t={t * 0.9 - 0.6} />
            <Packet x1={1282} y1={620} x2={1448} y2={700} t={t * 0.9 - 0.6} />
            <Packet x1={1448} y1={470} x2={1282} y2={560} t={t * 0.9 - 0.9} color={C.dgray} />
            <Packet x1={938} y1={590} x2={802} y2={590} t={t * 0.9 - 1.2} color={C.dgray} />
            <Packet x1={478} y1={590} x2={352} y2={590} t={t * 0.9 - 1.5} color={C.dgray} />
          </>
        )}
      </svg>
      <div style={{ position: "absolute", left: 80, top: 860, display: "flex", gap: 40, opacity: fade(frame, 130) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22 }}><span style={{ width: 40, height: 6, background: C.blue, display: "inline-block" }} /> 質問・問い合わせ（往路）</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22 }}><span style={{ width: 40, height: 6, background: C.dgray, display: "inline-block" }} /> 結果・根拠 ID（復路）</div>
      </div>
      <Caption delay={150} text="自作したのはデータ変換・投入・手順書検索の3つだけ。グラフDBとAIは既製品の組み合わせで、AIに渡るのは問い合わせ結果のみ。" />
    </SceneFade>
  );
};

/** チャットの吹き出し */
const Bubble: React.FC<{ side: "user" | "ai"; children: React.ReactNode; opacity: number; y: number; width?: number }> = ({ side, children, opacity, y, width = 900 }) => (
  <div style={{ position: "absolute", top: y, left: side === "user" ? undefined : 60, right: side === "user" ? 840 : undefined, maxWidth: width, opacity, background: side === "user" ? C.blue : C.lgray, color: side === "user" ? C.white : C.black, borderRadius: 18, padding: "18px 26px", fontSize: 24, lineHeight: 1.5 }}>
    {children}
  </div>
);

/** ツール呼び出しの行 */
const ToolRow: React.FC<{ y: number; opacity: number; name: string; args: string; result?: string }> = ({ y, opacity, name, args, result }) => (
  <div style={{ position: "absolute", top: y, left: 60, width: 1040, opacity, background: C.white, border: `2px solid ${C.lblue}`, borderRadius: 14, padding: "12px 20px", fontFamily: "Menlo, monospace", fontSize: 18, lineHeight: 1.5 }}>
    <span style={{ color: C.blue, fontWeight: 700 }}>⚙ {name}</span>
    <span style={{ color: C.dgray }}>({args})</span>
    {result && <div style={{ color: C.black, marginTop: 6, whiteSpace: "pre-wrap" }}>→ {result}</div>}
  </div>
);

/** S7 フロントエンド：AIエージェントの動作 */
export const AgentScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const question = "3号ラインの冷却ポンプP-301で振動が上がっている。考えられる原因と過去の対処は？";
  const cypher = "MATCH (e:Equipment {id:'P-301'})-[:OF_MODEL]->(:Model)\n  -[:HAS_COMPONENT]->(c)-[:HAS_FAILURE_MODE]->(fm)\n  -[:HAS_SYMPTOM]->(s:Symptom {name:'振動増大'})\nOPTIONAL MATCH (wo:WorkOrder)-[:ON_EQUIPMENT]->(e)\n  WHERE (wo)-[:DIAGNOSED]->(fm)\nRETURN fm.id, fm.name, count(wo) AS cases ORDER BY cases DESC";
  const answer = [
    ["結論", "P-301 の振動増大は、過去事例から主軸ベアリング内輪摩耗の可能性が最も高い。約半年周期で再発しており、据付ベースの傾きも確認されているため、交換に加えて芯出し・据付状態の確認が必要。"],
    ["原因候補（確度順）", "① 主軸ベアリング内輪摩耗：過去6件（同型機で5件）　② インペラ不釣合い：2件　③ カップリング芯ずれ：2件　④ 軸受グリース劣化：2件"],
    ["推奨対処", "PR-001 冷却ポンプ主軸ベアリング交換（240分、要資格「回転機械整備」）。部品 6306ZZ×2（在庫4・納期3日）、グリース、メカニカルシール（在庫2・納期14日）。技術者は第3ラインの真壁・大槌。"],
    ["根拠", "作業報告 WO-2026-020, WO-2026-015, WO-2026-002, WO-2025-028, WO-2025-015, WO-2024-006 ／ 手順 PR-001 ／ 手順書 CH-cp-200-002（CP-200 保全マニュアル 第3版 p.1）／ パス P-301 → CP-200 → 主軸ベアリング → 主軸ベアリング内輪摩耗 → WO-2026-020 → PR-001"],
  ];
  // タイムライン（フレーム）
  const tQ = 15, tTool1 = 90, tTool1r = 130, tTool2 = 175, tTool2r = 260, tTool3 = 300, tAns = 345;
  const answerChars = Math.max(0, Math.floor((frame - tAns) * 4.2));
  let consumed = 0;
  const rightPanel = (
    <div style={{ position: "absolute", left: 1140, top: 250, width: 720, height: 650, background: C.lgray, borderRadius: 18, padding: 28, boxSizing: "border-box", opacity: fade(frame, tAns, 10) }}>
      <div style={{ fontSize: 22, color: C.dgray, marginBottom: 12 }}>AIの回答（固定フォーマット）</div>
      {answer.map(([h, b]) => {
        const start = consumed;
        consumed += b.length;
        const shown = Math.max(0, Math.min(b.length, answerChars - start));
        if (shown <= 0) return null;
        return (
          <div key={h} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 21, fontWeight: 700, color: C.blue }}>{h}</div>
            <div style={{ fontSize: 18, lineHeight: 1.45 }}>{b.slice(0, shown)}</div>
          </div>
        );
      })}
    </div>
  );
  return (
    <SceneFade durationInFrames={durationInFrames}>
      <Title tracker="フロントエンド　AIエージェントの動作" title="質問を受けた AI は、手順書検索で入口を決め、グラフを問い合わせ、根拠 ID 付きの固定形式で答える" />
      <div style={{ position: "absolute", left: 60, top: 250, width: 1040, height: 650, background: C.white, border: `2px solid ${C.lgray}`, borderRadius: 18 }} />
      <div style={{ position: "absolute", left: 80, top: 262, fontSize: 20, color: C.dgray }}>Claude Desktop（チャット画面）</div>
      <Bubble side="user" y={300} opacity={fade(frame, tQ, 8)}>{typed(question, frame, tQ, 1.6)}</Bubble>
      <ToolRow y={400} opacity={fade(frame, tTool1, 8)} name="search_manual" args={'"冷却ポンプ 振動増大", model_id="CP-200"'}
        result={frame > tTool1r ? "CH-cp-200-002 p.1「2.1 振動・異音の確認」 score 0.93\n   言及: 主軸ベアリング内輪摩耗, カップリング芯ずれ, インペラ不釣合い" : undefined} />
      <ToolRow y={520} opacity={fade(frame, tTool2, 8)} name="read_neo4j_cypher" args={typed(cypher, frame, tTool2 + 5, 6).replace(/\n/g, " ").slice(0, 110) + (frame > tTool2 + 40 ? " …" : "")}
        result={frame > tTool2r ? "FM-001 主軸ベアリング内輪摩耗 6件 ／ FM-003 インペラ不釣合い 2件 ／ FM-004 芯ずれ 2件 ／ FM-002 グリース劣化 2件" : undefined} />
      <ToolRow y={640} opacity={fade(frame, tTool3, 8)} name="read_neo4j_cypher" args={"PR-001 の必要部品・在庫・納期・サプライヤー、資格を持つ技術者と実績"}
        result={frame > tTool3 + 40 ? "PT-001 6306ZZ 在庫4 納期3日 ／ PT-003 在庫2 納期14日 ／ T-05 真壁 3件, T-03 大槌 2件" : undefined} />
      <div style={{ position: "absolute", left: 80, top: 760, fontSize: 20, color: C.dgray, opacity: fade(frame, tAns - 10, 8) }}>
        ツール呼び出し 3 回 ・ グラフ問い合わせはいずれも 0.2 秒以内 ・ 回答生成中…
      </div>
      {rightPanel}
      <Caption delay={tAns + 120} text="回答の末尾には必ず作業報告 ID・手順 ID・手順書の段落 ID と辿ったパスが並ぶ。グラフにない部品番号や納期は作らず、「記録なし」と答える。" />
    </SceneFade>
  );
};
