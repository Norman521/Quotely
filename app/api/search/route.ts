import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { keywordCandidates, scoreHeuristic, applyTone, diversify, type Tone } from "@/lib/search";


export const runtime = "nodejs"; // IMPORTANT: use Node runtime for better-sqlite3


export async function POST(req: Request) {
const { query, tone = "neutral", publicDomainOnly = false } = await req.json();
if (!query || typeof query !== "string") {
return NextResponse.json({ results: [] });
}


const db = getDB();
let candidates = keywordCandidates(db, query, 200)
.map((c) => ({ ...c, _score: scoreHeuristic(query, c) }))
.sort((a, b) => (b._score || 0) - (a._score || 0));


if (publicDomainOnly) candidates = candidates.filter(c => c.is_public_domain === 1);


const toned = applyTone(candidates, (tone as Tone) || "neutral");
const finalPicks = diversify(toned, 5).map(c => ({
id: c.id,
text: c.text,
author: c.author,
source: c.source,
year: c.year,
tags: c.tags,
is_public_domain: c.is_public_domain === 1,
confidence: c.confidence,
}));


return NextResponse.json({ results: finalPicks });
}