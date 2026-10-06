import neo4j, { Driver, Node, Path, Relationship, isInt, isDate, isDateTime, isLocalDateTime } from "neo4j-driver";

let driver: Driver | undefined;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI ?? "bolt://localhost:7687",
      neo4j.auth.basic(process.env.NEO4J_USERNAME ?? "neo4j", process.env.NEO4J_PASSWORD ?? "maintenance-demo"),
    );
  }
  return driver;
}

/** Run a read-only query and return plain records. */
export async function readQuery(cypher: string, params: Record<string, unknown> = {}) {
  const session = getDriver().session({
    database: process.env.NEO4J_DATABASE ?? "neo4j",
    defaultAccessMode: neo4j.session.READ,
  });
  try {
    const res = await session.executeRead((tx) => tx.run(cypher, params));
    return res.records;
  } finally {
    await session.close();
  }
}

export type GraphNode = { key: string; id: string; label: string; props: Record<string, unknown> };
export type GraphRel = { key: string; type: string; from: string; to: string; props: Record<string, unknown> };
export type Subgraph = { nodes: GraphNode[]; rels: GraphRel[] };

const LABEL_PRIORITY = ["Line", "Equipment", "Model", "Component", "Part", "Supplier", "FailureMode", "Symptom", "WorkOrder", "Procedure", "Technician", "Chunk"];
const HIDDEN_PROPS = new Set(["embedding"]);

function plain(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (isInt(v)) return (v as { toNumber(): number }).toNumber();
  if (isDate(v) || isDateTime(v) || isLocalDateTime(v)) return String(v);
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, plain(x)]));
  return v;
}

export function toNode(n: Node): GraphNode {
  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(n.properties)) {
    if (HIDDEN_PROPS.has(k)) continue;
    props[k] = k === "text" && typeof v === "string" && v.length > 400 ? v.slice(0, 400) + "…" : plain(v);
  }
  const label = LABEL_PRIORITY.find((l) => n.labels.includes(l)) ?? n.labels[0] ?? "Node";
  return { key: n.elementId, id: String(props.id ?? n.elementId), label, props };
}

export function toRel(r: Relationship): GraphRel {
  return { key: r.elementId, type: r.type, from: r.startNodeElementId, to: r.endNodeElementId, props: plain(r.properties) as Record<string, unknown> };
}

/** Merge nodes, relationships and paths from query records into one de-duplicated subgraph. */
export function collectSubgraph(values: unknown[], maxNodes = 90): Subgraph {
  const nodes = new Map<string, GraphNode>();
  const rels = new Map<string, GraphRel>();
  const addNode = (n: Node) => {
    if (!nodes.has(n.elementId) && nodes.size < maxNodes) nodes.set(n.elementId, toNode(n));
  };
  const addRel = (r: Relationship) => {
    if (nodes.has(r.startNodeElementId) && nodes.has(r.endNodeElementId)) rels.set(r.elementId, toRel(r));
  };
  const visit = (v: unknown) => {
    if (v === null || v === undefined) return;
    if (v instanceof Node) addNode(v);
    else if (v instanceof Relationship) addRel(v);
    else if (v instanceof Path) {
      v.segments.forEach((s) => {
        addNode(s.start);
        addNode(s.end);
      });
      v.segments.forEach((s) => addRel(s.relationship));
    } else if (Array.isArray(v)) v.forEach(visit);
  };
  values.forEach(visit);
  return { nodes: [...nodes.values()], rels: [...rels.values()] };
}
