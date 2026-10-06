"""手順書をチャンク化して Gemini Embedding で埋め込み、Chunk ノードと MENTIONS を Neo4j に投入する。

埋め込みは agent/kg_agent/embeddings.py（エージェントの質問側と同じ関数）を使う。
モデルと次元は .env の EMBED_MODEL / EMBED_DIM。Vertex AI（ADC）または GOOGLE_API_KEY が必要。

使い方:
  python scripts/embed.py            # 投入
  python scripts/embed.py --dry-run  # Neo4j なしでチャンクと埋め込み次元だけ確認
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from chunking import build_chunks  # noqa: E402
from common import DATABASE, EMBED_MODEL, ROOT, driver  # noqa: E402

sys.path.insert(0, str(ROOT / "agent"))
from kg_agent.embeddings import embed_texts  # noqa: E402


def embed_passages(texts: list[str]) -> list[list[float]]:
    return embed_texts(texts, "RETRIEVAL_DOCUMENT")


def main() -> None:
    chunks = build_chunks()
    print(f"{len(chunks)} chunks from manuals/")
    vectors = embed_passages([f"{c.section}\n{c.text}" for c in chunks])
    dim = len(vectors[0])
    print(f"embedded with {EMBED_MODEL}: dim={dim}")

    if "--dry-run" in sys.argv:
        for c in chunks[:5]:
            print(f"  {c.id} p{c.page} [{c.section}] fm={c.mentions_failure_modes}")
        return

    rows = [
        {
            "id": c.id, "modelId": c.model_id, "source": c.source, "section": c.section,
            "page": c.page, "text": c.text, "embedding": v,
            "components": c.mentions_components, "failureModes": c.mentions_failure_modes,
        }
        for c, v in zip(chunks, vectors)
    ]
    with driver() as drv, drv.session(database=DATABASE) as s:
        s.run("MATCH (c:Chunk) DETACH DELETE c")
        # 次元が変わった場合に備えて索引を作り直す
        s.run("DROP INDEX chunk_embedding IF EXISTS")
        s.run(f"""
            CREATE VECTOR INDEX chunk_embedding IF NOT EXISTS
            FOR (c:Chunk) ON (c.embedding)
            OPTIONS {{indexConfig: {{`vector.dimensions`: {dim}, `vector.similarity_function`: 'cosine'}}}}
        """)
        s.run("""
            CREATE FULLTEXT INDEX chunk_text IF NOT EXISTS
            FOR (c:Chunk) ON EACH [c.text, c.section]
            OPTIONS {indexConfig: {`fulltext.analyzer`: 'cjk'}}
        """)
        summary = s.run("""
            UNWIND $rows AS r
            CREATE (c:Chunk {id: r.id})
            SET c.modelId = r.modelId, c.source = r.source, c.section = r.section,
                c.page = r.page, c.text = r.text
            WITH c, r
            CALL db.create.setNodeVectorProperty(c, 'embedding', r.embedding)
            WITH c, r
            MATCH (m:Model {id: r.modelId}) MERGE (c)-[:FROM_MODEL]->(m)
            WITH c, r
            UNWIND r.components AS cid
            MATCH (comp:Component {id: cid}) MERGE (c)-[:MENTIONS]->(comp)
            WITH DISTINCT c, r
            UNWIND r.failureModes AS fid
            MATCH (fm:FailureMode {id: fid}) MERGE (c)-[:MENTIONS]->(fm)
            RETURN count(DISTINCT c) AS chunks
        """, rows=rows).consume()
        s.run("CALL db.awaitIndexes(60)")
        c = summary.counters
        print(f"loaded: nodes+{c.nodes_created} rels+{c.relationships_created}")
        rec = s.run("""
            MATCH (c:Chunk) OPTIONAL MATCH (c)-[:MENTIONS]->(fm:FailureMode)
            RETURN count(DISTINCT c) AS chunks, count(DISTINCT fm) AS failureModesMentioned
        """).single()
        print(f"chunks={rec['chunks']} failureModesMentioned={rec['failureModesMentioned']}")


if __name__ == "__main__":
    main()
