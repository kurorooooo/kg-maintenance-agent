"""Generate the demo-video narration with Gemini TTS.

Reads the scene lines below (kept in sync with docs/submission/video_script.md), writes one WAV per scene to
movie/public/audio/, and movie/src/narration.json with the measured duration of each clip so the Remotion
composition can size scenes from the audio.

  python scripts/gen_narration.py            # only missing scenes
  python scripts/gen_narration.py --force    # regenerate all
"""
from __future__ import annotations

import json
import os
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT  # noqa: E402

from google import genai  # noqa: E402
from google.genai import types  # noqa: E402

OUT = ROOT / "movie" / "public" / "audio"
META = ROOT / "movie" / "src" / "narration.json"
MODEL = os.getenv("TTS_MODEL", "gemini-3.8-flash-tts")
VOICE = os.getenv("TTS_VOICE", "Kore")

SCENES: list[tuple[str, str]] = [
    ("title", "Plant A Maintenance Agent. An ontology-backed AI agent that supports field engineers on the factory floor, and answers with evidence you can trace on a graph. Built with Gemini, the Agent Development Kit and Neo4j on Google Cloud."),
    ("problem", "Night shift. A cooling pump on line three is vibrating, and the veteran who knows it is off duty. The answer exists, scattered across the equipment register, two years of work orders, the parts inventory and a forty-page manual. Document search alone cannot connect them."),
    ("approach", "We model the plant as an ontology: equipment, components, failure modes, symptoms, work orders, procedures, parts and people, connected in one knowledge graph. A vector search over the manuals finds where to start. The graph supplies the answer, ranked by history, down to the parts in stock and who is certified. Every ID in the answer is a node you can inspect."),
    ("demo_q1", "Let's ask. The agent searches the manual, then queries the graph once. Bearing inner ring wear is the most likely cause: six past cases on this pump, procedure P R zero zero one, cited from page one of the manual. Every ID is a chip. Click one, and the evidence graph lights up."),
    ("demo_q2", "A follow-up: did the same model fail this way on other lines? Document search cannot answer this, because those reports never mention P three zero one. The graph crosses through the model node: four cases on line one, one on line two."),
    ("demo_q3", "Then the next action: parts in stock, lead times, and the certified technicians on line three, with how many times each has done the job."),
    ("honesty", "And when there is no record, it says so. No invented work-order numbers."),
    ("technology", "Under the hood: a Google ADK agent on Cloud Run with three read-only tools, Gemini 3.8 Flash, Gemini embeddings in a Neo4j vector index, and a Next.js front end. In rehearsal, forty-five of forty-five reference questions were answered correctly, and the ADK hallucination check scored one point zero."),
    ("closing", "Unplanned downtime costs thousands of dollars an hour, and the know-how to prevent it is retiring with the veterans. This runs on the data every plant already has: registers, work orders and manuals, in Japanese or English. Try it at the link, and read the code on GitHub."),
]

# No style prefix: gemini-3.8-flash-tts reads any instruction text aloud.


def synthesize(client: genai.Client, text: str, path: Path) -> None:
    res = client.models.generate_content(
        model=MODEL,
        contents=text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE))),
        ),
    )
    part = res.candidates[0].content.parts[0].inline_data
    data, mime = part.data, part.mime_type or ""
    if mime.startswith("audio/wav") or data[:4] == b"RIFF":
        path.write_bytes(data)
    else:  # raw 16-bit PCM 24 kHz (audio/L16)
        with wave.open(str(path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(24000)
            w.writeframes(data)


def duration(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate()


def main() -> None:
    force = "--force" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    client = genai.Client()
    meta = []
    total = 0.0
    for name, text in SCENES:
        path = OUT / f"{name}.wav"
        if force or not path.exists():
            synthesize(client, text, path)
        d = duration(path)
        total += d
        meta.append({"scene": name, "file": f"audio/{name}.wav", "seconds": round(d, 2), "text": text})
        print(f"{name:12s} {d:5.1f}s")
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"total narration {total:.1f}s -> {META}")


if __name__ == "__main__":
    main()
