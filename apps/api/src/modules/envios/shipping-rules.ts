/**
 * How a shipping method is priced. The quote endpoint and every payment flow use these functions, so the price a
 * customer is shown is the price that is charged, and a cost edited in the admin panel takes effect everywhere.
 */
export const UMBRAL_ENVIO_GRATIS = 200;

export const esEnvioEstandar = (nombre: string): boolean => /est[aá]ndar/i.test(nombre);
export const esEnvioExpress = (nombre: string): boolean => /express/i.test(nombre);

export interface MetodoEnvioPrecio {
  nombre: string;
  costo: number | string;
}

/** The standard method is free from the threshold; any other method costs what the store configured. */
export const costoDeEnvio = (metodo: MetodoEnvioPrecio, subtotal: number): number => {
  const base = Math.max(0, Number(metodo.costo) || 0);
  return esEnvioEstandar(metodo.nombre) && subtotal >= UMBRAL_ENVIO_GRATIS ? 0 : base;
};

/** Days the courier needs, used for the estimated delivery date. */
export const diasDeEntrega = (metodo: { nombre: string }): number => (esEnvioExpress(metodo.nombre) ? 1 : 3);

/**
 * Picks the method for an order when the client names none: the one matching the requested type, otherwise the
 * cheapest active one. Returns null when the store has no active method.
 */
export const elegirMetodoPorTipo = <T extends MetodoEnvioPrecio>(activos: T[], tipoEnvio?: string): T | null => {
  const express = tipoEnvio?.toUpperCase() === 'EXPRESS';
  const coincidencia = activos.find((m) => (express ? esEnvioExpress(m.nombre) : esEnvioEstandar(m.nombre)));
  if (coincidencia) return coincidencia;
  return [...activos].sort((a, b) => Number(a.costo) - Number(b.costo))[0] ?? null;
};
