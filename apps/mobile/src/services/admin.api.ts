import { api } from './api';

export interface ReporteDinamicoResultado {
  prompt: string;
  proveedor: 'GROQ' | 'OLLAMA';
  exito: boolean;
  resumen: string;
  sql: string;
  columnas: string[];
  filas: Record<string, any>[];
  totalFilas: number;
  tiempoProcesamientoMs: number;
  modeloUtilizado: string;
  error?: string;
}

export const adminApi = {
  // Generar reporte dinámico por consulta en lenguaje natural / IA
  generarReporteDinamico: async (
    prompt: string,
    proveedor: 'GROQ' | 'OLLAMA' = 'GROQ'
  ): Promise<ReporteDinamicoResultado> => {
    const res = await api.post<ReporteDinamicoResultado>('/admin/reportes-dinamicos/generar', {
      prompt,
      proveedor,
    });
    return res.data;
  },

  // Ejecutar consulta SQL personalizada de reporte
  ejecutarSqlReporte: async (
    sql: string
  ): Promise<{ sql: string; columnas: string[]; filas: Record<string, any>[]; totalFilas: number; tiempoEjecucionMs: number }> => {
    const res = await api.post('/admin/reportes-dinamicos/ejecutar-sql', { sql });
    return res.data;
  },
};
