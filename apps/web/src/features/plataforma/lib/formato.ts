import type { EstadoSuscripcion, EstadoTienda, PlanId } from '../types';

export const ETIQUETA_PLAN: Record<PlanId, string> = {
  FREE_TRIAL: 'Prueba gratis',
  ESTANDAR: 'Estándar',
  CORPORATIVO: 'Corporativo',
};

export const ETIQUETA_ESTADO_TIENDA: Record<EstadoTienda, string> = {
  ACTIVA: 'Activa',
  SUSPENDIDA: 'Suspendida',
};

export const ETIQUETA_ESTADO_SUSCRIPCION: Record<EstadoSuscripcion, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  ACTIVA: 'Activa',
  FALLIDA: 'Fallida',
  EXPIRADA: 'Expirada',
};

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Dollar amount with two decimals; anything that is not a finite number shows as $0.00. */
export function formatearUsd(valor: number | string | null | undefined): string {
  const numero = Number(valor);
  return USD.format(Number.isFinite(numero) ? numero : 0);
}

/** Date in es-BO order (dd/mm/yyyy), or a dash when there is none or it is invalid. */
export function formatearFecha(valor: string | Date | null | undefined): string {
  if (!valor) return '—';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  const dd = String(fecha.getUTCDate()).padStart(2, '0');
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getUTCFullYear()}`;
}

export type SituacionVencimiento = 'sin-fecha' | 'vencido' | 'por-vencer' | 'vigente';

/** Expiry classification: expired, due within `diasAviso` days, or comfortably in the future. */
export function situacionVencimiento(
  venceEn: string | null | undefined,
  ahora: Date = new Date(),
  diasAviso = 7,
): SituacionVencimiento {
  if (!venceEn) return 'sin-fecha';
  const fecha = new Date(venceEn).getTime();
  if (Number.isNaN(fecha)) return 'sin-fecha';
  if (fecha < ahora.getTime()) return 'vencido';
  return fecha - ahora.getTime() <= diasAviso * 86_400_000 ? 'por-vencer' : 'vigente';
}

/** Total of a { key: count } map, ignoring non-numeric entries. */
export function sumarConteos(mapa: Record<string, number | undefined> | undefined): number {
  return Object.values(mapa ?? {}).reduce<number>((n, v) => n + (Number.isFinite(v) ? Number(v) : 0), 0);
}

/** Share of `parte` in `total` as a whole percentage (0 when there is no total). */
export function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/** Text shown under a table: "21-40 de 85". */
export function rangoPagina(pagina: number, limite: number, total: number): string {
  if (total === 0) return '0 resultados';
  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(pagina * limite, total);
  return `${desde}-${hasta} de ${total}`;
}

/** Drops empty filters so the API receives only what the operator chose. */
export function limpiarParametros<T extends object>(filtros: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== '' && valor !== undefined && valor !== null),
  ) as Partial<T>;
}
