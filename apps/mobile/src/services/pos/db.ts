/** A bound SQLite value. */
export type SqlValue = string | number | null;

/** The async subset of expo-sqlite's SQLiteDatabase this module uses; tests plug in node:sqlite behind it. */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  withTransactionAsync(tarea: () => Promise<void>): Promise<void>;
}

export const NOMBRE_DB = 'aura-pos.db';
export const VERSION_ESQUEMA = 1;

const ESQUEMA_V1 = `
  CREATE TABLE IF NOT EXISTS ventas (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    usuario_id TEXT NOT NULL,
    estado TEXT NOT NULL,
    secuencia INTEGER NOT NULL,
    datos TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ventas_tenant_secuencia ON ventas (tenant_id, secuencia);
  CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas (estado);
  CREATE TABLE IF NOT EXISTS catalogo (
    clave TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    datos TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_catalogo_tenant ON catalogo (tenant_id);
  CREATE TABLE IF NOT EXISTS meta (
    clave TEXT PRIMARY KEY NOT NULL,
    valor TEXT NOT NULL
  );
`;

/** Brings the database up to VERSION_ESQUEMA. Safe to run on every start. */
export async function migrar(db: Db): Promise<void> {
  await db.withTransactionAsync(async () => {
    const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const actual = fila?.user_version ?? 0;
    if (actual < 1) await db.execAsync(ESQUEMA_V1);
    if (actual < VERSION_ESQUEMA) await db.execAsync(`PRAGMA user_version = ${VERSION_ESQUEMA}`);
  });
}

const colas = new WeakMap<Db, Promise<unknown>>();

/**
 * Runs `tarea` in one transaction, one at a time per database. If it throws, nothing it wrote is kept.
 * The queue matters because a single connection would otherwise mix the writes of overlapping calls.
 * `tarea` must not call `transaccion` again (it would wait for itself).
 */
export function transaccion<T>(db: Db, tarea: () => Promise<T>): Promise<T> {
  const previa = colas.get(db) ?? Promise.resolve();
  const resultado = previa.then(async () => {
    let valor!: T;
    await db.withTransactionAsync(async () => {
      valor = await tarea();
    });
    return valor;
  });
  colas.set(db, resultado.catch(() => undefined));
  return resultado;
}

const HEX = (n: number) => n.toString(16).padStart(2, '0');

/** UUID v4 that also works where `crypto` is missing (Hermes) by falling back to Math.random. */
export function uuidV4(): string {
  const c = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, HEX);
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}
