"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Answer } from "@/components/Answer";
import { EvidenceGraph } from "@/components/EvidenceGraph";
import { NodePanel } from "@/components/NodePanel";
import { ToolTimeline } from "@/components/ToolTimeline";
import { FAMILY_COLOR, type Family } from "@/lib/graph-style";
import { t, type Locale } from "@/lib/i18n";
import type { GraphNode, Subgraph } from "@/lib/neo4j";
import { GROUP_ORDER, QUESTIONS } from "@/lib/questions";
import { applyEvent, readSse, type Turn } from "@/lib/sse";

const GITHUB = "https://github.com/kurorooooo/kg-maintenance-agent";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function usePersisted(key: string, initial: () => string) {
  const [v, setV] = useState<string>("");
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) return setV(s);
    } catch {}
    const n = initial();
    setV(n);
    try {
      localStorage.setItem(key, n);
    } catch {}
  }, [key, initial]);
  const update = useCallback(
    (n: string) => {
      setV(n);
      try {
        localStorage.setItem(key, n);
      } catch {}
    },
    [key],
  );
  return [v, update] as const;
}

export function Workbench({ defaultLocale }: { defaultLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  useEffect(() => {
    try {
      const s = localStorage.getItem("locale");
      if (s === "en" || s === "ja") setLocale(s);
    } catch {}
  }, []);
  const dict = t(locale);
  const [userId] = usePersisted("userId", uid);
  const [sessionId, setSessionId] = usePersisted("sessionId", uid);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [overview, setOverview] = useState<Subgraph | undefined>();
  const [evidenceTurnId, setEvidenceTurnId] = useState<string | undefined>();
  const [focusId, setFocusId] = useState<string | undefined>();
  const [selected, setSelected] = useState<GraphNode | undefined>();
  const [mobileTab, setMobileTab] = useState<"chat" | "graph">("chat");
  const listRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((x) => x.status === "running");

  useEffect(() => {
    fetch("/api/graph/overview?id=P-301")
      .then((r) => r.json())
      .then((g) => !g.error && setOverview(g))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [busy]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy || !userId || !sessionId) return;
      setInput("");
      const turn: Turn = { id: uid(), question: q, text: "", tools: [], status: "running", startedAt: Date.now() };
      setTurns((ts) => [...ts, turn]);
      const patch = (fn: (x: Turn) => Turn) => setTurns((ts) => ts.map((x) => (x.id === turn.id ? fn(x) : x)));
      try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, sessionId, text: q }) });
        if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({})))?.error ?? `HTTP ${res.status}`);
        let latest = turn;
        await readSse(res.body, (ev) => {
          latest = applyEvent(latest, ev);
          const snapshot = latest;
          patch(() => snapshot);
        });
        const ended = Date.now();
        patch((x) => ({ ...x, status: x.status === "error" ? "error" : "done", endedAt: ended }));
        const ev = await fetch("/api/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: latest.text }) }).then((r) => r.json());
        if (!ev.error) {
          patch((x) => ({ ...x, evidence: ev }));
          setEvidenceTurnId(turn.id);
          setSelected(undefined);
          setFocusId(undefined);
        }
      } catch (e) {
        patch((x) => ({ ...x, status: "error", error: (e as Error).message, endedAt: Date.now() }));
      }
    },
    [busy, userId, sessionId],
  );

  const reset = () => {
    setTurns([]);
    setSessionId(uid());
    setEvidenceTurnId(undefined);
    setSelected(undefined);
    setFocusId(undefined);
  };

  const evidenceTurn = turns.find((x) => x.id === evidenceTurnId);
  const graph: Subgraph | undefined = evidenceTurn?.evidence ?? overview;
  const showingOverview = !evidenceTurn?.evidence;

  const focus = (id: string, turnId: string) => {
    setEvidenceTurnId(turnId);
    setFocusId(id);
    setSelected(undefined);
    setMobileTab("graph");
  };

  const groups = useMemo(() => GROUP_ORDER.map((g) => ({ g, qs: QUESTIONS.filter((q) => q.group === g) })), []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-rule bg-panel px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight">{dict.title}</h1>
          <p className="hidden truncate text-xs text-ink-2 md:block">{dict.tagline}</p>
        </div>
        <details className="relative hidden md:block">
          <summary className="cursor-pointer list-none rounded px-2 py-1 text-xs text-ink-2 hover:bg-panel-2">{dict.howItWorks}</summary>
          <div className="absolute right-0 z-20 mt-1 w-80 rounded border border-rule bg-panel p-3 text-[12.5px] leading-relaxed text-ink-2 shadow-sm">{dict.howText}</div>
        </details>
        <a href={GITHUB} target="_blank" rel="noreferrer" className="hidden rounded px-2 py-1 text-xs text-ink-2 hover:bg-panel-2 md:block">
          {dict.github}
        </a>
        <div className="flex overflow-hidden rounded border border-rule text-xs" role="group" aria-label="Language">
          {(["en", "ja"] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                try {
                  localStorage.setItem("locale", l);
                } catch {}
              }}
              className={`px-2.5 py-1 ${locale === l ? "bg-ink text-panel" : "bg-panel text-ink-2 hover:bg-panel-2"}`}
              aria-pressed={locale === l}
            >
              {l === "en" ? "EN" : "日本語"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex border-b border-rule bg-panel text-sm lg:hidden">
        {(["chat", "graph"] as const).map((tab) => (
          <button key={tab} onClick={() => setMobileTab(tab)} className={`flex-1 py-2 ${mobileTab === tab ? "border-b-2 border-signal font-medium" : "text-ink-2"}`}>
            {tab === "chat" ? dict.answer : dict.evidence}
          </button>
        ))}
      </div>

      <main className="grid min-h-0 flex-1 lg:grid-cols-[272px_minmax(0,1fr)_minmax(380px,34%)]">
        {/* Example questions */}
        <aside className={`min-h-0 overflow-y-auto border-r border-rule bg-panel ${mobileTab === "chat" ? "block" : "hidden"} lg:block`}>
          <details className="lg:hidden" open={false}>
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium">{dict.examples}</summary>
            <QuestionList groups={groups} locale={locale} dict={dict} onPick={ask} disabled={busy} />
          </details>
          <div className="hidden lg:block">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h2 className="text-sm font-medium">{dict.examples}</h2>
              <button onClick={reset} className="rounded px-2 py-0.5 text-xs text-ink-2 hover:bg-panel-2" disabled={busy}>
                {dict.newSession}
              </button>
            </div>
            <QuestionList groups={groups} locale={locale} dict={dict} onPick={ask} disabled={busy} />
          </div>
        </aside>

        {/* Conversation */}
        <section className={`flex min-h-0 flex-col ${mobileTab === "chat" ? "flex" : "hidden"} lg:flex`}>
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-8">
            {turns.length === 0 && (
              <div className="mx-auto max-w-xl py-10 text-ink-2">
                <p className="text-base leading-relaxed">{dict.tagline}</p>
                <p className="mt-3 text-sm">{locale === "en" ? "Pick an example on the left, or type your own question in English or Japanese." : "左の例から選ぶか、日本語か英語で質問を入力してください。"}</p>
              </div>
            )}
            <div className="mx-auto max-w-3xl space-y-6">
              {turns.map((x) => (
                <article key={x.id} className="space-y-3">
                  <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-ink px-3.5 py-2 text-panel">{x.question}</p>
                  <div className="rounded-lg border border-rule bg-panel">
                    <div className="flex items-center justify-between border-b border-rule px-4 py-2 text-xs text-ink-2">
                      <span className="font-medium">{dict.steps}</span>
                      <span>
                        {x.status === "running" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
                            {dict.working} · {((now - x.startedAt) / 1000).toFixed(0)}
                            {dict.seconds}
                          </span>
                        ) : (
                          <>
                            {dict.done} {(((x.endedAt ?? now) - x.startedAt) / 1000).toFixed(1)}
                            {dict.seconds}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <ToolTimeline tools={x.tools} dict={dict} now={now} />
                      {x.status === "running" && !x.text && (x.tools.length === 0 || x.tools.every((t) => t.endedAt)) && (
                        <div className={`text-xs text-ink-3 ${x.tools.length ? "mt-2" : ""}`}>{x.tools.length ? dict.composing : dict.starting}</div>
                      )}
                    </div>
                    {(x.text || x.error) && (
                      <div className="border-t border-rule px-4 py-3">
                        {x.error ? <p className="text-warn">{dict.error} ({x.error})</p> : <Answer text={x.text} nodes={x.evidence?.nodes} onFocus={(id) => focus(id, x.id)} />}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
          <form
            className="flex gap-2 border-t border-rule bg-panel px-4 py-3 lg:px-8"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={dict.placeholder}
              className="min-w-0 flex-1 rounded border border-rule bg-panel px-3 py-2 text-sm placeholder:text-ink-3 focus:border-signal"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()} className="rounded bg-signal px-4 py-2 text-sm font-medium text-panel disabled:opacity-40">
              {dict.send}
            </button>
            <button type="button" onClick={reset} className="rounded border border-rule px-3 py-2 text-sm text-ink-2 lg:hidden" disabled={busy}>
              {dict.newSession}
            </button>
          </form>
        </section>

        {/* Evidence */}
        <aside className={`min-h-0 flex-col border-l border-rule bg-panel ${mobileTab === "graph" ? "flex" : "hidden"} lg:flex`}>
          <div className="flex items-baseline justify-between px-4 pt-3 pb-1">
            <h2 className="text-sm font-medium">{dict.evidence}</h2>
            {evidenceTurn?.evidence && <span className="text-xs text-ink-3">{evidenceTurn.evidence.nodes.length} nodes · {evidenceTurn.evidence.rels.length} edges</span>}
          </div>
          <p className="px-4 pb-2 text-xs leading-relaxed text-ink-2">{showingOverview ? dict.overviewCaption : evidenceTurn?.question}</p>
          <div className="relative min-h-0 flex-1 bg-panel-2">
            {graph ? <EvidenceGraph graph={graph} locale={locale} focusId={focusId} selectedKey={selected?.key} onSelect={setSelected} /> : <div className="p-4 text-xs text-ink-3">{dict.evidenceEmpty}</div>}
          </div>
          {selected && <NodePanel node={selected} locale={locale} dict={dict} onClose={() => setSelected(undefined)} />}
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-rule px-4 py-2 text-[11px] text-ink-2">
            {(Object.keys(FAMILY_COLOR) as Family[]).map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: FAMILY_COLOR[f] }} />
                {dict.family[f]}
              </span>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

function QuestionList({
  groups,
  locale,
  dict,
  onPick,
  disabled,
}: {
  groups: { g: (typeof GROUP_ORDER)[number]; qs: typeof QUESTIONS }[];
  locale: Locale;
  dict: ReturnType<typeof t>;
  onPick: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="pb-4">
      {groups.map(({ g, qs }) => (
        <div key={g} className="mt-2">
          <div className="px-4 py-1 text-[11.5px] text-ink-3">{dict.groups[g]}</div>
          <ul>
            {qs.map((q) => (
              <li key={q.id}>
                <button onClick={() => onPick(q[locale])} disabled={disabled} className="w-full px-4 py-1.5 text-left text-[13px] leading-snug text-ink hover:bg-signal-soft disabled:opacity-50">
                  {q[locale]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
