import { NextRequest } from "next/server";
import { collectSubgraph, readQuery } from "@/lib/neo4j";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The night-shift pump and everything one story away from it: line, model, components, failure modes, work orders.
const OVERVIEW = `
MATCH (e:Equipment {id: $id})
OPTIONAL MATCH p1 = (e)<-[:HAS_EQUIPMENT]-(:Line)
OPTIONAL MATCH p2 = (e)-[:OF_MODEL]->(:Model)-[:HAS_COMPONENT]->(:Component)-[:HAS_FAILURE_MODE]->(:FailureMode)
OPTIONAL MATCH p3 = (e)<-[:ON_EQUIPMENT]-(:WorkOrder)
RETURN e, p1, p2, p3`;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "P-301";
  try {
    const records = await readQuery(OVERVIEW, { id });
    const graph = collectSubgraph(records.flatMap((r) => [r.get("e"), r.get("p1"), r.get("p2"), r.get("p3")]));
    return Response.json({ id, ...graph });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
