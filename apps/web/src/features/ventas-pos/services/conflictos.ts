import { LineaVenta } from './ventasLocales';
import { VentaLocal } from '../types';

/** Lines of a conflicted sale cut down to what the server said it still has; items with none left are dropped. */
export function ajustarAlDisponible(venta: Pick<VentaLocal, 'items' | 'conflicto'>): LineaVenta[] {
  const disponible = new Map((venta.conflicto ?? []).map((c) => [c.varianteId, c.disponible]));
  return venta.items
    .map((i) => ({ varianteId: i.varianteId, cantidad: Math.min(i.cantidad, disponible.get(i.varianteId) ?? i.cantidad) }))
    .filter((l) => l.cantidad > 0);
}
