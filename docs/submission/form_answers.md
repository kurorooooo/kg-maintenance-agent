# Submission form drafts (English)

## Project name
Plant A Maintenance Agent

## Tagline (≤ 120 chars)
An ontology-backed AI agent for field engineers that answers maintenance questions with evidence you can trace on a graph.

## Problem statement category
Manufacturing

## Short description (≈ 100 words)
When a machine fails on the night shift, the facts needed to decide are scattered across the equipment register, two years of work orders, the parts inventory and a 40-page manual, and the veteran who connects them is off duty or retiring. Plant A Maintenance Agent models the plant as an ontology in a Neo4j knowledge graph and lets a Gemini agent, built with the Agent Development Kit, walk it through read-only tools. Every answer cites work-order IDs, procedure IDs and manual pages, and the web app draws the evidence as a sub-graph. It runs on the data every plant already has, in Japanese or English.

## Long description (≈ 250 words)
Field engineers lose hours on every unplanned stop because the information they need lives in four systems and in one person's head. Document search (RAG) finds similar text but cannot answer the questions that matter on the floor: did the same model fail this way on another line, which machines had the most bearing-related stops this year, who is certified to do the repair and are the parts in stock.

We built Plant A, a synthetic factory with 3 lines, 12 machines, 25 failure modes, 25 procedures, 80 work orders and 5 manuals, and modelled it as an ontology: 12 node types and 17 relationships with the failure mode as the hub. Manuals are chunked and embedded with gemini-embedding-001 into a Neo4j vector index and linked to the components and failure modes they mention.

The agent is a Google ADK LlmAgent on Cloud Run using Gemini 3.8 Flash with three read-only tools: semantic manual search, keyword search and Cypher. Vector search chooses where to start; the graph supplies the ranked answer, the procedure, parts with stock and lead times, and certified technicians. Write clauses are rejected before execution and the agent answers "no record" when the graph has nothing. A Next.js front end on Cloud Run streams the tool calls, renders every cited ID as a chip and draws the evidence sub-graph.

In rehearsal, 45 of 45 reference answers were correct across diagnosis, cross-line, aggregation, parts-and-people and "no record" questions; the ADK hallucination metric scored 1.0 and the median answer takes about 20 seconds. The same pipeline runs on a plant's own registers, work orders and manuals in four weeks.

## Google Cloud / AI technologies used
Gemini 3.8 Flash (Vertex AI), gemini-embedding-001 (Vertex AI), Agent Development Kit (ADK) incl. `adk eval`, Cloud Run (2 services), Cloud Build, Artifact Registry, Secret Manager, Cloud Scheduler, Cloud Logging. Neo4j AuraDB Free on Google Cloud.

## Links
- Live app: https://kg-web-7ikzkb2evq-an.a.run.app
- GitHub: https://github.com/kurorooooo/kg-maintenance-agent
- Demo video (YouTube, unlisted): (to be added)
- Deck (PDF): docs/pitch_deck.pdf

## Team
Kakeru Kurosawa (product & engineering), Junichi Fujioka (manufacturing & impact), Kotaro Fukuo (software engineering)
