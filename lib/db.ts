// lib/db.ts
import { join, dirname } from "path";
import { existsSync } from "fs";
// @ts-ignore: no declaration file for 'better-sqlite3'
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

let _db: Database.Database | null = null;

function findDbPath(): string {
  // Primary: project root in dev & most deployments
  const fromCwd = join(process.cwd(), "data", "quotes.db");
  if (existsSync(fromCwd)) return fromCwd;

  // Fallback A: near the compiled route/chunk (when Next moves files into .next)
  // __dirname works in CJS; with TS/App Router it's compiled to CJS in prod.
  const here = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
  const probeA = join(here, "../../../../data/quotes.db");
  if (existsSync(probeA)) return probeA;

  // Fallback B: sometimes tracing puts it under the route folder
  const probeB = join(here, "../data/quotes.db");
  if (existsSync(probeB)) return probeB;

  // Last resort: same-level /data
  const probeC = join(here, "../../data/quotes.db");
  if (existsSync(probeC)) return probeC;

  // Nothing found; return the default so errors/logs show a sensible path
  return fromCwd;
}

export function getDB() {
  if (_db) return _db;
  const dbPath = findDbPath();
  // readonly is fine; lambdas cannot write anyway
  _db = new Database(dbPath, { readonly: true });
  return _db;
}
