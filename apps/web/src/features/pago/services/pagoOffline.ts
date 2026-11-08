export type MetodoCheckout = 'tarjeta' | 'qr' | 'contra_entrega';

const MENSAJE_TARJETA = 'Sin conexión no se puede pagar con tarjeta. El cobro con tarjeta necesita internet.';
const MENSAJE_QR = 'Sin conexión no se puede pagar con QR. Un QR no se puede cobrar sin conexión.';

/** Card and QR cannot be charged offline. Cash on delivery stays available. */
export function mensajePagoOffline(metodo: MetodoCheckout, enLinea: boolean): string | null {
  if (enLinea || metodo === 'contra_entrega') return null;
  return metodo === 'qr' ? MENSAJE_QR : MENSAJE_TARJETA;
}
