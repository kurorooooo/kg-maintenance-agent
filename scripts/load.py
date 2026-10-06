"""CSV を Neo4j に投入する（冪等。MERGE ベース）。

使い方:
  python scripts/load.py            # 制約・インデックス作成 + 全 CSV 投入
  python scripts/load.py --reset    # 既存データを全削除してから投入
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATABASE, ROOT, driver  # noqa: E402

DATA = ROOT / "data"

SCHEMA = [
    "CREATE CONSTRAINT line_id IF NOT EXISTS FOR (n:Line) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT equipment_id IF NOT EXISTS FOR (n:Equipment) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT model_id IF NOT EXISTS FOR (n:Model) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT component_id IF NOT EXISTS FOR (n:Component) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT part_id IF NOT EXISTS FOR (n:Part) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT failuremode_id IF NOT EXISTS FOR (n:FailureMode) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT symptom_name IF NOT EXISTS FOR (n:Symptom) REQUIRE n.name IS UNIQUE",
    "CREATE CONSTRAINT symptom_id IF NOT EXISTS FOR (n:Symptom) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT workorder_id IF NOT EXISTS FOR (n:WorkOrder) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT procedure_id IF NOT EXISTS FOR (n:Procedure) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT technician_id IF NOT EXISTS FOR (n:Technician) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT supplier_id IF NOT EXISTS FOR (n:Supplier) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT chunk_id IF NOT EXISTS FOR (n:Chunk) REQUIRE n.id IS UNIQUE",
    "CREATE TEXT INDEX failuremode_name IF NOT EXISTS FOR (n:FailureMode) ON (n.name)",
    "CREATE TEXT INDEX equipment_name IF NOT EXISTS FOR (n:Equipment) ON (n.name)",
    "CREATE INDEX failuremode_category IF NOT EXISTS FOR (n:FailureMode) ON (n.category)",
    "CREATE INDEX workorder_date IF NOT EXISTS FOR (n:WorkOrder) ON (n.date)",
]

# (CSV ファイル, Cypher)。$rows に行の配列を渡す
LOADS: list[tuple[str, str]] = [
    ("lines.csv", """
        UNWIND $rows AS r
        MERGE (n:Line {id: r.id}) SET n.name = r.name, n.process = r.process
    """),
    ("models.csv", """
        UNWIND $rows AS r
        MERGE (n:Model {id: r.id}) SET n.name = r.name, n.category = r.category, n.maker = r.maker
    """),
    ("equipment.csv", """
        UNWIND $rows AS r
        MERGE (e:Equipment {id: r.id})
        SET e.name = r.name, e.installedYear = toInteger(r.installedYear), e.location = r.location
        WITH e, r
        MATCH (l:Line {id: r.lineId}) MERGE (l)-[:HAS_EQUIPMENT]->(e)
        WITH e, r
        MATCH (m:Model {id: r.modelId}) MERGE (e)-[:OF_MODEL]->(m)
    """),
    ("suppliers.csv", """
        UNWIND $rows AS r
        MERGE (n:Supplier {id: r.id})
        SET n.name = r.name, n.standardLeadTimeDays = toInteger(r.standardLeadTimeDays), n.contact = r.contact
    """),
    ("parts.csv", """
        UNWIND $rows AS r
        MERGE (p:Part {id: r.id})
        SET p.name = r.name, p.partNo = r.partNo, p.stockQty = toInteger(r.stockQty),
            p.leadTimeDays = toInteger(r.leadTimeDays), p.unitPrice = toInteger(r.unitPrice)
        WITH p, r
        MATCH (s:Supplier {id: r.supplierId}) MERGE (p)-[:SUPPLIED_BY]->(s)
    """),
    ("components.csv", """
        UNWIND $rows AS r
        MERGE (c:Component {id: r.id})
        SET c.name = r.name, c.position = r.position, c.replaceCycleMonths = toInteger(r.replaceCycleMonths)
        WITH c, r
        MATCH (m:Model {id: r.modelId}) MERGE (m)-[:HAS_COMPONENT]->(c)
        WITH c, r
        MATCH (p:Part {id: r.partId}) MERGE (c)-[:USES_PART]->(p)
    """),
    ("symptoms.csv", """
        UNWIND $rows AS r
        MERGE (n:Symptom {id: r.id}) SET n.name = r.name
    """),
    ("failure_modes.csv", """
        UNWIND $rows AS r
        MERGE (f:FailureMode {id: r.id})
        SET f.name = r.name, f.category = r.category, f.severity = r.severity, f.description = r.description
        WITH f, r
        MATCH (c:Component {id: r.componentId}) MERGE (c)-[:HAS_FAILURE_MODE]->(f)
    """),
    ("failure_mode_symptoms.csv", """
        UNWIND $rows AS r
        MATCH (f:FailureMode {id: r.failureModeId}), (s:Symptom {id: r.symptomId})
        MERGE (f)-[rel:HAS_SYMPTOM]->(s) SET rel.weight = toFloat(r.weight)
    """),
    ("procedures.csv", """
        UNWIND $rows AS r
        MERGE (p:Procedure {id: r.id})
        SET p.name = r.name, p.durationMin = toInteger(r.durationMin),
            p.requiredCert = CASE WHEN r.requiredCert = '' THEN null ELSE r.requiredCert END,
            p.summary = r.summary
        WITH p, r
        MATCH (f:FailureMode {id: r.failureModeId}) MERGE (p)-[:RESOLVES]->(f)
    """),
    ("procedure_parts.csv", """
        UNWIND $rows AS r
        MATCH (p:Procedure {id: r.procedureId}), (pt:Part {id: r.partId})
        MERGE (p)-[rel:REQUIRES_PART]->(pt) SET rel.qty = toInteger(r.qty)
    """),
    ("technicians.csv", """
        UNWIND $rows AS r
        MERGE (t:Technician {id: r.id})
        SET t.name = r.name, t.yearsExp = toInteger(r.yearsExp), t.note = r.note,
            t.cert = [c IN split(r.cert, ';') WHERE c <> '']
        WITH t, r
        MATCH (l:Line {id: r.lineId}) MERGE (t)-[:ASSIGNED_TO]->(l)
    """),
    ("workorders.csv", """
        UNWIND $rows AS r
        MERGE (w:WorkOrder {id: r.id})
        SET w.date = date(r.date), w.downtimeMin = toInteger(r.downtimeMin), w.shift = r.shift, w.note = r.note
        WITH w, r
        MATCH (e:Equipment {id: r.equipmentId}) MERGE (w)-[:ON_EQUIPMENT]->(e)
        WITH w, r
        MATCH (f:FailureMode {id: r.failureModeId}) MERGE (w)-[:DIAGNOSED]->(f)
        WITH w, r
        MATCH (p:Procedure {id: r.procedureId}) MERGE (w)-[:PERFORMED]->(p)
        WITH w, r
        MATCH (t:Technician {id: r.technicianId}) MERGE (w)-[:PERFORMED_BY]->(t)
        WITH w, r
        UNWIND split(r.symptomIds, ';') AS sid
        MATCH (s:Symptom {id: sid}) MERGE (w)-[:REPORTED_SYMPTOM]->(s)
    """),
]


def read_rows(name: str) -> list[dict]:
    with open(DATA / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def main() -> None:
    reset = "--reset" in sys.argv
    with driver() as drv:
        drv.verify_connectivity()
        with drv.session(database=DATABASE) as s:
            if reset:
                s.run("MATCH (n) DETACH DELETE n")
                print("reset: all nodes deleted")
            for stmt in SCHEMA:
                s.run(stmt)
            print(f"schema: {len(SCHEMA)} constraints/indexes ensured")
            for fname, cypher in LOADS:
                rows = read_rows(fname)
                summary = s.run(cypher, rows=rows).consume()
                c = summary.counters
                print(f"{fname:28s} rows={len(rows):3d} nodes+{c.nodes_created:3d} rels+{c.relationships_created:3d}")
            counts = s.run("""
                MATCH (n) WITH count(n) AS nodes
                MATCH ()-[r]->() RETURN nodes, count(r) AS rels
            """).single()
            print(f"total: {counts['nodes']} nodes, {counts['rels']} relationships")


if __name__ == "__main__":
    main()
