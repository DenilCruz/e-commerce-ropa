import { api } from './api';

export interface DireccionEnvio {
  id: string;
  usuarioId: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  codigoPostal?: string;
  referencia?: string;
  esPredeterminada: boolean;
}

export const perfilApi = {
  obtenerPerfil: async (id: string) => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },

  actualizarPerfil: async (
    id: string,
    datos: {
      nombre?: string;
      apellido?: string;
      celular?: string;
      ci?: string;
      foto?: string;
    },
  ) => {
    const response = await api.put(`/usuarios/${id}`, datos);
    return response.data;
  },

  cambiarPassword: async (
    id: string,
    passwordActual: string,
    nuevoPassword: string,
  ) => {
    const response = await api.post(`/usuarios/${id}/cambiar-contrasena`, {
      passwordActual,
      nuevoPassword,
    });
    return response.data;
  },

  obtenerDirecciones: async (usuarioId: string): Promise<DireccionEnvio[]> => {
    const response = await api.get(`/usuarios/${usuarioId}/direcciones`);
    return response.data;
  },

  crearDireccion: async (
    usuarioId: string,
    datos: {
      direccion: string;
      ciudad: string;
      departamento: string;
      codigoPostal?: string;
      referencia?: string;
      esPredeterminada?: boolean;
    },
  ): Promise<DireccionEnvio> => {
    const response = await api.post(`/usuarios/${usuarioId}/direcciones`, datos);
    return response.data;
  },

  eliminarDireccion: async (id: string): Promise<void> => {
    await api.delete(`/usuarios/direcciones/${id}`);
  },

  marcarPredeterminada: async (id: string, usuarioId: string): Promise<void> => {
    await api.put(`/usuarios/direcciones/${id}/predeterminada`, { usuarioId });
  },
};
