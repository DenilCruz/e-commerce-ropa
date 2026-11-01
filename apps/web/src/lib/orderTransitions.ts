import { TipoPago } from './paymentKind';

/** The states an order may move to from each state; the API enforces the same table (order-transitions.ts). */
const SIGUIENTES: Record<string, string[]> = {
  PENDIENTE: ['PAGADO', 'ENVIADO', 'CANCELADO'],
  PAGADO: ['ENVIADO', 'CANCELADO', 'REEMBOLSADO'],
  COMPLETADO: ['REEMBOLSADO'],
  ENVIADO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: ['REEMBOLSADO'],
  CANCELADO: [],
  REEMBOLSADO: [],
};

/**
 * Moves offered to the admin: only cash on delivery may ship before it is paid, and a card refund is made with the
 * "Reembolsar" action (it returns the money through the gateway), not with a status change.
 */
export const estadosPermitidos = (desde: string, tipoPago: TipoPago): string[] =>
  (SIGUIENTES[desde] ?? []).filter(
    (hacia) =>
      !(desde === 'PENDIENTE' && hacia === 'ENVIADO' && tipoPago !== 'contra_entrega') &&
      !(hacia === 'REEMBOLSADO' && tipoPago === 'tarjeta'),
  );
