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

export interface Generar3DRequest {
  fotoPrenda: string;
  nombrePrenda?: string;
  productoId?: string;
  categoria?: string;
}

export interface Generar3DResponse {
  success: boolean;
  modelo3dUrl: string;
  nombrePrenda: string;
  fuente: 'hunyuan3d-2' | 'cache' | 'fallback';
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

  // Generar o consultar modelo 3D (.glb) con Hunyuan3D-2
  generarModelo3D: async (payload: Generar3DRequest): Promise<Generar3DResponse> => {
    const { data } = await api.post<Generar3DResponse>('/probador/generar-3d', payload);
    return data;
  },
};
