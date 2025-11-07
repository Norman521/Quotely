import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { keywordCandidates, scoreHeuristic, applyTone, diversify, type Tone } from "@/lib/search";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { query, tone = "neutral", publicDomainOnly = false } = await req.json();
    if (!query || typeof query !== "string") return NextResponse.json({ results: [] });

    // sanity: where is the db and does it exist?
    const dbPath = join(process.cwd(), "data", "quotes.db");
    if (!existsSync(dbPath)) {
      console.error("[/api/search] DB missing at:", dbPath);
      return NextResponse.json({ error: "DB not found", dbPath }, { status: 500 });
    }

    const db = getDB(); // will open read-only
    let candidates = keywordCandidates(db, query, 200)
      .map(c => ({ ...c, _score: scoreHeuristic(query, c) }))
      .sort((a, b) => (b._score ?? 0) - (a._score ?? 0));

    if (publicDomainOnly) candidates = candidates.filter(c => c.is_public_domain === 1 || c.is_public_domain === true);

    const toned = applyTone(candidates, (tone as Tone) || "neutral");
    const finalPicks = diversify(toned, 5).map(c => ({
      id: c.id, text: c.text, author: c.author, source: c.source, year: c.year,
      tags: c.tags, is_public_domain: !!c.is_public_domain, confidence: c.confidence
    }));

    return NextResponse.json({ results: finalPicks });
  } catch (err: any) {
    console.error("[/api/search] error:", err?.stack || err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
