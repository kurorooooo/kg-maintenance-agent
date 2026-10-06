"""search_manual MCP サーバー（FastMCP, stdio）。

質問文を multilingual-e5-small で埋め込み、Neo4j のベクトル索引で手順書チャンクを検索し、
チャンクが MENTIONS する部品・故障モードを併せて返す。読み取り Cypher のみ実行する。
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
# モデルは scripts/embed.py 実行時にキャッシュ済み。デモ会場で Hugging Face に接続しないようオフラインで読む
os.environ.setdefault("HF_HUB_OFFLINE", "1")

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from common import DATABASE, EMBED_MODEL, driver  # noqa: E402
from mcp.server.fastmcp import FastMCP  # noqa: E402

# stdio トランスポートでは stdout をプロトコルに使うため、ログは stderr へ
logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("search_manual")

mcp = FastMCP("search_manual")
_model = None
_driver = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        log.info("loading %s", EMBED_MODEL)
        _model = SentenceTransformer(EMBED_MODEL)
    return _model


def get_driver():
    global _driver
    if _driver is None:
        _driver = driver()
    return _driver


VECTOR_QUERY = """
CALL db.index.vector.queryNodes('chunk_embedding', $k, $vec) YIELD node AS c, score
WHERE $modelId IS NULL OR c.modelId = $modelId
OPTIONAL MATCH (c)-[:MENTIONS]->(comp:Component)
OPTIONAL MATCH (c)-[:MENTIONS]->(fm:FailureMode)
RETURN c.id AS chunkId, score, c.source AS source, c.section AS section, c.page AS page,
       c.modelId AS modelId, c.text AS text,
       collect(DISTINCT {id: comp.id, name: comp.name}) AS components,
       collect(DISTINCT {id: fm.id, name: fm.name, category: fm.category}) AS failureModes
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
       collect(DISTINCT {id: comp.id, name: comp.name}) AS components,
       collect(DISTINCT {id: fm.id, name: fm.name, category: fm.category}) AS failureModes
ORDER BY score DESC
LIMIT $top_k
"""


def _clean(rows: list[dict]) -> list[dict]:
    for r in rows:
        r["components"] = [x for x in r["components"] if x.get("id")]
        r["failureModes"] = [x for x in r["failureModes"] if x.get("id")]
        r["score"] = round(float(r["score"]), 4)
    return rows


@mcp.tool()
def search_manual(query: str, top_k: int = 5, model_id: str | None = None) -> list[dict[str, Any]]:
    """手順書（保全マニュアル）を意味検索し、該当チャンクと、そのチャンクが言及する部品・故障モードを返す。

    症状や設備の状況（例: "冷却ポンプ 振動増大 異音"）を query に渡す。設備の型式が分かっていれば
    model_id（例: "CP-200"）で絞り込む。戻り値の chunkId / source / page は回答の根拠として引用する。
    failureModes は次に Cypher で WorkOrder や Procedure を辿る起点に使う。
    """
    top_k = max(1, min(int(top_k), 10))
    vec = get_model().encode(f"query: {query}", normalize_embeddings=True, show_progress_bar=False).tolist()
    with get_driver().session(database=DATABASE) as s:
        rows = [r.data() for r in s.run(VECTOR_QUERY, k=top_k * 3, vec=vec, modelId=model_id, top_k=top_k)]
    return _clean(rows)


@mcp.tool()
def search_manual_keyword(query: str, top_k: int = 5, model_id: str | None = None) -> list[dict[str, Any]]:
    """手順書を全文検索（キーワード一致）する。型番や固有名（例: "6306ZZ"、"NU320"）を探すときに使う。"""
    top_k = max(1, min(int(top_k), 10))
    with get_driver().session(database=DATABASE) as s:
        rows = [r.data() for r in s.run(FULLTEXT_QUERY, q=query, modelId=model_id, top_k=top_k)]
    return _clean(rows)


if __name__ == "__main__":
    # 起動時にモデルを先読みし、最初の質問で 7〜8 秒待たせない（Claude Desktop はアプリ起動時にサーバーを立てる）
    import threading

    threading.Thread(target=get_model, daemon=True).start()
    mcp.run(transport="stdio")
