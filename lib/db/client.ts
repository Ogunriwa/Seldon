import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import { mkdirSync } from 'fs';

// ── Database Initialization ──────────────────────────────────────────
// Ensure the data directory exists before attempting to connect to SQLite.
const dbPath = process.env.SELDON_DB_PATH || path.join(process.cwd(), 'data', 'app.db');
mkdirSync(path.dirname(dbPath), { recursive: true });

// ── SQLite Client Configuration ──────────────────────────────────────
// Initialize better-sqlite3 with WAL mode for better concurrency 
// and foreign key constraints enabled for referential integrity.
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Export the initialized Drizzle ORM instance with the schema bound.
export const db = drizzle(sqlite, { schema });
