PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;


-- Main quotes table
CREATE TABLE IF NOT EXISTS quotes (
id TEXT PRIMARY KEY,
text TEXT NOT NULL,
author TEXT,
source TEXT,
year INTEGER,
tags TEXT, -- comma-separated e.g. "failure,resilience,learning"
is_public_domain INTEGER DEFAULT 0, -- 1:true 0:false
source_url TEXT,
confidence INTEGER DEFAULT 2 -- 0:low 1:med 2:high
);


-- FTS virtual table for fast search
CREATE VIRTUAL TABLE IF NOT EXISTS quotes_fts USING fts5(
text, author, tags, content='quotes', content_rowid='rowid'
);


-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS quotes_ai AFTER INSERT ON quotes BEGIN
INSERT INTO quotes_fts(rowid, text, author, tags)
VALUES (new.rowid, new.text, new.author, new.tags);
END;
CREATE TRIGGER IF NOT EXISTS quotes_ad AFTER DELETE ON quotes BEGIN
INSERT INTO quotes_fts(quotes_fts, rowid, text, author, tags)
VALUES('delete', old.rowid, old.text, old.author, old.tags);
END;
CREATE TRIGGER IF NOT EXISTS quotes_au AFTER UPDATE ON quotes BEGIN
INSERT INTO quotes_fts(quotes_fts, rowid, text, author, tags)
VALUES('delete', old.rowid, old.text, old.author, old.tags);
INSERT INTO quotes_fts(rowid, text, author, tags)
VALUES (new.rowid, new.text, new.author, new.tags);
END;