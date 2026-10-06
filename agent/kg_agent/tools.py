"""ADK function tools: structured search (Cypher), semantic search and keyword search over manuals.

All three are read-only. The Cypher queries for manual search are ported from the previous MCP server
(mcp/search_manual/server.py) unchanged.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from . import neo4j_client
from .embeddings import embed_query

log = logging.getLogger("kg_agent.tools")

MAX_TOP_K = 10
MAX_ROWS = 50

VECTOR_QUERY = """
CALL db.index.vector.queryNodes('chunk_embedding', $k, $vec) YIELD node AS c, score
WHERE $modelId IS NULL OR c.modelId = $modelId
OPTIONAL MATCH (c)-[:MENTIONS]->(comp:Component)
OPTIONAL MATCH (c)-[:MENTIONS]->(fm:FailureMode)
RETURN c.id AS chunkId, score, c.source AS source, c.section AS section, c.page AS page,
       c.modelId AS modelId, c.text AS text,
       collect(DISTINCT {id: comp.id, name: comp.name, nameEn: comp.nameEn}) AS components,
       collect(DISTINCT {id: fm.id, name: fm.name, nameEn: fm.nameEn, category: fm.category}) AS failureModes
ORDER BY score DESC
LIMIT $top_k
"""

FULLTEXT_QUERY = """
CALL db.index.fulltext.queryNodes('chunk_text', $q) YIELD node AS c, score
WHERE $modelId IS NULL OR c.modelId = $modelId
OPTIONAL MATCH (c)-[:MENTIONS]->(comp:Component)
OPTIONAL MATCH (c)-[:MENTIONS]->(fm:FailureMode)
RETURN c.id AS chunkId, score, c.source AS source, c.section AS section, c.page AS page,
       c.modelId AS modelId, c.text AS text,
       collect(DISTINCT {id: comp.id, name: comp.name, nameEn: comp.nameEn}) AS components,
       collect(DISTINCT {id: fm.id, name: fm.name, nameEn: fm.nameEn, category: fm.category}) AS failureModes
ORDER BY score DESC
LIMIT $top_k
"""


def _clean(rows: list[dict]) -> list[dict]:
    for r in rows:
        r["components"] = [{k: v for k, v in x.items() if v is not None} for x in r["components"] if x.get("id")]
        r["failureModes"] = [{k: v for k, v in x.items() if v is not None} for x in r["failureModes"] if x.get("id")]
        r["score"] = round(float(r["score"]), 4)
    return rows


def read_neo4j_cypher(query: str) -> dict[str, Any]:
    """Run a READ-ONLY Cypher query against the equipment-maintenance knowledge graph.

    Use it to traverse structure (Equipment -> Model -> Component -> FailureMode, WorkOrder history,
    Procedure -> Part -> Supplier, Technician certifications) and for aggregations (counts, downtime).
    Write clauses (CREATE/MERGE/SET/DELETE...) are rejected. Returns at most 50 rows.

    Args:
        query: A complete Cypher query. Prefer one query that returns several facts at once.

    Returns:
        {"rows": [...], "rowCount": n} or {"error": "..."} when the query fails
        (fix the Cypher and retry at most twice).
    """
    t0 = time.perf_counter()
    try:
        rows = neo4j_client.run_read(query, limit=MAX_ROWS)
    except Exception as e:  # syntax errors are returned to the model so it can self-correct
        log.warning("cypher failed: %s", e)
        return {"error": str(e).splitlines()[0][:500]}
    log.info("cypher rows=%d ms=%.0f", len(rows), (time.perf_counter() - t0) * 1000)
    return {"rows": rows, "rowCount": len(rows)}


def search_manual(query: str, top_k: int = 5, model_id: str = "") -> dict[str, Any]:
    """Semantic search over the maintenance manuals (procedure documents).

    Embeds the query with Gemini Embedding and searches the Neo4j vector index over manual chunks.
    Each hit includes the chunk text, source document and page, and the Components / FailureModes the chunk
    mentions. Use it as the entry point when the question describes symptoms in natural language
    (e.g. "cooling pump vibration getting worse"); then follow the returned failureModes in the graph.
    Cite chunkId, source and page as evidence.

    Args:
        query: Symptom or topic text, in Japanese or English.
        top_k: Number of chunks to return (1-10).
        model_id: Optional equipment model id to filter by (e.g. "CP-200"). Empty string means no filter.
    """
    top_k = max(1, min(int(top_k), MAX_TOP_K))
    model = model_id or None
    t0 = time.perf_counter()
    vec = embed_query(query)
    rows = neo4j_client.run_read(VECTOR_QUERY, {"k": top_k * 3, "vec": vec, "modelId": model, "top_k": top_k}, limit=top_k)
    log.info("search_manual hits=%d ms=%.0f", len(rows), (time.perf_counter() - t0) * 1000)
    return {"hits": _clean(rows)}


def search_manual_keyword(query: str, top_k: int = 5, model_id: str = "") -> dict[str, Any]:
    """Full-text keyword search over the maintenance manuals.

    Use it for exact tokens such as part numbers or model names (e.g. "6306ZZ", "NU320") where semantic
    search is unreliable. Returns the same shape as search_manual.

    Args:
        query: Keyword(s). Lucene syntax is accepted.
        top_k: Number of chunks to return (1-10).
        model_id: Optional equipment model id filter. Empty string means no filter.
    """
    top_k = max(1, min(int(top_k), MAX_TOP_K))
    model = model_id or None
    rows = neo4j_client.run_read(FULLTEXT_QUERY, {"q": query, "modelId": model, "top_k": top_k}, limit=top_k)
    return {"hits": _clean(rows)}


TOOLS = [search_manual, search_manual_keyword, read_neo4j_cypher]
