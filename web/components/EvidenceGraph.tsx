"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import type { GraphNode, GraphRel, Subgraph } from "@/lib/neo4j";
import { captionFor, colorFor } from "@/lib/graph-style";
import type { Locale } from "@/lib/i18n";

type SimNode = SimulationNodeDatum & GraphNode & { r: number };
type SimLink = SimulationLinkDatum<SimNode> & GraphRel;

const W = 900;
const H = 640;

function radiusFor(label: string) {
  switch (label) {
    case "Equipment":
    case "FailureMode":
      return 16;
    case "WorkOrder":
    case "Chunk":
      return 9;
    default:
      return 12;
  }
}

/** Lay the graph out once with d3-force (deterministic, no animation) and render it as SVG. */
function layout(graph: Subgraph): { nodes: SimNode[]; links: SimLink[] } {
  const nodes: SimNode[] = graph.nodes.map((n, i) => ({
    ...n,
    r: radiusFor(n.label),
    // seed positions on a ring so the result is stable between renders
    x: W / 2 + Math.cos((i / Math.max(graph.nodes.length, 1)) * Math.PI * 2) * 200,
    y: H / 2 + Math.sin((i / Math.max(graph.nodes.length, 1)) * Math.PI * 2) * 200,
  }));
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const links: SimLink[] = graph.rels
    .filter((r) => byKey.has(r.from) && byKey.has(r.to))
    .map((r) => ({ ...r, source: byKey.get(r.from)!, target: byKey.get(r.to)! }));
  const sim = forceSimulation(nodes)
    .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.key).distance(70).strength(0.6))
    .force("charge", forceManyBody().strength(-320))
    .force("collide", forceCollide<SimNode>().radius((d) => d.r + 22))
    .force("center", forceCenter(W / 2, H / 2))
    // keep isolated nodes near the cluster so the fitted view stays readable
    .force("x", forceX(W / 2).strength(0.06))
    .force("y", forceY(H / 2).strength(0.06))
    .stop();
  const steps = Math.min(400, 120 + nodes.length * 4);
  for (let i = 0; i < steps; i++) sim.tick();
  return { nodes, links };
}

export function EvidenceGraph({
  graph,
  locale,
  focusId,
  selectedKey,
  onSelect,
}: {
  graph: Subgraph;
  locale: Locale;
  focusId?: string;
  selectedKey?: string;
  onSelect: (node: GraphNode | undefined) => void;
}) {
  const { nodes, links } = useMemo(() => layout(graph), [graph]);
  const [hover, setHover] = useState<string | undefined>();
  const svgRef = useRef<SVGSVGElement>(null);

  // Fit the drawing to its bounding box with a margin.
  const viewBox = useMemo(() => {
    if (nodes.length === 0) return `0 0 ${W} ${H}`;
    const xs = nodes.map((n) => n.x ?? 0);
    const ys = nodes.map((n) => n.y ?? 0);
    const pad = 70;
    let minX = Math.min(...xs) - pad;
    let minY = Math.min(...ys) - pad;
    let w = Math.max(...xs) - minX + pad;
    let h = Math.max(...ys) - minY + pad;
    // never zoom in past this scale: a 7-node answer should not fill the panel with giant circles
    const MIN_W = 640;
    const MIN_H = 460;
    if (w < MIN_W) {
      minX -= (MIN_W - w) / 2;
      w = MIN_W;
    }
    if (h < MIN_H) {
      minY -= (MIN_H - h) / 2;
      h = MIN_H;
    }
    return `${minX} ${minY} ${w} ${h}`;
  }, [nodes]);

  // Pan & zoom (wheel + drag) on top of the fitted viewBox.
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  useEffect(() => setView({ k: 1, tx: 0, ty: 0 }), [viewBox]);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const focusKey = focusId ? nodes.find((n) => n.id === focusId)?.key : undefined;
  const active = selectedKey ?? focusKey ?? hover;
  const neighbours = useMemo(() => {
    const s = new Set<string>();
    if (!active) return s;
    for (const l of links) {
      const a = (l.source as SimNode).key;
      const b = (l.target as SimNode).key;
      if (a === active) s.add(b);
      if (b === active) s.add(a);
    }
    return s;
  }, [active, links]);
  const showEdgeLabels = links.length <= 18;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="h-full w-full select-none touch-none"
      role="img"
      aria-label="Evidence graph"
      onWheel={(e) => {
        const k = Math.min(4, Math.max(0.4, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
        setView((v) => ({ ...v, k }));
      }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const rect = svgRef.current?.getBoundingClientRect();
        const scale = rect ? parseFloat(viewBox.split(" ")[2]) / rect.width : 1;
        setView((v) => ({ ...v, tx: drag.current!.tx + (e.clientX - drag.current!.x) * scale, ty: drag.current!.ty + (e.clientY - drag.current!.y) * scale }));
      }}
      onPointerUp={() => (drag.current = null)}
      onClick={(e) => {
        if (e.target === svgRef.current) onSelect(undefined);
      }}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--rule-strong)" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-2)" />
        </marker>
      </defs>
      <g transform={`translate(${view.tx} ${view.ty})`}>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${view.k}) translate(${-W / 2} ${-H / 2})`}>
          {links.map((l) => {
            const s = l.source as SimNode;
            const t = l.target as SimNode;
            const dx = (t.x ?? 0) - (s.x ?? 0);
            const dy = (t.y ?? 0) - (s.y ?? 0);
            const len = Math.hypot(dx, dy) || 1;
            const x1 = (s.x ?? 0) + (dx / len) * (s.r + 2);
            const y1 = (s.y ?? 0) + (dy / len) * (s.r + 2);
            const x2 = (t.x ?? 0) - (dx / len) * (t.r + 3);
            const y2 = (t.y ?? 0) - (dy / len) * (t.r + 3);
            const isActive = active !== undefined && (s.key === active || t.key === active);
            const dim = active !== undefined && !isActive;
            return (
              <g key={l.key} opacity={dim ? 0.25 : 1}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isActive ? "var(--ink-2)" : "var(--rule-strong)"} strokeWidth={isActive ? 1.8 : 1.1} markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"} />
                {(showEdgeLabels || isActive) && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} fontSize={8.5} fill="var(--ink-3)" textAnchor="middle" style={{ fontFamily: "var(--font-mono)" }}>
                    {l.type}
                  </text>
                )}
              </g>
            );
          })}
          {nodes.map((n) => {
            const color = colorFor(n.label);
            const isActive = n.key === active;
            const near = neighbours.has(n.key);
            const dim = active !== undefined && !isActive && !near;
            const caption = captionFor(n.label, n.props, locale);
            return (
              <g
                key={n.key}
                transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                opacity={dim ? 0.3 : 1}
                className="cursor-pointer"
                onMouseEnter={() => setHover(n.key)}
                onMouseLeave={() => setHover(undefined)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(n);
                }}
              >
                {(n.key === focusKey || n.key === selectedKey) && <circle r={n.r + 4} fill="none" stroke={color} strokeWidth={2} className="pulse" />}
                <circle r={n.r} fill={color} stroke={isActive ? "var(--ink)" : "#fff"} strokeWidth={isActive ? 2.5 : 1.5} />
                <text y={n.r + 12} fontSize={10.5} textAnchor="middle" fill="var(--ink)" fontWeight={isActive ? 600 : 400} style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 3, strokeLinejoin: "round" }}>
                  {caption.length > 26 ? caption.slice(0, 25) + "…" : caption}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
