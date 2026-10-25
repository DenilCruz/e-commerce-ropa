import { api } from '../../../services/api';
import { CrearTiendaRequest, MiTienda, SesionTiendaResponse } from '../types';

export const tiendasApi = {
  listarMias: async (): Promise<MiTienda[]> => {
    const res = await api.get<MiTienda[]>('/auth/tiendas');
    return res.data;
  },

  seleccionar: async (tiendaId: string): Promise<SesionTiendaResponse> => {
    const res = await api.post<SesionTiendaResponse>(`/auth/tiendas/${tiendaId}/seleccionar`);
    return res.data;
  },

  crear: async (data: CrearTiendaRequest): Promise<SesionTiendaResponse> => {
    const res = await api.post<SesionTiendaResponse>('/auth/tiendas', data);
    return res.data;
  },
};
