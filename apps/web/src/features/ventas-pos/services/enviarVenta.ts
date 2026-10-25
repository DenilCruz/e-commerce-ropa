import { api } from '../../../services/api';
import { VentaLocal } from '../types';
import { OrdenRegistrada } from './sincronizador';

/** Posts one queued sale to the server. The sale id is the Idempotency-Key, so a retry never duplicates it. */
export async function enviarVentaPorApi(venta: VentaLocal): Promise<OrdenRegistrada> {
  const respuesta = await api.post(
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
}
