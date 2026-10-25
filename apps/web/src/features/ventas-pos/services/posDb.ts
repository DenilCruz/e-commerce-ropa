const DB_NAME = 'aura-pos';
const DB_VERSION = 1;

export const STORE_VENTAS = 'ventas';
export const STORE_CATALOGO = 'catalogo';
export const STORE_META = 'meta';

let opening: Promise<IDBDatabase> | null = null;

/** Opens (once) the local database that holds the sales not synced yet and the catalog snapshot. */
export function abrirDb(): Promise<IDBDatabase> {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VENTAS)) {
        const ventas = db.createObjectStore(STORE_VENTAS, { keyPath: 'id' });
        ventas.createIndex('tenantId', 'tenantId');
        ventas.createIndex('estado', 'estado');
      }
      if (!db.objectStoreNames.contains(STORE_CATALOGO)) {
        const catalogo = db.createObjectStore(STORE_CATALOGO, { keyPath: 'clave' });
        catalogo.createIndex('tenantId', 'tenantId');
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'clave' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema must not be blocked by this connection
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      opening = null;
      reject(request.error);
    };
    request.onblocked = () => {
      opening = null;
      reject(new Error('La base de datos local está bloqueada por otra pestaña.'));
    };
  });
  return opening;
}

/** Test helper: closes the connection so a fresh database can be created. */
export async function cerrarDb(): Promise<void> {
  if (!opening) return;
  const db = await opening.catch(() => null);
  db?.close();
  opening = null;
}

export function pedido<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function terminada(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción local cancelada.'));
  });
}

/**
 * Runs fn inside one IndexedDB transaction. If fn throws, nothing it wrote is kept.
 * fn may only await IndexedDB requests (anything else lets the transaction close).
 */
export async function transaccion<T>(
  stores: string[],
  modo: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await abrirDb();
  const tx = db.transaction(stores, modo);
  const fin = terminada(tx);
  fin.catch(() => undefined);
  try {
    const resultado = await fn(tx);
    await fin;
    return resultado;
  } catch (err) {
    try {
      tx.abort();
    } catch {
      /* already finished */
    }
    await fin.catch(() => undefined);
    throw err;
  }
}

/** UUID v4 that also works on plain http, where crypto.randomUUID does not exist. */
export function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}
