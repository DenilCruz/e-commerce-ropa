import { createRequire } from 'node:module';
import type { Db, SqlValue } from '../db';

// node:sqlite is loaded through require so the bundler never tries to resolve a built-in it does not know
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

/** In-memory database with the same async surface as expo-sqlite, for unit tests. */
export function crearDbNode(): Db & { cerrar: () => void } {
  const raw = new DatabaseSync(':memory:');
  return {
    async execAsync(sql: string) {
      raw.exec(sql);
    },
    async runAsync(sql: string, params: SqlValue[] = []) {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getAllAsync<T>(sql: string, params: SqlValue[] = []) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[] = []) {
      return (raw.prepare(sql).get(...params) ?? null) as T | null;
    },
    async withTransactionAsync(tarea: () => Promise<void>) {
      raw.exec('BEGIN');
      try {
        await tarea();
        raw.exec('COMMIT');
      } catch (err) {
        raw.exec('ROLLBACK');
        throw err;
      }
    },
    cerrar: () => raw.close(),
  };
}
