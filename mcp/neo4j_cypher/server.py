"""mcp-neo4j-cypher を読み取り専用で起動するラッパー。

Claude Desktop から .venv/bin/mcp-neo4j-cypher（シェバン経由）を起動すると macOS の権限エラーで
落ちることがあるため、search_manual と同じく python を直接起動する形にする。
接続情報は環境変数（NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD / NEO4J_DATABASE）か .env から取る。
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from common import DATABASE, PASSWORD, URI, USER  # noqa: E402  (.env を読み込む)

os.environ.setdefault("NEO4J_URI", URI)
os.environ.setdefault("NEO4J_USERNAME", USER)
os.environ.setdefault("NEO4J_PASSWORD", PASSWORD)
os.environ.setdefault("NEO4J_DATABASE", DATABASE)
os.environ.setdefault("NEO4J_READ_ONLY", "true")
os.environ.setdefault("NEO4J_TRANSPORT", "stdio")

from mcp_neo4j_cypher import main  # noqa: E402

if __name__ == "__main__":
    sys.argv = [sys.argv[0], "--transport", "stdio", "--read-only"]
    main()
