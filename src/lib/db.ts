import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:hiring_tracker.db";

let dbInstance: Database | null = null;

/**
 * Load the database. The SQL plugin runs migrations automatically on first load.
 *
 * PRAGMAs must be run via `select` (not `execute`): they return a row with the
 * new setting, and `execute` rejects statements that return rows. They also
 * cannot live inside the migration SQL because the plugin wraps each migration
 * in a transaction, and several PRAGMAs (journal_mode, synchronous) error out
 * when changed inside one.
 */
export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const db = await Database.load(DB_URL);

  // Best-effort PRAGMA setup. If any of these fail we still want the app to
  // run — they're performance/safety tweaks, not correctness requirements.
  try {
    await db.select("PRAGMA journal_mode = WAL");
    await db.select("PRAGMA foreign_keys = ON");
    await db.select("PRAGMA synchronous = NORMAL");
  } catch (e) {
    console.warn("PRAGMA setup failed (non-fatal):", e);
  }

  dbInstance = db;
  return db;
}

export async function getDb(): Promise<Database> {
  if (!dbInstance) return initDatabase();
  return dbInstance;
}

/** Typed SELECT helper. */
export async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

/** Typed INSERT/UPDATE/DELETE helper. Returns { rowsAffected, lastInsertId }. */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<{ rowsAffected: number; lastInsertId?: number }> {
  const db = await getDb();
  const res = await db.execute(sql, params);
  return { rowsAffected: res.rowsAffected, lastInsertId: res.lastInsertId };
}

/**
 * Close the database connection. Needed before filesystem operations on
 * the DB file (rename/delete) on Windows, where SQLite holds an exclusive
 * lock while the connection is open. After calling this, NO further query/
 * execute calls will work — the app must be restarted.
 */
export async function closeDatabase(): Promise<void> {
  if (!dbInstance) return;
  try {
    await dbInstance.close();
  } catch (e) {
    console.warn("Failed to close database:", e);
  }
  dbInstance = null;
}
