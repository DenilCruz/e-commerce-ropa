/**
 * How long data may stay on the device without being renewed. The teacher asked that local persistence
 * is not indefinite and that the business sets the limit (hours or days, usually up to seven days).
 * Change it per deployment with VITE_POS_RETENCION_DIAS (fractions allowed: 0.5 = twelve hours).
 */
const configurado = Number(import.meta.env?.VITE_POS_RETENCION_DIAS);
export const RETENCION_DIAS = Number.isFinite(configurado) && configurado > 0 ? configurado : 7;

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
