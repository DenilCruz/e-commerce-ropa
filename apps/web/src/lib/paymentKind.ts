/** The family a payment method belongs to, read from the name the store gave it (mirrors the API's payment-kinds). */
export type TipoPago = 'tarjeta' | 'contra_entrega' | 'qr' | 'otro';

export const tipoDePago = (nombre?: string | null): TipoPago => {
  const n = (nombre ?? '').toLowerCase();
  if (/\bqr\b|transferencia/.test(n)) return 'qr';
  if (/efectivo|contra\s*entrega/.test(n)) return 'contra_entrega';
  if (/tarjeta|stripe|cr[eé]dito|d[eé]bito/.test(n)) return 'tarjeta';
  return 'otro';
};

/** A bank receipt / operation number as the API accepts it. */
export const COMPROBANTE_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$/;
