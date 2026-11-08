/** One payment attempt: the same cart and amount keep the key; either change rotates it. */

export interface ClavePago {
  firma: string;
  clave: string;
}

/** Fingerprint of the cart and the amount. The server key is not derived from the rest of the body. */
export function firmaIntentoPago(carrito: unknown, monto: number): string {
  return JSON.stringify({ carrito, monto });
}

/** Reuses `anterior` when the fingerprint is unchanged. `crearClave` runs only for a new attempt. */
export function claveDeIntento(anterior: ClavePago | null, firma: string, crearClave: () => string): ClavePago {
  if (anterior && anterior.firma === firma) return anterior;
  return { firma, clave: crearClave() };
}

/** Same rule, keyed by an id (a refund of one order), so a retry does not mint a second key. */
export function recordarClave(memoria: Map<string, ClavePago>, id: string, firma: string, crearClave: () => string): string {
  const siguiente = claveDeIntento(memoria.get(id) ?? null, firma, crearClave);
  memoria.set(id, siguiente);
  return siguiente.clave;
}

/** Checkout attempt: rotate only when the cart or the amount changes. */
export function prepararIntentoPago(anterior: ClavePago | null, carrito: unknown, monto: number, crearClave: () => string): ClavePago {
  return claveDeIntento(anterior, firmaIntentoPago(carrito, monto), crearClave);
}

export function encabezadoIdempotencia(clave: string): { headers: { 'Idempotency-Key': string } } {
  return { headers: { 'Idempotency-Key': clave } };
}
