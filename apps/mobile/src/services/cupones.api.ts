import { api } from './api';

export interface CuponAplicado {
  id: string;
  codigo: string;
  descripcion?: string;
  tipo: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  montoMinimo?: number;
}

export interface AplicarCuponResponse {
  valido: boolean;
  cupon: CuponAplicado;
  subtotal: number;
  descuento: number;
  totalConDescuento: number;
  mensaje: string;
}

export const cuponesApi = {
  aplicarCupon: async (codigo: string, subtotal: number): Promise<AplicarCuponResponse> => {
    const res = await api.post<AplicarCuponResponse>('/cupones/aplicar', {
      codigo: codigo.trim().toUpperCase(),
      subtotal,
    });
    return res.data;
  },
};
