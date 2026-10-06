"use client";

import { useState } from "react";
import type { ToolCall } from "@/lib/sse";
import type { Dict } from "@/lib/i18n";

function summary(t: ToolCall, dict: Dict): string {
  if (t.error) return t.error;
  if (t.rowCount !== undefined) return dict.rows(t.rowCount);
  if (t.hitCount !== undefined) return dict.hits(t.hitCount);
  return "";
}

function Step({ t, dict, now }: { t: ToolCall; dict: Dict; now: number }) {
  const [open, setOpen] = useState(false);
  const running = !t.endedAt;
  const secs = ((t.endedAt ?? now) - t.startedAt) / 1000;
  const label = (dict.tool as Record<string, string>)[t.name] ?? t.name;
  const query = typeof t.args.query === "string" ? t.args.query : JSON.stringify(t.args);
  const isCypher = t.name === "read_neo4j_cypher";
  return (
    <li className="relative pl-5">
      <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 ${running ? "border-signal bg-panel" : t.error ? "border-warn bg-warn" : "border-ok bg-ok"}`} />
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{label}</span>
        {!isCypher && <span className="truncate text-ink-2">“{query}”</span>}
        <span className="text-xs text-ink-3">
          {summary(t, dict)}
          {summary(t, dict) && " · "}
          {secs.toFixed(1)}
          {dict.seconds}
        </span>
        {isCypher && (
          <button onClick={() => setOpen((o) => !o)} className="text-xs text-signal hover:underline">
            {open ? "−" : "+"} {dict.cypher}
          </button>
        )}
      </div>
      {isCypher && open && <pre className="mt-1 max-h-48 overflow-auto rounded border border-rule bg-panel-2 p-2 text-[11.5px] leading-snug text-ink-2 whitespace-pre-wrap font-mono">{query}</pre>}
    </li>
  );
}

export function ToolTimeline({ tools, dict, now }: { tools: ToolCall[]; dict: Dict; now: number }) {
  if (tools.length === 0) return null;
  return (
    <ol className="space-y-1.5 border-l border-rule pl-3 text-[13px]">
      {tools.map((t) => (
        <Step key={t.id} t={t} dict={dict} now={now} />
      ))}
    </ol>
  );
}
