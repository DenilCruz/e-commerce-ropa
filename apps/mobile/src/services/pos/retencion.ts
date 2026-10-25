/** How long data kept on the device stays valid (teacher: "hasta siete días"). Change it here only. */
export const RETENCION_DIAS = 7;

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
