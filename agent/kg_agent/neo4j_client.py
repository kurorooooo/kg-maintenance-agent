"""Read-only Neo4j access for the agent tools."""
from __future__ import annotations

import os
import re
from datetime import date, datetime, time
from typing import Any

import neo4j
from neo4j import GraphDatabase, unit_of_work

try:  # local macOS python.org builds lack system root certs; harmless on Cloud Run
    import certifi

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except ImportError:
    pass
from neo4j.time import Date, DateTime, Duration, Time

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "maintenance-demo")
DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
QUERY_TIMEOUT_S = float(os.getenv("CYPHER_TIMEOUT_S", "20"))  # a slow model-written query fails fast and gets rewritten

_driver: neo4j.Driver | None = None

# Anything that can mutate the graph or call non-read procedures is rejected before execution.
WRITE_PATTERN = re.compile(
    r"(?<![.\w`])(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|LOAD\s+CSV|FOREACH)\b"
    r"|\bCALL\s+(?!db\.index\.(vector|fulltext)\.queryNodes\b)(dbms|db\.|apoc\.(?!text\.))",
    re.IGNORECASE,
)


def driver() -> neo4j.Driver:
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    return _driver


def is_read_only(query: str) -> bool:
    return WRITE_PATTERN.search(query) is None


def to_json(v: Any) -> Any:
    """Convert neo4j driver values into JSON-serialisable Python values."""
    if isinstance(v, (Date, DateTime, Time, date, datetime, time)):
        return v.iso_format() if hasattr(v, "iso_format") else v.isoformat()
    if isinstance(v, Duration):
        return str(v)
    if isinstance(v, neo4j.graph.Node):
        return {"_id": v.element_id, "labels": list(v.labels), **{k: to_json(x) for k, x in v.items()}}
    if isinstance(v, neo4j.graph.Relationship):
        return {"_id": v.element_id, "type": v.type, "start": v.start_node.element_id,
                "end": v.end_node.element_id, **{k: to_json(x) for k, x in v.items()}}
    if isinstance(v, neo4j.graph.Path):
        return {"nodes": [to_json(n) for n in v.nodes], "relationships": [to_json(r) for r in v.relationships]}
    if isinstance(v, dict):
        return {k: to_json(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [to_json(x) for x in v]
    return v


def run_read(query: str, params: dict | None = None, limit: int = 50) -> list[dict]:
    """Execute a read-only Cypher query inside a read transaction and return up to `limit` rows."""
    if not is_read_only(query):
        raise ValueError("Only read-only Cypher is allowed (no CREATE/MERGE/DELETE/SET/REMOVE/DROP/CALL procedures).")

    @unit_of_work(timeout=QUERY_TIMEOUT_S)
    def work(tx):
        result = tx.run(query, **(params or {}))
        return [to_json(r.data()) for _, r in zip(range(limit), result)]

    with driver().session(database=DATABASE, default_access_mode=neo4j.READ_ACCESS) as s:
        return s.execute_read(work)


def ping() -> bool:
    with driver().session(database=DATABASE) as s:
        return s.run("RETURN 1 AS ok").single()["ok"] == 1
