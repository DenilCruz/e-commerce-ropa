import { api } from '../../../services/api';
import { Direccion, ActualizarPerfilPayload, CrearDireccionPayload } from '../types';
import { UserProfile } from '../../autenticacion/types';

export const perfilApi = {
  obtenerPerfil: async (usuarioId: string): Promise<UserProfile> => {
    const response = await api.get(`/usuarios/${usuarioId}/perfil`);
    return response.data;
  },

  actualizarPerfil: async (usuarioId: string, payload: ActualizarPerfilPayload): Promise<UserProfile> => {
    const response = await api.put(`/usuarios/${usuarioId}/perfil`, payload);
    return response.data;
  },

  obtenerDirecciones: async (usuarioId: string): Promise<Direccion[]> => {
    const response = await api.get(`/usuarios/${usuarioId}/direcciones`);
    return response.data;
  },

  agregarDireccion: async (usuarioId: string, payload: CrearDireccionPayload): Promise<Direccion> => {
    const response = await api.post(`/usuarios/${usuarioId}/direcciones`, payload);
    return response.data;
  },

  eliminarDireccion: async (usuarioId: string, direccionId: string): Promise<void> => {
    await api.delete(`/usuarios/${usuarioId}/direcciones/${direccionId}`);
  }
};
