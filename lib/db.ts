import { join } from "path";
// @ts-ignore: no declaration file for 'better-sqlite3'
import Database from "better-sqlite3";


let _db: Database.Database | null = null;


export function getDB() {
if (_db) return _db;
const dbPath = join(process.cwd(), "data", "quotes.db");
_db = new Database(dbPath, { readonly: true });
return _db;
}