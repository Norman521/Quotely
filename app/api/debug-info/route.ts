import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
export const runtime = "nodejs";
export async function GET() {
  const cwd = process.cwd();
  const p = join(cwd, "data", "quotes.db");
  return NextResponse.json({ cwd, dbPath: p, dbExists: existsSync(p) });
}
