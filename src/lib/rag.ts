export type Chunk = { source: string; text: string };

export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const dot = clean.lastIndexOf(". ", end);
      if (dot > start + size * 0.6) end = dot + 1;
    }
    out.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out;
}

const STOP = new Set(
  "a an the is are was were be of to in on for and or with what how why when which who does do can i you it this that from by as at explain about tell me".split(
    " ",
  ),
);

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9\u0980-\u09ff+#]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** BM25 keyword retrieval over all chunks. Returns top-k with score > 0. */
export function retrieve(query: string, chunks: Chunk[], k = 5): Chunk[] {
  const q = Array.from(new Set(tokenize(query)));
  if (!q.length || !chunks.length) return [];
  const docs = chunks.map((c) => tokenize(c.text));
  const N = docs.length;
  const avg = docs.reduce((s, d) => s + d.length, 0) / N || 1;
  const df = new Map<string, number>();
  for (const term of q) df.set(term, docs.filter((d) => d.includes(term)).length);
  const k1 = 1.5;
  const b = 0.75;
  const scored = docs.map((d, i) => {
    let score = 0;
    for (const term of q) {
      const n = df.get(term) ?? 0;
      if (!n) continue;
      const tf = d.filter((t) => t === term).length;
      if (!tf) continue;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.length) / avg)));
    }
    return { i, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => chunks[s.i] as Chunk);
}
