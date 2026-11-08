/** One line of the cart that identifies a payment attempt. */
export interface LineaHuella {
  varianteId: string;
  cantidad: number;
}

/**
 * Stable identity of a cart. Order does not matter: the same lines always produce the same string.
 */
export function huellaCarrito(items: LineaHuella[]): string {
  return [...items]
    .map((item) => `${item.varianteId}:${item.cantidad}`)
    .sort()
    .join(',');
}

export interface GestorClavePago {
  /** Reuses the key while the cart and the amount stay the same. Either change rotates it. */
  clave(carrito: string, monto: number): string;
}

/** One UUID per payment attempt. Retries of that attempt reuse it; a new cart or amount gets a new one. */
export function crearGestorClavePago(nuevoId: () => string): GestorClavePago {
  let anterior = '';
  let clave = '';
  return {
    clave(carrito, monto) {
      const huella = `${carrito}\n${monto}`;
      if (huella !== anterior) {
        anterior = huella;
        clave = nuevoId();
      }
      return clave;
    },
  };
}

/** Header every payment POST must send (C6). */
export function cabeceraIdempotencia(clave: string): { headers: { 'Idempotency-Key': string } } {
  return { headers: { 'Idempotency-Key': clave } };
}
