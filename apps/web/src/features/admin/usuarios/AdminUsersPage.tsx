import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  Search,
  RefreshCw,
  Mail,
  Calendar,
} from 'lucide-react';
import { adminApi } from '../services/admin.api';
import { UsuariosNuevosRespuesta } from '../types';

export const AdminUsersPage: React.FC = () => {
  const [data, setData] = useState<UsuariosNuevosRespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroVerificado, setFiltroVerificado] = useState<'TODOS' | 'VERIFICADOS' | 'PENDIENTES'>('TODOS');

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const res = await adminApi.obtenerUsuariosMes(6);
      setData(res);
    } catch (err) {
      console.error('Error cargando estadísticas de usuarios:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-black animate-spin" />
        <p className="text-xs uppercase tracking-widest text-gray-500 font-medium">
          Cargando métricas de usuarios...
        </p>
      </div>
    );
  }

  // Filtrado de usuarios
  const usuariosFiltrados = (data?.ultimosUsuarios || []).filter((u) => {
    const matchBusqueda =
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase());

    if (!matchBusqueda) return false;

    if (filtroVerificado === 'VERIFICADOS') return u.emailVerificado;
    if (filtroVerificado === 'PENDIENTES') return !u.emailVerificado;
    return true;
  });

  const maxMesTotal = Math.max(...(data?.desgloseMensual || []).map((m) => m.total), 1);

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
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            Usuarios y Crecimiento
          </h1>
          <p className="text-sm text-gray-500">
            Estadísticas de registros por mes, tasas de verificación y directorio de usuarios.
          </p>
        </div>

        <button
          onClick={cargarUsuarios}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* HU-93: KPIS DE USUARIOS */}
      {data?.resumen && (
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
              {data.resumen.totalUsuarios}
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
              +{data.resumen.nuevosEsteMes}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              {data.resumen.crecimientoVsMesAnterior !== undefined && (
                <span
                  className={`font-bold ${
                    data.resumen.crecimientoVsMesAnterior >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {data.resumen.crecimientoVsMesAnterior >= 0 ? '+' : ''}
                  {data.resumen.crecimientoVsMesAnterior}%
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
              {data.resumen.totalVerificados}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.resumen.tasaVerificacion}% del total de usuarios
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
              {data.resumen.totalActivos}
            </div>
            <p className="text-xs text-gray-500 mt-1">Con acceso habilitado</p>
          </div>
        </div>
      )}

      {/* HU-93: GRÁFICO Y DESGLOSE DE REGISTROS POR MES */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">Histórico de Nuevos Registros</h2>
          <p className="text-xs text-gray-500">Evolución mensual de usuarios registrados y tasa de verificación</p>
        </div>

        {/* Gráfico de Barras Mensual */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-4">
          {data?.desgloseMensual.map((mes) => {
            const height = maxMesTotal > 0 ? (mes.total / maxMesTotal) * 100 : 0;
            return (
              <div key={mes.mes} className="flex flex-col items-center">
                {/* Visual Bar Container */}
                <div className="w-full h-36 bg-gray-50 rounded-xl p-2 flex flex-col justify-end items-center border border-gray-100 relative group">
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

      {/* LISTADO DE USUARIOS REGISTRADOS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Directorio de Usuarios</h3>
            <p className="text-xs text-gray-500">Listado y estado de verificación de usuarios</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Filtro estado verificación */}
            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 text-xs bg-gray-50">
              <button
                onClick={() => setFiltroVerificado('TODOS')}
                className={`px-3 py-1 rounded-md font-semibold ${
                  filtroVerificado === 'TODOS' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroVerificado('VERIFICADOS')}
                className={`px-3 py-1 rounded-md font-semibold ${
                  filtroVerificado === 'VERIFICADOS' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                }`}
              >
                Verificados
              </button>
              <button
                onClick={() => setFiltroVerificado('PENDIENTES')}
                className={`px-3 py-1 rounded-md font-semibold ${
                  filtroVerificado === 'PENDIENTES' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                }`}
              >
                Pendientes
              </button>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </div>

        {usuariosFiltrados.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No se encontraron usuarios que coincidan con los criterios.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4">Correo</th>
                  <th className="py-3.5 px-4 text-center">Rol</th>
                  <th className="py-3.5 px-4 text-center">Verificación</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Fecha Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuariosFiltrados.map((u) => {
                  const fechaStr = new Date(u.creadoEn).toLocaleDateString('es-BO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.nombre}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono">
                        {u.correo}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.rol === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {u.rol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            u.emailVerificado
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {u.emailVerificado ? 'Verificado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.activo ? 'text-emerald-700' : 'text-gray-400'
                          }`}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-500 whitespace-nowrap">
                        {fechaStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
