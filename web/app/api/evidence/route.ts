import { NextRequest } from "next/server";
import { extractIds } from "@/lib/ids";
import { collectSubgraph, readQuery } from "@/lib/neo4j";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CITED = `MATCH (n) WHERE n.id IN $ids RETURN n`;

// Connect every pair of cited nodes with shortest paths of at most 3 hops (Equipment→Model→Component→FailureMode).
// Intermediate nodes must be cited themselves or structural (Line/Model/Component/FailureMode), so the picture stays
// the evidence behind this answer rather than every record that happens to share a neighbour.
const PATHS = `
MATCH (a) WHERE a.id IN $ids
MATCH (b) WHERE b.id IN $ids AND elementId(a) < elementId(b)
MATCH p = allShortestPaths((a)-[*..3]-(b))
WHERE all(n IN nodes(p) WHERE n.id IN $ids OR n:Line OR n:Model OR n:Component OR n:FailureMode)
RETURN p ORDER BY length(p) LIMIT 300`;

/** Body: { text } → the sub-graph behind the IDs cited in an answer. */
export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text?: string };
  const ids = extractIds(text ?? "");
  if (ids.length === 0) return Response.json({ ids: [], nodes: [], rels: [] });
  try {
    const [cited, paths] = await Promise.all([readQuery(CITED, { ids }), readQuery(PATHS, { ids })]);
    const graph = collectSubgraph([...cited.map((r) => r.get("n")), ...paths.map((r) => r.get("p"))]);
    const found = new Set(graph.nodes.map((n) => n.id));
    return Response.json({ ids: ids.filter((id) => found.has(id)), ...graph });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
