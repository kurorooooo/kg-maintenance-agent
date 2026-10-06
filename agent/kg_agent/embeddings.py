"""Gemini Embedding wrapper shared by the agent (query side) and scripts/embed.py (document side).

Model and dimensionality come from env (EMBED_MODEL / EMBED_DIM). Vectors are L2-normalised because
truncated (MRL) Gemini embeddings are not normalised by the API and the Neo4j index uses cosine similarity.
"""
from __future__ import annotations

import math
import os

from google import genai
from google.genai import types

EMBED_MODEL = os.getenv("EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))
EMBED_BATCH = int(os.getenv("EMBED_BATCH", "16"))

_client: genai.Client | None = None


def client() -> genai.Client:
    """genai.Client() reads GOOGLE_GENAI_USE_VERTEXAI / GOOGLE_CLOUD_PROJECT / GOOGLE_CLOUD_LOCATION
    (Vertex AI with ADC) or GOOGLE_API_KEY (AI Studio) from the environment."""
    global _client
    if _client is None:
        _client = genai.Client()
    return _client


def _config(task_type: str) -> types.EmbedContentConfig:
    # gemini-embedding-2 has no task_type (task is expressed in the prompt instead)
    if EMBED_MODEL.startswith("gemini-embedding-2"):
        return types.EmbedContentConfig(output_dimensionality=EMBED_DIM)
    return types.EmbedContentConfig(task_type=task_type, output_dimensionality=EMBED_DIM)


def _normalise(v: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


def embed_texts(texts: list[str], task_type: str) -> list[list[float]]:
    """Embed many texts. task_type: RETRIEVAL_DOCUMENT for chunks, RETRIEVAL_QUERY for questions."""
    cfg = _config(task_type)
    out: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH):
        batch = texts[i:i + EMBED_BATCH]
        try:
            res = client().models.embed_content(model=EMBED_MODEL, contents=batch, config=cfg)
            out.extend(_normalise(e.values) for e in res.embeddings)
        except Exception:
            # Some model/endpoint combinations only accept one text per request
            for t in batch:
                res = client().models.embed_content(model=EMBED_MODEL, contents=t, config=cfg)
                out.extend(_normalise(e.values) for e in res.embeddings)
    return out


def embed_query(text: str) -> list[float]:
    return embed_texts([text], "RETRIEVAL_QUERY")[0]
