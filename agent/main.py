"""Cloud Run entrypoint: ADK FastAPI app (/run, /run_sse, sessions) plus /warmup.

/warmup runs `RETURN 1` on Neo4j so that a Cloud Scheduler ping keeps an AuraDB Free instance from pausing.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")
sys.path.insert(0, str(HERE))

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

from google.adk.cli.fast_api import get_fast_api_app  # noqa: E402

app = get_fast_api_app(
    agents_dir=str(HERE),
    web=os.getenv("ADK_WEB_UI", "false").lower() == "true",
    allow_origins=[o for o in os.getenv("ALLOW_ORIGINS", "*").split(",") if o],
)


@app.get("/warmup")
def warmup() -> dict:
    from kg_agent import neo4j_client

    try:
        ok = neo4j_client.ping()
    except Exception as e:  # report but keep the container alive
        return {"status": "degraded", "neo4j": str(e)[:200]}
    return {"status": "ok", "neo4j": ok, "model": os.getenv("AGENT_MODEL", "")}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
