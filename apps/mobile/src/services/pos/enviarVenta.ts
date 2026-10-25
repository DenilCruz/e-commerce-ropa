import { VentaLocal } from './types';
import { OrdenRegistrada } from './sincronizador';

/** The part of the axios instance this module needs. */
export interface ClientePost {
  post(url: string, cuerpo: unknown, config: { headers: Record<string, string> }): Promise<{ data: any }>;
}

/** Builds the sender of one queued sale. The sale id is the Idempotency-Key, so a retry never duplicates it. */
export function crearEnviarVenta(cliente: ClientePost) {
  return async (venta: VentaLocal): Promise<OrdenRegistrada> => {
    const respuesta = await cliente.post(
      '/sales/pos',
      {
        items: venta.items.map(({ varianteId, cantidad }) => ({ varianteId, cantidad })),
        clienteNombre: venta.clienteNombre,
        notas: venta.notas,
        vendidoEn: venta.creadoEn,
      },
      { headers: { 'Idempotency-Key': venta.id } },
    );
    const cuerpo = respuesta.data?.data ?? respuesta.data;
    return { ordenId: cuerpo.ordenId, nroOrden: cuerpo.nroOrden };
  };
}
