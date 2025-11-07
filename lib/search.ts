// lib/search.ts
// @ts-ignore: no declaration file for 'better-sqlite3'
import type Database from "better-sqlite3";

export type Tone = "neutral" | "gentle" | "tough" | "humor";

export type QuoteRow = {
  id: string;
  text: string;
  author?: string | null;
  source?: string | null;
  year?: number | null;
  tags?: string | null;
  is_public_domain?: number | boolean | null;
  confidence?: number | null;
  _score?: number;
  _toneBoost?: number;
  _divScore?: number;
};

function normalize(q: string): string[] {
  return (q || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** 1) FTS (AND) → 2) LIKE (OR per term) → 3) confident defaults */
export function keywordCandidates(
  db: Database.Database,
  query: string,
  limit = 200
): QuoteRow[] {
  const terms = normalize(query);

  // --- Try FTS5 (AND all terms) ---
  const ftsExpr = terms.length ? terms.map((t) => `"${t}"`).join(" AND ") : `""`;
  const ftsStmt = db.prepare(`
    SELECT
      quotes.rowid AS qrowid,
      quotes.id, quotes.text, quotes.author, quotes.source, quotes.year,
      quotes.tags, quotes.is_public_domain, quotes.confidence
    FROM quotes_fts
    JOIN quotes ON quotes.rowid = quotes_fts.rowid
    WHERE quotes_fts MATCH ?
    LIMIT ?
  `);
  let rows = ftsStmt.all(ftsExpr, limit) as QuoteRow[];
  if (rows.length) return rows;

  // --- LIKE fallback: OR across individual terms and fields ---
  if (terms.length) {
    // Build dynamic WHERE like:
    // (text LIKE ? OR tags LIKE ? OR author LIKE ?) OR (text LIKE ? OR ...)
    const pieces: string[] = [];
    const params: any[] = [];
    for (const t of terms) {
      const needle = `%${t}%`;
      pieces.push(`(lower(text) LIKE lower(?) OR lower(tags) LIKE lower(?) OR lower(author) LIKE lower(?))`);
      params.push(needle, needle, needle);
    }
    const where = pieces.join(" OR ");
    const likeStmt = db.prepare(`
      SELECT id, text, author, source, year, tags, is_public_domain, confidence
      FROM quotes
      WHERE ${where}
      LIMIT ?
    `);
    rows = likeStmt.all(...params, limit) as QuoteRow[];
    if (rows.length) return rows;
  }

  // --- Final safety net: show confident quotes so UI isn't empty ---
  const defaultStmt = db.prepare(`
    SELECT id, text, author, source, year, tags, is_public_domain, confidence
    FROM quotes
    ORDER BY confidence DESC, year DESC NULLS LAST
    LIMIT ?
  `);
  rows = defaultStmt.all(Math.min(limit, 20)) as QuoteRow[];
  return rows;
}

export function scoreHeuristic(q: string, item: QuoteRow): number {
  const qWords = new Set<string>((q.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []) as string[]);
  const text = `${item.text} ${item.author ?? ""} ${item.tags ?? ""}`.toLowerCase();
  const iWords = new Set<string>((text.match(/[\p{L}\p{N}']+/gu) || []) as string[]);

  let overlap = 0;
  qWords.forEach((w) => { if (iWords.has(w)) overlap++; });

  let bonus = 0;
  const tags: string[] = (item.tags ?? "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);

  const hintMap: Record<string, string[]> = {
    fail: ["failure", "learning", "resilience"],
    mess: ["forgiveness", "learning", "humility", "resilience"],
    sad: ["grief", "healing", "hope"],
    anxious: ["courage", "calm", "focus"],
    stress: ["calm", "focus", "discipline"],
  };

  for (const [key, vals] of Object.entries(hintMap)) {
    if ([...qWords].some((w) => w.startsWith(key))) {
      if (tags.some((t: string) => vals.includes(t))) bonus += 1.5;
    }
  }

  const conf = typeof item.confidence === "number" ? item.confidence : 0;
  return overlap + bonus + conf * 0.2;
}

export function applyTone(items: QuoteRow[], tone: Tone): QuoteRow[] {
  const toneTags: Record<Tone, string[]> = {
    neutral: [],
    gentle: ["gentleness", "kindness", "support", "healing", "hope"],
    tough: ["discipline", "grit", "stoicism", "duty", "perseverance"],
    humor: ["humor", "wit"],
  };
  const wanted = new Set<string>(toneTags[tone]);
  if (!wanted.size) return items;

  return items
    .map((it) => {
      const tags: string[] = (it.tags ?? "")
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
      const hasTone = tags.some((t: string) => wanted.has(t));
      return { ...it, _toneBoost: hasTone ? 1 : 0 };
    })
    .sort((a, b) => (b._toneBoost ?? 0) - (a._toneBoost ?? 0));
}

export function diversify(items: QuoteRow[], k = 5): QuoteRow[] {
  const authors = new Map<string, number>();
  const scored = items.map((it) => {
    const a = (it.author ?? "Unknown").trim() || "Unknown";
    const count = authors.get(a) ?? 0;
    const penalty = count * 0.5;
    const base = it._score ?? 0;
    const tone = it._toneBoost ?? 0;
    const _divScore = base - penalty + tone;
    authors.set(a, count + 1);
    return { ...it, _divScore };
  });

  scored.sort((a, b) => (b._divScore ?? 0) - (a._divScore ?? 0));

  const out: QuoteRow[] = [];
  for (const it of scored) {
    if (out.length >= k) break;
    if (!out.find((o) => o.id === it.id)) out.push(it);
  }
  return out;
}
