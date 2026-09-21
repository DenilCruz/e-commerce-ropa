import React, { useEffect, useState } from 'react';
import { adminUsuariosApi, UsuarioAdmin } from './admin-usuarios.api';
import { adminApi } from '../services/admin.api';
import { UsuariosNuevosRespuesta } from '../types';
import { toast } from 'sonner';
import {
  Users,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  Ban,
} from 'lucide-react';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const AdminUsersPage: React.FC = () => {
  // Estadísticas y Crecimiento (Nove / HU-93)
  const [metricasData, setMetricasData] = useState<UsuariosNuevosRespuesta | null>(null);

  // Gestión de Usuarios (Diego / HU-14, HU-15, HU-16, HU-17)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  // Paginación y Búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const limite = 8;

  const cargarEstadisticas = async () => {
    try {
      const res = await adminApi.obtenerUsuariosMes(6);
      setMetricasData(res);
    } catch (err) {
      console.error('Error cargando estadísticas de usuarios:', err);
    }
  };

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
      setLoadingUsuarios(true);
      const res = await adminUsuariosApi.listarUsuarios(pag, limite, q);
      setUsuarios(res.usuarios);
      setTotalPaginas(res.totalPaginas || 1);
      setTotalUsuarios(res.total || 0);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
    cargarRoles();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      cargarUsuarios(pagina, busqueda);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [pagina, busqueda]);

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

  const recargarTodo = () => {
    cargarEstadisticas();
    cargarUsuarios(pagina, busqueda);
  };

  const maxMesTotal = Math.max(...(metricasData?.desgloseMensual || []).map((m) => m.total), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
              Módulo de Administración
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-black" />
            Usuarios y Crecimiento
          </h1>
          <p className="text-sm text-gray-500">
            Control de accesos, roles, moderación y analíticas de registros.
          </p>
        </div>

        <button
          onClick={recargarTodo}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 transition-colors self-start md:self-auto shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* KPIS DE USUARIOS (HU-93) */}
      {metricasData?.resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Usuarios */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Registrados</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">
              {metricasData.resumen.totalUsuarios}
            </div>
            <p className="text-xs text-gray-500 mt-1">Cuentas creadas en la plataforma</p>
          </div>

          {/* Nuevos este Mes */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Nuevos Este Mes</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">
              +{metricasData.resumen.nuevosEsteMes}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              {metricasData.resumen.crecimientoVsMesAnterior !== undefined && (
                <span
                  className={`font-bold ${
                    metricasData.resumen.crecimientoVsMesAnterior >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {metricasData.resumen.crecimientoVsMesAnterior >= 0 ? '+' : ''}
                  {metricasData.resumen.crecimientoVsMesAnterior}%
                </span>
              )}
              <span>vs mes anterior</span>
            </div>
          </div>

          {/* Usuarios Verificados */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Verificados</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">
              {metricasData.resumen.totalVerificados}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metricasData.resumen.tasaVerificacion}% del total de usuarios
            </p>
          </div>

          {/* Cuentas Activas */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Cuentas Activas</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">
              {metricasData.resumen.totalActivos}
            </div>
            <p className="text-xs text-gray-500 mt-1">Con acceso habilitado</p>
          </div>
        </div>
      )}

      {/* GRÁFICO Y DESGLOSE DE REGISTROS POR MES (HU-93) */}
      {metricasData?.desgloseMensual && metricasData.desgloseMensual.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Histórico de Nuevos Registros</h2>
            <p className="text-xs text-gray-500">Evolución mensual de usuarios registrados y tasa de verificación</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-4">
            {metricasData.desgloseMensual.map((mes) => {
              const height = maxMesTotal > 0 ? (mes.total / maxMesTotal) * 100 : 0;
              return (
                <div key={mes.mes} className="flex flex-col items-center">
                  <div className="w-full h-32 bg-gray-50 rounded-xl p-2 flex flex-col justify-end items-center border border-gray-100 relative group">
                    <div
                      style={{ height: `${Math.max(height, 8)}%` }}
                      className="w-full bg-black rounded-lg transition-all duration-300 group-hover:bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold"
                    >
                      {mes.total > 0 && `+${mes.total}`}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-gray-800 mt-2 capitalize">{mes.label}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {mes.verificados} verif.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GESTIÓN Y DIRECTORIO DE USUARIOS (HU-14, HU-15, HU-16, HU-17) */}
      <div className="space-y-4">
        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
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

        {/* Tabla Interactiva de Usuarios */}
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
              {loadingUsuarios ? (
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
    </div>
  );
};
