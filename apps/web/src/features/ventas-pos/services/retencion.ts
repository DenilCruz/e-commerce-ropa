import { STORE_META, pedido, transaccion } from './posDb';

/**
 * How long data may stay on the device without being renewed. The teacher asked that local persistence
 * is not indefinite and that the business sets the limit (hours or days, usually up to seven days).
 * Change it per deployment with VITE_POS_RETENCION_DIAS (fractions allowed: 0.5 = twelve hours).
 * The store owner can override it (C3): the value is saved per store while online and read from the
 * device without a connection; this constant is only the fallback when nothing was saved.
 */
const configurado = Number(import.meta.env?.VITE_POS_RETENCION_DIAS);
export const RETENCION_DIAS = Number.isFinite(configurado) && configurado > 0 ? configurado : 7;

/** Range the API accepts for the owner's setting (C3). */
export const RETENCION_OFFLINE_MIN = 1;
export const RETENCION_OFFLINE_MAX = 30;

/** Whole days within the accepted range, or null. */
export function validarDiasRetencion(texto: string): number | null {
  const n = texto.trim() === '' ? NaN : Number(texto);
  return Number.isInteger(n) && n >= RETENCION_OFFLINE_MIN && n <= RETENCION_OFFLINE_MAX ? n : null;
}

const claveRetencion = (tenantId: string) => `retencion-dias:${tenantId}`;

/** The saved value when it is a valid number of days, otherwise the build/default fallback. */
export function resolverRetencion(guardado: unknown): number {
  const n = typeof guardado === 'string' && guardado.trim() === '' ? NaN : Number(guardado);
  return Number.isFinite(n) && n > 0 ? n : RETENCION_DIAS;
}

/** Saves the days this store keeps unsynced data on the device, so it still applies without a connection. */
export async function guardarRetencionDias(tenantId: string, dias: number): Promise<void> {
  await transaccion([STORE_META], 'readwrite', async (tx) => {
    tx.objectStore(STORE_META).put({ clave: claveRetencion(tenantId), valor: dias });
  });
}

/** Days saved for this store, or the fallback (env value, then 7) when none was saved yet. */
export async function leerRetencionDias(tenantId: string): Promise<number> {
  const fila = await transaccion([STORE_META], 'readonly', (tx) => pedido(tx.objectStore(STORE_META).get(claveRetencion(tenantId))));
  return resolverRetencion(fila?.valor);
}

const DIA_MS = 24 * 3600 * 1000;

/** True when the catalog snapshot is older than the limit, or was never downloaded. */
export function catalogoVencido(actualizadoEn: string | null, ahora = Date.now(), dias = RETENCION_DIAS): boolean {
  if (!actualizadoEn) return true;
  return ahora - new Date(actualizadoEn).getTime() > dias * DIA_MS;
}

/** A queued sale that waited longer than the limit. It is flagged, never deleted: it still has to sync. */
export function ventaAntigua(venta: { creadoEn: string; estado: string }, ahora = Date.now(), dias = RETENCION_DIAS): boolean {
  return venta.estado !== 'SINCRONIZADA' && ahora - new Date(venta.creadoEn).getTime() > dias * DIA_MS;
}

export function diasDeAntiguedad(iso: string, ahora = Date.now()): number {
  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / DIA_MS));
}

export class CatalogoVencidoError extends Error {
  constructor(dias = RETENCION_DIAS) {
    super(`El catálogo guardado en este equipo tiene más de ${dias} día(s). Conéctate a internet para renovarlo antes de vender.`);
    this.name = 'CatalogoVencidoError';
  }
}
