import React, { useEffect, useState } from 'react';
import { adminUsuariosApi, UsuarioAdmin } from './admin-usuarios.api';
import { toast } from 'sonner';
import { Search, X, CheckCircle2, Ban, Users } from 'lucide-react';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const AdminUsersPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // HU-15: Paginación y Búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const limite = 8;

  useEffect(() => {
    cargarRoles();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      cargarUsuarios(pagina, busqueda);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [pagina, busqueda]);

  const cargarRoles = async () => {
    try {
      const data = await adminUsuariosApi.obtenerRoles();
      setRoles(data);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarUsuarios = async (pag: number, q: string) => {
    try {
      setLoading(true);
      const res = await adminUsuariosApi.listarUsuarios(pag, limite, q);
      setUsuarios(res.usuarios);
      setTotalPaginas(res.totalPaginas || 1);
      setTotalUsuarios(res.total || 0);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  // HU-16: Bloquear / Desbloquear usuario
  const handleToggleBloqueo = async (u: UsuarioAdmin) => {
    const accion = u.activo ? 'bloquear' : 'desbloquear';
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} al usuario ${u.nombre} ${u.apellido}?`)) {
      return;
    }

    try {
      const actualizado = await adminUsuariosApi.toggleBloqueo(u.id);
      setUsuarios(prev => prev.map(item => item.id === u.id ? { ...item, activo: actualizado.activo } : item));
      toast.success(`Usuario ${actualizado.activo ? 'desbloqueado' : 'bloqueado'} con éxito.`);
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado del usuario');
    }
  };

  // HU-17: Cambiar Rol (CLIENTE <-> ADMIN)
  const handleCambiarRol = async (usuarioId: string, nuevoRolId: string, nombreUsuario: string) => {
    try {
      const actualizado = await adminUsuariosApi.cambiarRol(usuarioId, nuevoRolId);
      setUsuarios(prev => prev.map(item => item.id === usuarioId ? { ...item, rol: actualizado.rol, rolId: actualizado.rolId } : item));
      toast.success(`Rol de ${nombreUsuario} actualizado a ${actualizado.rol?.nombre || 'nuevo rol'}.`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Error al cambiar rol del usuario');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-black" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-500 mt-1">Control de accesos, roles y usuarios del sistema (HU-15, HU-16, HU-17)</p>
        </div>
      </div>

      {/* Barra de Búsqueda y Estadísticas Rápidas (HU-15) */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={busqueda}
            onChange={e => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por nombre, apellido o correo..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black shadow-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          {busqueda && (
            <button
              onClick={() => {
                setBusqueda('');
                setPagina(1);
              }}
              className="absolute right-3.5 top-2.5 text-gray-400 hover:text-black p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-sm text-gray-500 font-medium">
          Total: <strong className="text-gray-900">{totalUsuarios}</strong> usuarios registrados
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol (HU-17)</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado (HU-16)</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registrado</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">Cargando usuarios...</td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                  No se encontraron usuarios {busqueda ? `con el término "${busqueda}"` : ''}
                </td>
              </tr>
            ) : (
              usuarios.map(u => {
                const nombreRol = u.rol?.nombre?.toUpperCase() || 'CLIENTE';
                const esAdmin = nombreRol === 'ADMIN';

                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    
                    {/* Foto y Datos */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                          {u.foto ? (
                            <img src={getImageUrl(u.foto)} alt={u.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <span>{u.nombre.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{u.nombre} {u.apellido}</div>
                          <div className="text-xs text-gray-500">{u.correo}</div>
                        </div>
                      </div>
                    </td>

                    {/* Teléfono */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.celular || '-'}
                    </td>

                    {/* HU-17: Cambiar Rol */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={u.rolId}
                        onChange={e => handleCambiarRol(u.id, e.target.value, `${u.nombre} ${u.apellido}`)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border cursor-pointer outline-none ${
                          esAdmin 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* HU-16: Bloqueo de usuarios */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.activo 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {u.activo ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Activo
                          </>
                        ) : (
                          <>
                            <Ban className="w-3 h-3" /> Bloqueado
                          </>
                        )}
                      </span>
                    </td>

                    {/* Fecha de Registro */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(u.creadoEn).toLocaleDateString()}
                    </td>

                    {/* Botón de acción */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleToggleBloqueo(u)}
                        className={`text-xs font-semibold px-3 py-1 rounded border transition-colors ${
                          u.activo
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.activo ? 'Bloquear' : 'Desbloquear'}
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginación (HU-15) */}
      {totalPaginas > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          <span className="text-sm text-gray-600 font-medium">
            Página {pagina} de {totalPaginas}
          </span>

          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
};
