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

/** A store is always created in the free trial; a paid plan chosen at sign-up is bought right after. */
export function destinoTrasCrearTienda(planElegido: string | null | undefined): string {
  return esPlanDePago(planElegido) ? `/planes?elegido=${planElegido}` : '/admin';
}

export const PLAN_NOMBRES_FALLBACK: Record<string, string> = {
  FREE_TRIAL: 'Free Trial',
  ESTANDAR: 'Estándar',
  CORPORATIVO: 'Corporativo',
};

export const SEGUNDOS_MAXIMOS_DE_ESPERA = 60;

export type FaseCompra =
  | { fase: 'CONFIRMANDO' }
  | { fase: 'ACTIVA'; plan: string; venceEn: string | null }
  | { fase: 'NO_COMPLETADO'; motivo: 'EXPIRADA' | 'FALLIDA' }
  | { fase: 'DEMORA' };

/**
 * What the return screen should say. The plan is activated by Stripe's webhook, so right after paying the purchase
 * is still pending for a moment: keep waiting, and only after a while admit the confirmation is taking long.
 */
export function interpretarCompra(estado: EstadoCompraPlan | undefined, segundosEsperando: number): FaseCompra {
  if (estado?.estado === 'ACTIVA') return { fase: 'ACTIVA', plan: estado.plan, venceEn: estado.venceEn };
  if (estado?.estado === 'EXPIRADA' || estado?.estado === 'FALLIDA') return { fase: 'NO_COMPLETADO', motivo: estado.estado };
  return segundosEsperando >= SEGUNDOS_MAXIMOS_DE_ESPERA ? { fase: 'DEMORA' } : { fase: 'CONFIRMANDO' };
}
