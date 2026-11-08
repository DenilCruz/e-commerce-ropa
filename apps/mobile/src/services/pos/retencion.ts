import type { Db } from './db';

/** Fallback when the store value was never downloaded (teacher: "hasta siete días"). The store owner can change it on the web. */
export const RETENCION_DIAS = 7;
export const RETENCION_MIN = 1;
export const RETENCION_MAX = 30;

const claveRetencion = (tenantId: string) => `retencion_dias:${tenantId}`;

/** Whole days the API accepts (1..30), or null when the text is not in that range. */
export function validarDiasRetencion(texto: string): number | null {
  const n = texto.trim() === '' ? NaN : Number(texto);
  return Number.isInteger(n) && n >= RETENCION_MIN && n <= RETENCION_MAX ? n : null;
}

/** A valid retention in days (integer 1..30) or the fallback. */
export function normalizarDias(valor: unknown): number {
  const n = typeof valor === 'string' ? Number(valor) : (valor as number);
  return Number.isInteger(n) && n >= RETENCION_MIN && n <= RETENCION_MAX ? n : RETENCION_DIAS;
}

/** Keeps the store's `retencionOfflineDias` (from GET /auth/tiendas/plan-limites) so it also applies without internet. */
export async function guardarRetencionDias(db: Db, tenantId: string, valor: unknown): Promise<number> {
  const dias = normalizarDias(valor);
  await db.runAsync('INSERT OR REPLACE INTO meta (clave, valor) VALUES (?, ?)', [claveRetencion(tenantId), String(dias)]);
  return dias;
}

/** Retention of the store saved on this device, or the 7-day fallback. */
export async function leerRetencionDias(db: Db, tenantId: string): Promise<number> {
  const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM meta WHERE clave = ?', [claveRetencion(tenantId)]);
  return normalizarDias(fila?.valor);
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Age in days of an ISO date, or Infinity when it is missing or unreadable. */
export function edadEnDias(iso: string | null | undefined, ahora: Date = new Date()): number {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(t)) return Infinity;
  return (ahora.getTime() - t) / DIA_MS;
}

/** True when the catalog snapshot is older than the limit (or was never downloaded): no new offline sales. */
export function catalogoVencido(actualizadoEn: string | null, ahora: Date = new Date(), dias = RETENCION_DIAS): boolean {
  return edadEnDias(actualizadoEn, ahora) > dias;
}

/** True when a queued sale is older than the limit. It is flagged in the UI but still synced, never deleted. */
export function ventaAntigua(creadoEn: string, ahora: Date = new Date(), dias = RETENCION_DIAS): boolean {
  return edadEnDias(creadoEn, ahora) > dias;
}
