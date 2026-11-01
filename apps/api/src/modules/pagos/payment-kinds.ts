/** The family a payment method belongs to, read from the name the store gave it. */
export type TipoPago = 'tarjeta' | 'contra_entrega' | 'qr' | 'otro';

export const tipoDePago = (nombre?: string | null): TipoPago => {
  const n = (nombre ?? '').toLowerCase();
  if (/\bqr\b|transferencia/.test(n)) return 'qr';
  if (/efectivo|contra\s*entrega/.test(n)) return 'contra_entrega';
  if (/tarjeta|stripe|cr[eé]dito|d[eé]bito/.test(n)) return 'tarjeta';
  return 'otro';
};
