import { api } from '../../../services/api';

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  celular?: string;
  foto?: string;
  activo: boolean;
  emailVerificado: boolean;
  rolId: string;
  rol?: {
    id: string;
    nombre: string;
    descripcion?: string;
  };
  creadoEn: string;
}

export interface ListarUsuariosResponse {
  usuarios: UsuarioAdmin[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export const adminUsuariosApi = {
  listarUsuarios: async (pagina = 1, limite = 10, busqueda = ''): Promise<ListarUsuariosResponse> => {
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: String(limite),
      ...(busqueda.trim() ? { busqueda: busqueda.trim() } : {}),
    });
    const response = await api.get(`/usuarios?${params.toString()}`);
    return response.data;
  },

  obtenerRoles: async (): Promise<any[]> => {
    const response = await api.get('/usuarios/roles');
    return response.data;
  },

  toggleBloqueo: async (id: string): Promise<UsuarioAdmin> => {
    const response = await api.put(`/usuarios/${id}/toggle-bloqueo`);
    return response.data;
  },

  cambiarRol: async (id: string, rolId: string): Promise<UsuarioAdmin> => {
    const response = await api.put(`/usuarios/${id}/rol`, { rolId });
    return response.data;
  },
};
