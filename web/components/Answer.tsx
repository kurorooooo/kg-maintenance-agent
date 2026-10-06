"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { linkIds } from "@/lib/ids";
import { colorFor } from "@/lib/graph-style";
import type { GraphNode } from "@/lib/neo4j";

// The model sometimes writes <br> inside table cells; allow that one tag and strip everything else.
const sanitizeSchema = { ...defaultSchema, tagNames: [...(defaultSchema.tagNames ?? []), "br"] };

export function Answer({ text, nodes, onFocus }: { text: string; nodes?: GraphNode[]; onFocus: (id: string) => void }) {
  const byId = useMemo(() => new Map((nodes ?? []).map((n) => [n.id, n])), [nodes]);
  const md = useMemo(() => linkIds(text, new Set(byId.keys())), [text, byId]);
  return (
    <div className="answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#id:")) {
              const id = href.slice(4);
              const node = byId.get(id);
              return (
                <button
                  type="button"
                  onClick={() => onFocus(id)}
                  className="mx-0.5 inline-flex items-center gap-1 rounded border border-rule bg-panel px-1.5 py-px align-baseline font-mono text-[12px] leading-tight hover:border-rule-strong hover:bg-panel-2"
                  title={node ? `${node.label}: ${String(node.props.name ?? "")}` : id}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: node ? colorFor(node.label) : "var(--ink-3)" }} />
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-signal underline">
                {children}
              </a>
            );
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
