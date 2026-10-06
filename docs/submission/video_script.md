# Demo video script (English, under 3:00)

Target 2:45. 1920×1080, 30 fps. Narration: Gemini TTS (gemini-3.8-flash-tts, voice Kore). Captions on screen repeat the key phrase of each line, not the whole narration.

Scene timing is driven by the narration audio: each scene lasts as long as its clip plus a short tail. Screen recordings are played at 2–3× where the agent is thinking, with a “×2.5” badge.

| # | Scene | Visual | Narration (TTS) | Target |
| --- | --- | --- | --- | --- |
| 1 | Title | Product name, one-line tagline, team | "Plant A Maintenance Agent. An AI assistant for factory maintenance that answers with evidence you can trace on a graph. Built with Gemini, the Agent Development Kit and Neo4j on Google Cloud." | 0:12 |
| 2 | Problem | Four scattered sources (equipment register, work orders, parts inventory, manual) with a night-shift clock | "Night shift. A cooling pump on line three is vibrating, and the veteran who knows it is off duty. The answer exists, but it is scattered across the equipment register, two years of work orders, the parts inventory and a forty-page manual. Document search alone cannot connect them." | 0:20 |
| 3 | Approach | Graph model animation: symptom → failure mode → work orders → procedure → parts → technician | "We connect those sources into one knowledge graph, and let Gemini walk it. A vector search over the manuals finds where to start. The graph supplies the answer: failure modes ranked by history, the procedure, parts in stock and who is certified. Every ID in the answer is a node you can inspect." | 0:22 |
| 4 | Demo Q1 | Screen recording: click the P-301 question; tool timeline (search manuals → query graph); answer streams; evidence graph appears | "Let's ask. The agent searches the manual, then queries the graph once. Thirty seconds later: bearing inner ring wear is the most likely cause, six past cases on this pump, procedure P R dash zero zero one, cited from page one of the manual. Every ID is a chip; click one and the evidence graph lights up." | 0:38 |
| 5 | Demo Q2 | Screen recording: follow-up "same model on other lines?"; graph shows P-301 → CP-200 ← P-101 | "A follow-up: did the same model fail the same way on other lines? Pure document search cannot answer this, because the other lines' reports never mention P-301. The graph crosses through the model node: four cases on line one, one on line two." | 0:24 |
| 6 | Demo Q3 | Screen recording: parts and technicians table | "Then the next action: parts in stock, lead times, and the certified technicians on line three, with how many times each has done the job." | 0:14 |
| 7 | Honesty | Screen recording: "Any bearing failures on P-302?" → "No record" | "And when there is no record, it says so. No invented work-order numbers." | 0:10 |
| 8 | Technology | Architecture diagram: Cloud Run ×2, ADK, Gemini 3.8 Flash, Vertex AI embeddings, AuraDB, Secret Manager, Scheduler; eval numbers | "Under the hood: a Google ADK agent on Cloud Run with three read-only tools, Gemini 3.8 Flash, Gemini embeddings in a Neo4j vector index, and a Next.js front end. In rehearsal, forty-five of forty-five reference questions were answered correctly, and the ADK hallucination check scores one point zero." | 0:25 |
| 9 | Impact & close | Stats: downtime, retiring experts, "4 weeks to your data"; URLs | "Unplanned downtime costs manufacturers thousands of dollars an hour, and the knowledge to prevent it is retiring. This runs on the data every plant already has: registers, work orders and manuals, in any language. Try it at the link, and read the code on GitHub." | 0:20 |

Total narration ≈ 2:45.

## Recording checklist (Playwright, production URL)

1. 1920×1080, English UI, fresh session.
2. Clip A: initial screen 3 s → click Q1 example → wait until "Answered in" → 4 s hold → click the WO chip in Evidence.
3. Clip B: click Q2 example (same session) → wait → hold 4 s.
4. Clip C: click Q3 example → wait → scroll the table into view → hold 4 s.
5. Clip D: "Start over" → click E1 example → wait → hold 4 s.
6. Export webm → mp4 (H.264) with ffmpeg; note the frame where each answer completes for the speed-up cut.
