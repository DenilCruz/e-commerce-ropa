import { TipoPago } from '../pagos/payment-kinds';

/**
 * What an admin may do to an order, and what each move implies for its payment and stock. Keeping this pure makes
 * the rules testable and keeps a cancelled order from being revived (which would restore its stock a second time).
 */
export const ESTADOS_ORDEN = ['PENDIENTE', 'PAGADO', 'COMPLETADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO', 'REEMBOLSADO'] as const;
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];

const SIGUIENTES: Record<EstadoOrden, EstadoOrden[]> = {
  PENDIENTE: ['PAGADO', 'ENVIADO', 'CANCELADO'],
  PAGADO: ['ENVIADO', 'CANCELADO', 'REEMBOLSADO'],
  COMPLETADO: ['REEMBOLSADO'],
  ENVIADO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: ['REEMBOLSADO'],
  CANCELADO: [],
  REEMBOLSADO: [],
};

export interface ContextoPago {
  tipo: TipoPago;
  estado: string | null; // PENDIENTE | APROBADO | RECHAZADO | REEMBOLSADO | null when there is no payment
}

/** The reason the move is not allowed, or null when it is. */
export const motivoTransicionInvalida = (desde: string, hacia: string, pago: ContextoPago): string | null => {
  if (!(ESTADOS_ORDEN as readonly string[]).includes(hacia)) {
    return `Estado no válido. Valores permitidos: ${ESTADOS_ORDEN.join(', ')}`;
  }
  const origen = desde as EstadoOrden;
  if (!SIGUIENTES[origen]) return `El pedido está en un estado desconocido (${desde}).`;
  if (SIGUIENTES[origen].length === 0) {
    return `Un pedido ${desde.toLowerCase()} ya no admite cambios de estado.`;
  }
  if (!SIGUIENTES[origen].includes(hacia as EstadoOrden)) {
    return `No se puede pasar un pedido de ${desde} a ${hacia}.`;
  }
  // Only cash on delivery ships before it is paid; any other payment must be confirmed first.
  if (hacia === 'ENVIADO' && desde === 'PENDIENTE' && pago.tipo !== 'contra_entrega') {
    return 'Confirma el pago del pedido antes de despacharlo.';
  }
  return null;
};

export interface EfectosTransicion {
  /** New state of the payment record, or null to leave it as it is. */
  pago: 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO' | null;
  /** Whether the reserved units go back to stock. */
  restaurarStock: boolean;
}

export const efectosDeTransicion = (desde: string, hacia: string, pago: ContextoPago): EfectosTransicion => {
  const sinPago = pago.estado == null;
  let nuevoPago: EfectosTransicion['pago'] = null;

  if (!sinPago) {
    if (hacia === 'PAGADO' && pago.estado === 'PENDIENTE') nuevoPago = 'APROBADO';
    // Cash is collected when the parcel is handed over.
    if (hacia === 'ENTREGADO' && pago.tipo === 'contra_entrega' && pago.estado === 'PENDIENTE') nuevoPago = 'APROBADO';
    if (hacia === 'CANCELADO') nuevoPago = pago.estado === 'PENDIENTE' ? 'RECHAZADO' : pago.estado === 'APROBADO' ? 'REEMBOLSADO' : null;
    if (hacia === 'REEMBOLSADO' && pago.estado === 'APROBADO') nuevoPago = 'REEMBOLSADO';
  }

  const terminal = desde === 'CANCELADO' || desde === 'REEMBOLSADO';
  return { pago: nuevoPago, restaurarStock: (hacia === 'CANCELADO' || hacia === 'REEMBOLSADO') && !terminal };
};
