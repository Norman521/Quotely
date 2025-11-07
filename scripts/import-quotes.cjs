// scripts/import-quotes.cjs
const { readFileSync, readdirSync } = require("fs");
const { join, resolve } = require("path");
const Database = require("better-sqlite3");
const { parse } = require("csv-parse/sync");

const ROOT = process.cwd();
const dataDir = join(ROOT, "data");
const dbPath = join(dataDir, "quotes.db");
const schemaPath = join(ROOT, "sql", "schema.sql");

// ensure the data directory exists
const { mkdirSync } = require("fs");
mkdirSync(dataDir, { recursive: true });
console.log("[importer] dbPath =", dbPath);


// pick CSVs: CLI args or all data/quotes*.csv
const cliFiles = process.argv.slice(2);
let csvFiles = cliFiles.length
  ? cliFiles.map((p) => resolve(p))
  : readdirSync(dataDir).filter(f => /^quotes.*\.csv$/i.test(f)).map(f => join(dataDir, f));

if (!csvFiles.length) {
  console.error("No CSV files found in data/");
  process.exit(1);
}

const db = new Database(dbPath);
db.exec(readFileSync(schemaPath, "utf8"));

const insert = db.prepare(`
  INSERT INTO quotes (id, text, author, source, year, tags, is_public_domain, source_url, confidence)
  VALUES (@id, @text, @author, @source, @year, @tags, @is_public_domain, @source_url, @confidence)
  ON CONFLICT(id) DO UPDATE SET
    text=excluded.text,
    author=excluded.author,
    source=excluded.source,
    year=excluded.year,
    tags=excluded.tags,
    is_public_domain=excluded.is_public_domain,
    source_url=excluded.source_url,
    confidence=excluded.confidence
`);

const tx = db.transaction((rows) => {
  for (const r of rows) {
    const row = {
      id: String(r.id || "").trim(),
      text: String(r.text || "").trim(),
      author: r.author ? String(r.author).trim() : null,
      source: r.source ? String(r.source).trim() : null,
      year: r.year === "" || r.year == null ? null : Number(r.year),
      tags: r.tags ? String(r.tags).trim() : "",
      is_public_domain: r.is_public_domain ? Number(r.is_public_domain) : 0,
      source_url: r.source_url ? String(r.source_url).trim() : null,
      confidence: r.confidence == null || r.confidence === "" ? 2 : Number(r.confidence),
    };
    if (!row.id || !row.text) continue;
    insert.run(row);
  }
});

let total = 0;
for (const file of csvFiles) {
  const input = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const records = parse(input, { columns: true, skip_empty_lines: true });
  tx(records);
  total += records.length;
  console.log(`Imported ${records.length} from ${file}`);
}
console.log(`✅ Upserted ~${total} rows into ${dbPath}`);
