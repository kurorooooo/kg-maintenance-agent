"""Tests that need neither Gemini credentials nor a database (read-only guard, JSON conversion, agent wiring)."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kg_agent import neo4j_client  # noqa: E402


@pytest.mark.parametrize("q", [
    "MATCH (e:Equipment {id:'P-301'}) RETURN e",
    "MATCH (wo:WorkOrder) WHERE wo.date >= date() - duration('P1Y') RETURN count(wo)",
    "CALL db.index.vector.queryNodes('chunk_embedding', 5, $vec) YIELD node RETURN node",
    "CALL db.index.fulltext.queryNodes('chunk_text', 'NU320') YIELD node RETURN node",
    "MATCH (n) RETURN n.name AS reset, n.set AS x",  # property names, not clauses
])
def test_read_only_allowed(q):
    assert neo4j_client.is_read_only(q)


@pytest.mark.parametrize("q", [
    "MATCH (n) SET n.x = 1 RETURN n",
    "CREATE (n:Foo) RETURN n",
    "MERGE (n:Foo {id:1})",
    "MATCH (n) DETACH DELETE n",
    "MATCH (n) REMOVE n.x",
    "DROP INDEX chunk_embedding",
    "CALL db.createLabel('x')",
    "CALL apoc.refactor.rename.label('A','B')",
    "CALL dbms.components()",
    "LOAD CSV FROM 'file:///x.csv' AS row RETURN row",
])
def test_write_rejected(q):
    assert not neo4j_client.is_read_only(q)
    with pytest.raises(ValueError):
        neo4j_client.run_read(q)


def test_to_json_dates():
    from neo4j.time import Date

    assert neo4j_client.to_json({"d": Date(2026, 10, 6), "l": [Date(2025, 1, 1)]}) == {"d": "2026-10-06", "l": ["2025-01-01"]}


def test_agent_wiring():
    from kg_agent.agent import root_agent

    names = {t.__name__ if callable(t) else t.name for t in root_agent.tools}
    assert names == {"search_manual", "search_manual_keyword", "read_neo4j_cypher"}
    assert "No record" in root_agent.instruction(None)
