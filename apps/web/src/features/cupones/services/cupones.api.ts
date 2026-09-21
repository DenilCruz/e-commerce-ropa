import { api } from '../../../services/api';
import { Cupon, CrearCuponPayload, AplicarCuponPayload } from '../types';
import { AplicarCuponResponse } from '../../carrito/types';

export const cuponesApi = {
  // Aplicar cupón de descuento al subtotal
  aplicarCupon: async (payload: AplicarCuponPayload): Promise<AplicarCuponResponse> => {
    const res = await api.post<AplicarCuponResponse>('/cupones/aplicar', payload);
    return res.data;
  },

  // Listar cupones (público / admin)
  listarCupones: async (soloActivos: boolean = false): Promise<Cupon[]> => {
    const res = await api.get<Cupon[]>('/cupones', {
      params: { soloActivos },
    });
    return res.data;
  },

  // Obtener detalle de un cupón
  obtenerPorId: async (id: string): Promise<Cupon> => {
    const res = await api.get<Cupon>(`/cupones/${id}`);
    return res.data;
  },

  // Crear nuevo cupón (Admin)
  crearCupon: async (payload: CrearCuponPayload): Promise<Cupon> => {
    const res = await api.post<Cupon>('/cupones', payload);
    return res.data;
  },

  // Actualizar cupón (Admin)
  actualizarCupon: async (id: string, payload: Partial<CrearCuponPayload>): Promise<Cupon> => {
    const res = await api.put<Cupon>(`/cupones/${id}`, payload);
    return res.data;
  },

  // Cambiar estado activo/inactivo (Admin)
  cambiarEstado: async (id: string, activo: boolean): Promise<Cupon> => {
    const res = await api.patch<Cupon>(`/cupones/${id}/estado`, { activo });
    return res.data;
  },

  // Eliminar cupón (Admin)
  eliminarCupon: async (id: string): Promise<{ exito: boolean; mensaje: string }> => {
    const res = await api.delete<{ exito: boolean; mensaje: string }>(`/cupones/${id}`);
    return res.data;
  },
};
