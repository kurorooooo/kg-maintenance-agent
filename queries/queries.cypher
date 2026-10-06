// 代表質問4本の手書き Cypher。scripts/verify.py が同じクエリを実行して期待値と照合する。
// システムプロンプト（docs/prompt.md）にもクエリ例として転載する。

// ---------------------------------------------------------------
// Q1: 3号ラインの冷却ポンプ P-301 で振動が上がっている。考えられる原因と過去の対処は？
// パス: Equipment → Model → Component → FailureMode → Symptom{振動増大}
//       FailureMode ← WorkOrder → Equipment（過去事例）, Procedure → FailureMode
// ---------------------------------------------------------------
MATCH (e:Equipment {id: 'P-301'})-[:OF_MODEL]->(m:Model)-[:HAS_COMPONENT]->(c:Component)
      -[:HAS_FAILURE_MODE]->(fm:FailureMode)-[hs:HAS_SYMPTOM]->(s:Symptom {name: '振動増大'})
OPTIONAL MATCH (wo:WorkOrder)-[:ON_EQUIPMENT]->(e) WHERE (wo)-[:DIAGNOSED]->(fm)
OPTIONAL MATCH (p:Procedure)-[:RESOLVES]->(fm)
WITH fm, c, hs.weight AS symptomWeight, p,
     collect(DISTINCT wo) AS wos
RETURN fm.id AS failureModeId, fm.name AS failureMode, fm.severity AS severity,
       c.name AS component, symptomWeight,
       size(wos) AS pastCases,
       [w IN wos | w.id + ' (' + toString(w.date) + ')'] AS workOrders,
       p.id AS procedureId, p.name AS procedure, p.requiredCert AS requiredCert
ORDER BY pastCases DESC, symptomWeight DESC;

// ---------------------------------------------------------------
// Q2: 同じ型式のポンプで同じ症状（FM-001）が出た事例は他ラインにもある？
// パス: Equipment{P-301} → Model ← Equipment ← WorkOrder → FailureMode{FM-001}
// ---------------------------------------------------------------
MATCH (e:Equipment {id: 'P-301'})-[:OF_MODEL]->(m:Model)<-[:OF_MODEL]-(other:Equipment)
      <-[:ON_EQUIPMENT]-(wo:WorkOrder)-[:DIAGNOSED]->(fm:FailureMode {id: 'FM-001'})
MATCH (other)<-[:HAS_EQUIPMENT]-(l:Line)
WHERE other <> e
RETURN other.id AS equipmentId, other.name AS equipment, l.name AS line, m.id AS model,
       count(wo) AS cases,
       collect(wo.id + ' (' + toString(wo.date) + ')') AS workOrders
ORDER BY cases DESC;

// ---------------------------------------------------------------
// Q3a: その対処（PR-001）に必要な部品の在庫と納期
// パス: Procedure → Part → Supplier
// ---------------------------------------------------------------
MATCH (p:Procedure {id: 'PR-001'})-[r:REQUIRES_PART]->(pt:Part)-[:SUPPLIED_BY]->(s:Supplier)
RETURN pt.id AS partId, pt.name AS part, pt.partNo AS partNo, r.qty AS requiredQty,
       pt.stockQty AS stockQty, pt.leadTimeDays AS leadTimeDays, s.name AS supplier, s.contact AS contact,
       CASE WHEN pt.stockQty >= r.qty THEN '在庫あり' ELSE '発注要' END AS availability
ORDER BY pt.leadTimeDays DESC;

// ---------------------------------------------------------------
// Q3b: 対応できる技術者（資格保有者と PR-001 の実施実績）
// パス: Procedure.requiredCert IN Technician.cert, Technician ← WorkOrder → Procedure
// ---------------------------------------------------------------
MATCH (p:Procedure {id: 'PR-001'})
MATCH (t:Technician)-[:ASSIGNED_TO]->(l:Line)
WHERE p.requiredCert IS NULL OR p.requiredCert IN t.cert
OPTIONAL MATCH (t)<-[:PERFORMED_BY]-(wo:WorkOrder)-[:PERFORMED]->(p)
RETURN t.id AS technicianId, t.name AS technician, l.name AS line, t.cert AS certs,
       t.yearsExp AS yearsExp, count(wo) AS timesPerformed,
       collect(wo.id)[..3] AS recentWorkOrders, t.note AS note
ORDER BY timesPerformed DESC;

// ---------------------------------------------------------------
// Q4: 直近1年でベアリング起因の停止が多い設備はどこ？
// パス: FailureMode{category:bearing} ← WorkOrder → Equipment を集計
// ---------------------------------------------------------------
MATCH (wo:WorkOrder)-[:DIAGNOSED]->(fm:FailureMode {category: 'bearing'}),
      (wo)-[:ON_EQUIPMENT]->(e:Equipment)<-[:HAS_EQUIPMENT]-(l:Line)
WHERE wo.date >= date() - duration('P1Y')
RETURN e.id AS equipmentId, e.name AS equipment, l.name AS line,
       count(wo) AS stops, sum(wo.downtimeMin) AS downtimeMin,
       collect(DISTINCT fm.name) AS failureModes,
       collect(wo.id) AS workOrders
ORDER BY stops DESC, downtimeMin DESC;
