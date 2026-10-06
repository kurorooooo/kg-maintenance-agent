"""スクリプト共通：.env の読み込みと Neo4j ドライバ生成。"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase

try:  # python.org 版 Python は OS のルート証明書を使わないため、Aura（neo4j+s://）の TLS 検証に certifi を使う
    import certifi

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except ImportError:
    pass

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "maintenance-demo")
DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
EMBED_MODEL = os.getenv("EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))


def driver():
    return GraphDatabase.driver(URI, auth=(USER, PASSWORD))
