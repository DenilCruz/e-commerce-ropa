import { RegistroCola } from '../types';
import { pedido, transaccion } from './posDb';

/** Next position of a queue store: records sync in the order they were made. */
export async function siguienteSecuencia(tx: IDBTransaction, store: string): Promise<number> {
  const todos: RegistroCola[] = await pedido(tx.objectStore(store).getAll());
  return todos.reduce((max, r) => Math.max(max, r.secuencia), 0) + 1;
}

/** Applies a change to one stored record. Returns the updated record. */
export async function modificarRegistro<T extends RegistroCola>(
  store: string,
  id: string,
  cambio: (r: T) => T,
): Promise<T> {
  return transaccion([store], 'readwrite', async (tx) => {
    const os = tx.objectStore(store);
    const actual: T | undefined = await pedido(os.get(id));
    if (!actual) throw new Error('El registro local ya no existe.');
    const nuevo = cambio(actual);
    os.put(nuevo);
    return nuevo;
  });
}

export const marcarSincronizandoEn = (store: string, id: string) =>
  modificarRegistro(store, id, (r) => ({ ...r, estado: 'SINCRONIZANDO', intentos: r.intentos + 1, ultimoError: undefined }));

export const marcarSincronizadaEn = (store: string, id: string, extra: object = {}) =>
  modificarRegistro(store, id, (r) => ({
    ...r,
    ...extra,
    estado: 'SINCRONIZADA',
    sincronizadaEn: new Date().toISOString(),
    ultimoError: undefined,
    conflicto: undefined,
  }));

export const marcarConflictoEn = (store: string, id: string, conflicto: unknown) =>
  modificarRegistro(store, id, (r) => ({ ...r, estado: 'CONFLICTO', conflicto, ultimoError: undefined }));

/** The server rejected the record for a reason that retrying will not fix. */
export const marcarErrorEn = (store: string, id: string, mensaje: string) =>
  modificarRegistro(store, id, (r) => ({ ...r, estado: 'ERROR', ultimoError: mensaje }));

/** A failure that may pass (no network, server down): back to the queue, remembering why. */
export const volverAColaEn = (store: string, id: string, mensaje?: string) =>
  modificarRegistro(store, id, (r) => ({ ...r, estado: 'PENDIENTE', ultimoError: mensaje }));

export const reintentarEn = (store: string, id: string) =>
  modificarRegistro(store, id, (r) => ({ ...r, estado: 'PENDIENTE', conflicto: undefined, ultimoError: undefined }));

/** A tab closed in the middle of a sync leaves records SINCRONIZANDO; the server key makes resending them safe. */
export async function recuperarInterrumpidasEn(store: string): Promise<void> {
  await transaccion([store], 'readwrite', async (tx) => {
    const os = tx.objectStore(store);
    const filas: RegistroCola[] = await pedido(os.index('estado').getAll('SINCRONIZANDO'));
    for (const r of filas) os.put({ ...r, estado: 'PENDIENTE' });
  });
}

export async function listarDe<T extends RegistroCola>(store: string, tenantId: string): Promise<T[]> {
  const filas: T[] = await transaccion([store], 'readonly', (tx) => pedido(tx.objectStore(store).index('tenantId').getAll(tenantId)));
  return filas.sort((a, b) => a.secuencia - b.secuencia);
}
