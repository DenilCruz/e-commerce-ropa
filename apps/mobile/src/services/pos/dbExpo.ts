import * as SQLite from 'expo-sqlite';
import { Db, NOMBRE_DB, migrar } from './db';

let abierta: Promise<Db> | null = null;

/** Opens (once) the on-device database that holds the queued sales and the catalog snapshot. */
export function abrirDb(): Promise<Db> {
  if (!abierta) {
    abierta = (async () => {
      const db = await SQLite.openDatabaseAsync(NOMBRE_DB);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await migrar(db as unknown as Db);
      return db as unknown as Db;
    })().catch((err) => {
      abierta = null;
      throw err;
    });
  }
  return abierta;
}
