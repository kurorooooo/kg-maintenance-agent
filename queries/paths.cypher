// 根拠パスの可視化用。Neo4j Browser に貼って実行し、Claude の回答と並べて見せる。

// P-301 周辺のサブグラフ（デモ冒頭）
MATCH (e:Equipment {id: 'P-301'})
OPTIONAL MATCH p1 = (e)<-[:HAS_EQUIPMENT]-(:Line)
OPTIONAL MATCH p2 = (e)-[:OF_MODEL]->(:Model)-[:HAS_COMPONENT]->(:Component)-[:HAS_FAILURE_MODE]->(:FailureMode)
OPTIONAL MATCH p3 = (e)<-[:ON_EQUIPMENT]-(:WorkOrder)
RETURN p1, p2, p3;

// Q1 根拠: P-301 → 主軸ベアリング → 内輪摩耗 → 過去の作業報告 → 手順
MATCH p = (e:Equipment {id: 'P-301'})-[:OF_MODEL]->(:Model)-[:HAS_COMPONENT]->(:Component)
          -[:HAS_FAILURE_MODE]->(fm:FailureMode {id: 'FM-001'})-[:HAS_SYMPTOM]->(:Symptom {name: '振動増大'})
MATCH p2 = (wo:WorkOrder)-[:ON_EQUIPMENT]->(e) WHERE (wo)-[:DIAGNOSED]->(fm)
MATCH p3 = (wo)-[:DIAGNOSED]->(fm)
MATCH p4 = (:Procedure)-[:RESOLVES]->(fm)
OPTIONAL MATCH p5 = (:Chunk)-[:MENTIONS]->(fm)
RETURN p, p2, p3, p4, p5;

// Q1 根拠（特定の作業報告まで）: 回答に出た WO の ID に置き換える
MATCH p = (e:Equipment {id: 'P-301'})-[*1..3]-(w:WorkOrder {id: 'WO-2026-012'})
RETURN p;

// Q2 根拠: 同型機横断
MATCH p = (e:Equipment {id: 'P-301'})-[:OF_MODEL]->(:Model)<-[:OF_MODEL]-(o:Equipment)
          <-[:ON_EQUIPMENT]-(wo:WorkOrder)-[:DIAGNOSED]->(:FailureMode {id: 'FM-001'})
MATCH p2 = (o)<-[:HAS_EQUIPMENT]-(:Line)
RETURN p, p2;

// Q3 根拠: 手順 → 部品 → サプライヤー、手順 ← 作業報告 → 技術者
MATCH p = (pr:Procedure {id: 'PR-001'})-[:REQUIRES_PART]->(:Part)-[:SUPPLIED_BY]->(:Supplier)
OPTIONAL MATCH p2 = (pr)<-[:PERFORMED]-(:WorkOrder)-[:PERFORMED_BY]->(:Technician)-[:ASSIGNED_TO]->(:Line)
RETURN p, p2;

// Q4 根拠: 直近1年のベアリング起因の作業報告と設備
MATCH p = (l:Line)-[:HAS_EQUIPMENT]->(e:Equipment)<-[:ON_EQUIPMENT]-(wo:WorkOrder)-[:DIAGNOSED]->(fm:FailureMode {category: 'bearing'})
WHERE wo.date >= date() - duration('P1Y')
RETURN p;
