/** Client-side model of a conversation turn, built from ADK /run_sse events. */
import type { Subgraph } from "@/lib/neo4j";

export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  startedAt: number;
  endedAt?: number;
  rowCount?: number;
  hitCount?: number;
  error?: string;
};

export type Turn = {
  id: string;
  question: string;
  text: string;
  tools: ToolCall[];
  status: "running" | "done" | "error";
  startedAt: number;
  endedAt?: number;
  error?: string;
  evidence?: Subgraph & { ids: string[] };
};

type Part = {
  text?: string;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response?: Record<string, unknown> };
};
type AdkEvent = { partial?: boolean; timestamp?: number; content?: { parts?: Part[] }; errorMessage?: string };

/** Apply one event to a turn. Partial text accumulates; the final non-partial event replaces it. */
export function applyEvent(turn: Turn, ev: AdkEvent): Turn {
  const next: Turn = { ...turn, tools: [...turn.tools] };
  const ts = (ev.timestamp ?? Date.now() / 1000) * 1000;
  if (ev.errorMessage) {
    next.status = "error";
    next.error = ev.errorMessage;
  }
  let fullText = "";
  for (const p of ev.content?.parts ?? []) {
    if (p.functionCall) {
      const fc = p.functionCall;
      const id = fc.id ?? `${fc.name}-${next.tools.length}`;
      if (!next.tools.some((t) => t.id === id)) next.tools.push({ id, name: fc.name, args: fc.args ?? {}, startedAt: ts });
    } else if (p.functionResponse) {
      const fr = p.functionResponse;
      const i = next.tools.findIndex((t) => (fr.id ? t.id === fr.id : t.name === fr.name && !t.endedAt));
      if (i >= 0) {
        const r = fr.response ?? {};
        const hits = Array.isArray(r.hits) ? (r.hits as unknown[]).length : undefined;
        next.tools[i] = {
          ...next.tools[i],
          endedAt: ts,
          rowCount: typeof r.rowCount === "number" ? r.rowCount : undefined,
          hitCount: hits,
          error: typeof r.error === "string" ? r.error : undefined,
        };
      }
    } else if (typeof p.text === "string") {
      if (ev.partial) next.text += p.text;
      else fullText += p.text;
    }
  }
  if (!ev.partial && fullText.length > 0) next.text = fullText;
  return next;
}

/** Read an SSE body and call onEvent for each `data:` JSON payload. */
export async function readSse(body: ReadableStream<Uint8Array>, onEvent: (ev: AdkEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          onEvent(JSON.parse(payload));
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
}
