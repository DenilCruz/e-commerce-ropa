import { api } from '../../../../services/api';
import { 
  VarianteInventario, 
  InventarioKpis, 
  AjustarStockPayload, 
  ItemStockPayload, 
  ProcesarStockPedidoResultado 
} from '../types';

export const inventoryApi = {
  // HU-35: Ver el stock actual por variante con filtros
  obtenerVariantes: async (busqueda?: string, estado?: string): Promise<VarianteInventario[]> => {
    const params: Record<string, string> = {};
    if (busqueda && busqueda.trim()) params.busqueda = busqueda.trim();
    if (estado && estado !== 'todos') params.estado = estado;

    const response = await api.get('/inventario/variantes', { params });
    return response.data;
  },

  // Métricas globales en tiempo real
  obtenerKpis: async (): Promise<InventarioKpis> => {
    const response = await api.get('/inventario/kpis');
    return response.data;
  },

  // HU-37: Alertas de stock bajo o nulo
  obtenerAlertas: async (): Promise<VarianteInventario[]> => {
    const response = await api.get('/inventario/alertas');
    return response.data;
  },

  // HU-36: Actualizar stock (llegada de mercadería, ajuste o merma)
  ajustarStock: async (varianteId: string, payload: AjustarStockPayload): Promise<VarianteInventario> => {
    const response = await api.put(`/inventario/variante/${varianteId}/ajustar`, payload);
    return response.data;
  },

  // HU-38: Descontar stock automáticamente por confirmación de pedido (Rol Sistema)
  descontarStock: async (items: ItemStockPayload[]): Promise<ProcesarStockPedidoResultado> => {
    const response = await api.post('/inventario/descontar', { items });
    return response.data;
  },

  // HU-39: Devolver stock por cancelación de pedido (Rol Sistema)
  devolverStock: async (items: ItemStockPayload[]): Promise<ProcesarStockPedidoResultado> => {
    const response = await api.post('/inventario/devolver', { items });
    return response.data;
  },
};
