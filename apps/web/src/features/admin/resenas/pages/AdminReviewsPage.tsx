import React, { useEffect, useState } from 'react';
import { 
  Star, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search, 
  X, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { adminResenasApi } from '../services/admin-resenas.api';
import { ResenaAdmin, ResenasKpisAdmin } from '../types';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const resolverUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const AdminReviewsPage: React.FC = () => {
  const [resenas, setResenas] = useState<ResenaAdmin[]>([]);
  const [kpis, setKpis] = useState<ResenasKpisAdmin>({
    totalResenas: 0,
    promedioGlobal: 0,
    resenasOcultas: 0,
  });
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<'todas' | 'aprobadas' | 'ocultas'>('todas');

  // Modal para confirmar eliminación
  const [resenaAEliminar, setResenaAEliminar] = useState<ResenaAdmin | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [dataKpis, dataResenas] = await Promise.all([
        adminResenasApi.obtenerKpis(),
        adminResenasApi.obtenerTodas(busqueda, estadoFiltro),
      ]);
      setKpis(dataKpis);
      setResenas(dataResenas);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar reseñas para moderación.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [estadoFiltro]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarDatos();
  };

  // Alternar aprobación (HU-69)
  const handleToggleModerar = async (resena: ResenaAdmin) => {
    try {
      const res = await adminResenasApi.toggleModerar(resena.id);
      toast.success(
        res.aprobada
          ? 'Reseña aprobada y visible en la tienda.'
          : 'Reseña ocultada de la tienda pública.',
      );
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al modificar visibilidad de la reseña.');
    }
  };

  // Confirmar y eliminar reseña spam u ofensiva (HU-69)
  const handleConfirmarEliminar = async () => {
    if (!resenaAEliminar) return;

    try {
      setEliminando(true);
      const toastId = toast.loading('Eliminando reseña ofensiva / spam...');
      await adminResenasApi.eliminar(resenaAEliminar.id);
      toast.success('Reseña eliminada permanentemente del sistema.', { id: toastId });
      setResenaAEliminar(null);
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al eliminar la reseña.');
    } finally {
      setEliminando(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gray-900 text-white rounded-xl">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Moderación de Reseñas
            </h1>
            <p className="text-sm text-gray-500">
              Control de calidad de opiniones, moderación de visibilidad y eliminación de spam u ofensas
            </p>
          </div>
        </div>

        <button
          onClick={cargarDatos}
          disabled={cargando}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors w-fit self-end md:self-auto"
          title="Refrescar lista"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Reseñas</p>
            <p className="text-2xl font-black text-gray-900">{kpis.totalResenas}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Promedio Global</p>
            <p className="text-2xl font-black text-amber-500">{kpis.promedioGlobal} ★</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${kpis.resenasOcultas > 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-400'}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ocultas / Spam</p>
            <p className={`text-2xl font-black ${kpis.resenasOcultas > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
              {kpis.resenasOcultas}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setEstadoFiltro('todas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              estadoFiltro === 'todas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas ({kpis.totalResenas})
          </button>
          <button
            onClick={() => setEstadoFiltro('aprobadas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              estadoFiltro === 'aprobadas' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Aprobadas ({kpis.totalResenas - kpis.resenasOcultas})
          </button>
          <button
            onClick={() => setEstadoFiltro('ocultas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              estadoFiltro === 'ocultas' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Ocultas ({kpis.resenasOcultas})
          </button>
        </div>

        <form onSubmit={handleBuscar} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar prenda, autor o texto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full text-xs pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:outline-none shadow-sm"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => { setBusqueda(''); cargarDatos(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Tabla de Reseñas */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-900" />
            <p className="text-xs uppercase tracking-widest font-semibold">Cargando reseñas...</p>
          </div>
        ) : resenas.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No se encontraron reseñas</p>
            <p className="text-xs text-gray-400">
              No hay opiniones que coincidan con el filtro actual.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Producto</th>
                  <th className="px-6 py-3.5">Cliente</th>
                  <th className="px-6 py-3.5">Calificación</th>
                  <th className="px-6 py-3.5">Comentario</th>
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resenas.map((r) => {
                  const imgProd = r.producto?.imagenes?.[0]?.url;
                  const avatarUrl = resolverUrl(r.usuario?.foto);

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Producto */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {imgProd ? (
                              <img src={resolverUrl(imgProd)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-gray-400">Sin img</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 line-clamp-1">{r.producto?.nombre || 'Producto'}</p>
                            <span className="text-[10px] text-gray-400">ID: {r.productoId.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-black text-white font-bold text-[10px] flex items-center justify-center overflow-hidden shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{(r.usuario?.nombre || 'U').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{r.usuario?.nombre || 'Cliente'}</p>
                            <p className="text-[10px] text-gray-400">{r.usuario?.correo}</p>
                          </div>
                        </div>
                      </td>

                      {/* Calificación */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {renderStars(r.calificacion)}
                          <span className="text-[11px] font-bold text-gray-700">{r.calificacion} de 5</span>
                        </div>
                      </td>

                      {/* Comentario */}
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-gray-700 line-clamp-2 leading-relaxed" title={r.comentario}>
                          {r.comentario ? `"${r.comentario}"` : <span className="italic text-gray-400">Sin comentario escrito</span>}
                        </p>
                      </td>

                      {/* Fecha */}
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(r.creadoEn).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {r.aprobada ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Aprobada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Oculta</span>
                          </span>
                        )}
                      </td>

                      {/* Acciones (HU-69) */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Alternar Visibilidad */}
                          <button
                            type="button"
                            onClick={() => handleToggleModerar(r)}
                            className={`p-2 rounded-lg border transition-colors ${
                              r.aprobada
                                ? 'text-gray-500 hover:text-amber-700 hover:bg-amber-50 border-gray-200'
                                : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                            }`}
                            title={r.aprobada ? 'Ocultar reseña' : 'Aprobar reseña'}
                          >
                            {r.aprobada ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          {/* Eliminar Spam u Ofensiva */}
                          <button
                            type="button"
                            onClick={() => setResenaAEliminar(r)}
                            className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                            title="Eliminar por spam u ofensiva"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación (HU-69) */}
      {resenaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Eliminar Reseña (HU-69)</h3>
                <p className="text-xs text-gray-500">Moderación contra spam y lenguaje ofensivo</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente la reseña de{' '}
              <strong>{resenaAEliminar.usuario?.nombre || 'este cliente'}</strong> en el producto{' '}
              <strong>{resenaAEliminar.producto?.nombre}</strong>?
            </p>

            {resenaAEliminar.comentario && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 italic">
                "{resenaAEliminar.comentario}"
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResenaAEliminar(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{eliminando ? 'Eliminando...' : 'Confirmar y Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
