import { api } from '../../../services/api';
import {
  DashboardMetricas,
  ProductoMasVendido,
  AlertaStock,
  ReporteVentasRespuesta,
  ReporteVentasFiltros,
  UsuariosNuevosRespuesta,
} from '../types';

export const adminApi = {
  // HU-89: Dashboard Resumen de Ventas
  obtenerDashboardResumen: async (): Promise<DashboardMetricas> => {
    const res = await api.get<DashboardMetricas>('/admin/dashboard/resumen');
    return res.data;
  },

  // HU-90: Productos Más Vendidos
  obtenerProductosTop: async (limite: number = 8): Promise<ProductoMasVendido[]> => {
    const res = await api.get<ProductoMasVendido[]>('/admin/dashboard/productos-top', {
      params: { limite },
    });
    return res.data;
  },

  // HU-91: Stock Bajo / Alertas
  obtenerStockBajo: async (): Promise<AlertaStock[]> => {
    const res = await api.get<AlertaStock[]>('/admin/dashboard/stock-bajo');
    return res.data;
  },

  // HU-92: Reportes de Ventas
  generarReporteVentas: async (filtros: ReporteVentasFiltros): Promise<ReporteVentasRespuesta> => {
    const res = await api.get<ReporteVentasRespuesta>('/admin/reportes/ventas', {
      params: filtros,
    });
    return res.data;
  },

  // HU-93: Usuarios Nuevos por Mes
  obtenerUsuariosMes: async (meses: number = 6): Promise<UsuariosNuevosRespuesta> => {
    const res = await api.get<UsuariosNuevosRespuesta>('/admin/dashboard/usuarios-mes', {
      params: { meses },
    });
    return res.data;
  },

  // REPORTES DINÁMICOS POR VOZ / IA
  generarReporteDinamico: async (
    prompt: string,
    proveedor: 'GROQ' | 'OLLAMA' = 'GROQ',
  ): Promise<import('../types').ReporteDinamicoResultado> => {
    const res = await api.post<import('../types').ReporteDinamicoResultado>(
      '/admin/reportes-dinamicos/generar',
      { prompt, proveedor },
    );
    return res.data;
  },

  ejecutarSqlReporte: async (
    sql: string,
  ): Promise<{ sql: string; columnas: string[]; filas: Record<string, any>[]; totalFilas: number; tiempoEjecucionMs: number }> => {
    const res = await api.post('/admin/reportes-dinamicos/ejecutar-sql', { sql });
    return res.data;
  },
};
