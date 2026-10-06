/** Graph IDs cited in an answer: WO-2026-012, PR-001, CH-cp-200-002, PT-001, T-03, FM-001, P-301, CP-200, CP-200-BRG, L1, SY-01, S-01 ... */
const ID_PATTERN = /\b(?:WO-\d{4}-\d{3}|CH-[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}|[A-Z]{1,3}-\d{2,3}(?:-[A-Z]{2,5})?|L\d)\b/g;

export function extractIds(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(ID_PATTERN)) seen.add(m[0]);
  return [...seen];
}

/** Wrap known IDs in markdown links (#id:...) so the renderer can turn them into chips. Skips fenced/inline code. */
export function linkIds(markdown: string, known: Set<string>): string {
  if (known.size === 0) return markdown;
  return markdown
    .split(/(`[^`]*`)/g)
    .map((seg, i) => (i % 2 === 1 ? seg : seg.replace(ID_PATTERN, (id) => (known.has(id) ? `[${id}](#id:${id})` : id))))
    .join("");
}
