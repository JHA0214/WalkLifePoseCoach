import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "guidelines.db");

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS guidelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_joint TEXT NOT NULL,
    tolerance REAL NOT NULL,
    path_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
