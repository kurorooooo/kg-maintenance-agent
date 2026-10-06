"use client";

import type { GraphNode } from "@/lib/neo4j";
import { colorFor } from "@/lib/graph-style";
import type { Dict, Locale } from "@/lib/i18n";

const ORDER = ["id", "name", "nameEn", "date", "category", "severity", "partNo", "stockQty", "leadTimeDays", "durationMin", "requiredCert", "cert", "yearsExp", "downtimeMin", "shift", "source", "section", "page", "text", "note", "summary", "description"];

export function NodePanel({ node, locale, dict, onClose }: { node: GraphNode; locale: Locale; dict: Dict; onClose: () => void }) {
  const entries = Object.entries(node.props)
    .filter(([k, v]) => v !== null && v !== undefined && v !== "" && k !== "modelId")
    .sort(([a], [b]) => (ORDER.indexOf(a) === -1 ? 99 : ORDER.indexOf(a)) - (ORDER.indexOf(b) === -1 ? 99 : ORDER.indexOf(b)));
  const title = locale === "en" && typeof node.props.nameEn === "string" && node.props.nameEn ? String(node.props.nameEn) : String(node.props.name ?? node.id);
  return (
    <div className="border-t border-rule bg-panel">
      <div className="flex items-start gap-3 px-4 pt-3">
        <span className="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: colorFor(node.label) }} />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-3">{node.label}</div>
          <div className="truncate font-medium">{title}</div>
        </div>
        <button onClick={onClose} className="rounded px-2 py-1 text-xs text-ink-2 hover:bg-panel-2" aria-label={dict.close}>
          {dict.close}
        </button>
      </div>
      <dl className="grid max-h-56 grid-cols-[auto_1fr] gap-x-4 gap-y-1 overflow-y-auto px-4 py-3 text-[12.5px]">
        {entries.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-3">{k}</dt>
            <dd className="break-words text-ink">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
