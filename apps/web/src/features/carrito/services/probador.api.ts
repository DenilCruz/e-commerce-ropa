import { api } from '../../../services/api';

export interface ModeloBase {
  id: string;
  nombre: string;
  genero: 'mujer' | 'hombre';
  tipoCuerpo: string;
  estatura: string;
  fotoUrl: string;
}

export interface ProbarPrendaRequest {
  fotoPersona: string;
  fotoPrenda: string;
  categoria?: 'tops' | 'bottoms' | 'dresses';
  nombrePrenda?: string;
  talla?: string;
  color?: string;
}

export interface ProbarPrendaResponse {
  success: boolean;
  imagenResultadoUrl: string;
  imagenOriginalPersona: string;
  imagenPrenda: string;
  nombrePrenda: string;
  talla?: string;
  color?: string;
  tiempoProcesamientoSegundos: number;
}

export const probadorApi = {
  // Obtener avatares/modelos predeterminados
  obtenerModelosBase: async (): Promise<ModeloBase[]> => {
    const { data } = await api.get<ModeloBase[]>('/probador/modelos');
    return data;
  },

  // Ejecutar prueba virtual con IDM-VTON
  probarPrenda: async (payload: ProbarPrendaRequest): Promise<ProbarPrendaResponse> => {
    const { data } = await api.post<ProbarPrendaResponse>('/probador/try-on', payload);
    return data;
  },
};
