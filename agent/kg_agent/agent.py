"""Root ADK agent: Gemini + three read-only tools over the maintenance knowledge graph."""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.adk.agents.readonly_context import ReadonlyContext
from google.genai import types

from .prompt import INSTRUCTION
from .tools import TOOLS

AGENT_MODEL = os.getenv("AGENT_MODEL", "gemini-3.8-flash")


def instruction(_: ReadonlyContext) -> str:
    """Provider function: ADK then passes the text through verbatim instead of treating `{weight}`
    and `{qty}` in the schema description as session-state template variables."""
    return INSTRUCTION

root_agent = LlmAgent(
    name="kg_maintenance_agent",
    model=AGENT_MODEL,
    description="Answers equipment-maintenance questions for Plant A with evidence from a Neo4j knowledge graph and manuals.",
    instruction=instruction,
    tools=TOOLS,
    generate_content_config=types.GenerateContentConfig(temperature=0.2),
)
