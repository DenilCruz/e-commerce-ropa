import { api } from '../../../../services/api';
import { AlertaInventario, AjustarStockPayload } from '../types';

export const inventoryApi = {
  obtenerAlertas: async (): Promise<AlertaInventario[]> => {
    const response = await api.get('/inventario/alertas');
    return response.data;
  },

  ajustarStock: async (varianteId: string, payload: AjustarStockPayload): Promise<void> => {
    await api.put(`/inventario/variante/${varianteId}/ajustar`, payload);
  }
};
