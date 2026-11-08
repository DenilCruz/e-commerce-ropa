import type { EstadoCompraPlan } from '../services/planes.api';

export type PlanId = 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO';

const ORDEN: Record<PlanId, number> = { FREE_TRIAL: 0, ESTANDAR: 1, CORPORATIVO: 2 };

/** Moving to a cheaper plan needs no payment; anything else has to be bought through Stripe. */
export function esBajaDePlan(actual: string | null | undefined, elegido: PlanId): boolean {
  const planActual = (actual && actual in ORDEN ? (actual as PlanId) : 'FREE_TRIAL') as PlanId;
  return ORDEN[elegido] < ORDEN[planActual];
}

export const esPlanDePago = (plan: string | null | undefined): plan is 'ESTANDAR' | 'CORPORATIVO' =>
  plan === 'ESTANDAR' || plan === 'CORPORATIVO';

export type PeriodoCompra = 'MENSUAL' | 'ANUAL';

/** Amount charged each period, in USD. Mirrors PLANES_CONFIG on the API (annual: 12 months at the discounted monthly price). */
const PRECIO_MENSUAL: Record<string, number> = { ESTANDAR: 20, CORPORATIVO: 100 };
const PRECIO_MENSUAL_ANUAL: Record<string, number> = { ESTANDAR: 16, CORPORATIVO: 80 };

export function precioDelPlan(plan: string, periodo: PeriodoCompra): number {
  if (periodo === 'ANUAL') return (PRECIO_MENSUAL_ANUAL[plan] ?? 0) * 12;
  return PRECIO_MENSUAL[plan] ?? 0;
}

/** The store a visitor asked for at sign-up. It is kept until the store exists, then forgotten. */
export interface AltaPendiente {
  nombre: string;
  plan: string;
  periodo: PeriodoCompra;
}

const CLAVES_ALTA = { nombre: 'pending_store_name', plan: 'pending_store_plan', periodo: 'pending_store_periodo' } as const;

export function guardarAltaPendiente(alta: AltaPendiente): void {
  localStorage.setItem(CLAVES_ALTA.nombre, alta.nombre.trim());
  localStorage.setItem(CLAVES_ALTA.plan, alta.plan);
  localStorage.setItem(CLAVES_ALTA.periodo, alta.periodo);
}

export function leerAltaPendiente(): AltaPendiente | null {
  const nombre = localStorage.getItem(CLAVES_ALTA.nombre)?.trim();
  if (!nombre) return null;
  return {
    nombre,
    plan: localStorage.getItem(CLAVES_ALTA.plan) || 'FREE_TRIAL',
    periodo: localStorage.getItem(CLAVES_ALTA.periodo) === 'ANUAL' ? 'ANUAL' : 'MENSUAL',
  };
}

export function limpiarAltaPendiente(): void {
  Object.values(CLAVES_ALTA).forEach((clave) => localStorage.removeItem(clave));
}

/** Luhn checksum, the same check the server runs before contacting the (simulated) bank. */
export function numeroDeTarjetaValido(numero: string): boolean {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19) return false;
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let valor = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      valor *= 2;
      if (valor > 9) valor -= 9;
    }
    suma += valor;
  }
  return suma % 10 === 0;
}

/** MM/AA or MM/AAAA, valid through the last day of that month. */
export function expiracionVigente(expiracion: string, ahora: Date = new Date()): boolean {
  const m = /^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/.exec(expiracion.trim());
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  return new Date(anio, mes, 1).getTime() > ahora.getTime();
}

/** Groups digits by four as the customer types: "4242424242424242" -> "4242 4242 4242 4242". */
export function formatearNumeroDeTarjeta(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

export const PLAN_NOMBRES_FALLBACK: Record<string, string> = {
  FREE_TRIAL: 'Free Trial',
  ESTANDAR: 'Estándar',
  CORPORATIVO: 'Corporativo',
};

export const SEGUNDOS_MAXIMOS_DE_ESPERA = 60;

export type FaseCompra =
  | { fase: 'CONFIRMANDO' }
  | { fase: 'ACTIVA'; plan: string; venceEn: string | null; tipo?: 'ALTA_TIENDA' | 'PLAN'; tienda: { id: string; slug: string; nombre: string } | null; nombreTienda: string | null }
  | { fase: 'NO_COMPLETADO'; motivo: 'EXPIRADA' | 'FALLIDA' }
  | { fase: 'DEMORA' };

/**
 * What the return screen should say. The plan is activated by Stripe's webhook, so right after paying the purchase
 * is still pending for a moment: keep waiting, and only after a while admit the confirmation is taking long.
 */
export function interpretarCompra(estado: EstadoCompraPlan | undefined, segundosEsperando: number): FaseCompra {
  if (estado?.estado === 'ACTIVA') {
    return { fase: 'ACTIVA', plan: estado.plan, venceEn: estado.venceEn, tipo: estado.tipo, tienda: estado.tienda ?? null, nombreTienda: estado.nombreTienda ?? null };
  }
  if (estado?.estado === 'EXPIRADA' || estado?.estado === 'FALLIDA') return { fase: 'NO_COMPLETADO', motivo: estado.estado };
  return segundosEsperando >= SEGUNDOS_MAXIMOS_DE_ESPERA ? { fase: 'DEMORA' } : { fase: 'CONFIRMANDO' };
}
