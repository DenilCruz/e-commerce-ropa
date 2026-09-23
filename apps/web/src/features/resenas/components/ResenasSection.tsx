import React, { useEffect, useState } from 'react';
import { 
  Star, 
  ShieldCheck, 
  CheckCircle2, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  ShoppingBag, 
  X, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { resenasApi } from '../services/resenas.api';
import { Resena, ResumenResenas, EstadoCompraResena } from '../types';
import { useAuthStore } from '../../../store/auth.store';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const resolverAvatar = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

interface ResenasSectionProps {
  productoId: string;
}

export const ResenasSection: React.FC<ResenasSectionProps> = ({ productoId }) => {
  const { user } = useAuthStore();
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [resumen, setResumen] = useState<ResumenResenas>({ promedio: 0, total: 0, distribucion: {} });
  const [estadoCompra, setEstadoCompra] = useState<EstadoCompraResena | null>(null);
  const [cargando, setCargando] = useState(true);

  // Formulario Nueva Reseña (HU-66)
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Estado de Edición de Propia Reseña (HU-68)
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editCalificacion, setEditCalificacion] = useState(5);
  const [editComentario, setEditComentario] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Estado de simulación de compra para pruebas
  const [simulando, setSimulando] = useState(false);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [dataResenas, dataResumen] = await Promise.all([
        resenasApi.obtenerPorProducto(productoId),
        resenasApi.obtenerResumen(productoId),
      ]);

      setResenas(dataResenas);
      setResumen(dataResumen);

      if (user) {
        const verif = await resenasApi.verificarCompra(productoId, user.id);
        setEstadoCompra(verif);
      } else {
        setEstadoCompra(null);
      }
    } catch (error) {
      console.error('Error cargando reseñas', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [productoId, user]);

  // Publicar nueva reseña (HU-66)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setEnviando(true);
      const toastId = toast.loading('Publicando tu reseña...');
      await resenasApi.crear({
        productoId,
        usuarioId: user.id,
        calificacion,
        comentario: comentario.trim() || undefined,
      });

      toast.success('¡Gracias por tu opinión! Reseña publicada.', { id: toastId });
      setComentario('');
      setCalificacion(5);
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al publicar la reseña.');
    } finally {
      setEnviando(false);
    }
  };

  // Activar modo edición (HU-68)
  const iniciarEdicion = (resena: Resena) => {
    setEditandoId(resena.id);
    setEditCalificacion(resena.calificacion);
    setEditComentario(resena.comentario || '');
  };

  // Guardar edición (HU-68)
  const handleGuardarEdicion = async (resenaId: string) => {
    if (!user) return;

    try {
      setGuardandoEdicion(true);
      const toastId = toast.loading('Guardando cambios...');
      await resenasApi.actualizar(resenaId, {
        usuarioId: user.id,
        calificacion: editCalificacion,
        comentario: editComentario.trim() || undefined,
      });

      toast.success('Reseña actualizada exitosamente.', { id: toastId });
      setEditandoId(null);
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al actualizar tu reseña.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // Eliminar propia reseña (HU-68)
  const handleEliminarPropia = async (resenaId: string) => {
    if (!user) return;
    if (!confirm('¿Seguro que deseas eliminar tu reseña? Esta acción no se puede deshacer.')) return;

    try {
      const toastId = toast.loading('Eliminando reseña...');
      await resenasApi.eliminar(resenaId, user.id);
      toast.success('Tu reseña ha sido eliminada.', { id: toastId });
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al eliminar la reseña.');
    }
  };

  // Simular compra para pruebas (HU-66)
  const handleSimularCompra = async () => {
    if (!user) return;
    try {
      setSimulando(true);
      const toastId = toast.loading('Registrando compra de prueba...');
      const res = await resenasApi.simularCompra(productoId, user.id);
      toast.success(res.mensaje, { id: toastId });
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al simular la compra.');
    } finally {
      setSimulando(false);
    }
  };

  // Renderizador de Estrellas con Lucide
  const renderStars = (rating: number, isInteractive = false, onSelect?: (v: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!isInteractive}
            onClick={() => isInteractive && onSelect && onSelect(star)}
            className={`transition-transform ${
              isInteractive ? 'hover:scale-125 cursor-pointer p-0.5' : 'cursor-default'
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                star <= rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-100 text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (cargando) {
    return (
      <div id="seccion-resenas" className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-900" />
        <p className="text-xs uppercase tracking-widest">Cargando opiniones...</p>
      </div>
    );
  }

  const distribucion = resumen.distribucion || {};

  return (
    <div id="seccion-resenas" className="border-t border-gray-200 mt-20 pt-16 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Lado Izquierdo: Resumen Global y Formulario de Calificación */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Resumen de Estrellas (HU-70) */}
          <div>
            <h2 className="text-xs tracking-widest uppercase font-semibold text-gray-900 mb-4">
              Valoraciones del Producto
            </h2>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-5">
              <div className="flex items-center gap-4">
                <span className="text-5xl font-black text-gray-900 leading-none">
                  {Number(resumen.promedio).toFixed(1)}
                </span>
                <div>
                  {renderStars(Math.round(Number(resumen.promedio)))}
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {resumen.total} {resumen.total === 1 ? 'opinión verificada' : 'opiniones verificadas'}
                  </p>
                </div>
              </div>

              {/* Barras de desglose por estrella */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200/60 text-xs">
                {[5, 4, 3, 2, 1].map((s) => {
                  const count = distribucion[s] || 0;
                  const pct = resumen.total > 0 ? Math.round((count / resumen.total) * 100) : 0;
                  return (
                    <div key={s} className="flex items-center gap-2 text-gray-600">
                      <span className="w-3 text-right font-semibold text-[11px]">{s}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] text-gray-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Formulario / Estado de Compra (HU-66) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            {!user ? (
              <div className="text-center py-4 space-y-3">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">¿Quieres dejar una opinión?</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Inicia sesión con tu cuenta de cliente para verificar tu compra y calificar esta prenda.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-block bg-black text-white px-6 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase hover:bg-gray-800 transition-colors"
                >
                  Iniciar Sesión
                </Link>
              </div>
            ) : estadoCompra && !estadoCompra.comproProducto ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Compra verificada requerida</p>
                    <p className="text-amber-800 leading-relaxed">
                      Para garantizar opiniones auténticas, solo los clientes que hayan adquirido esta prenda pueden calificarla y compartir su experiencia.
                    </p>
                  </div>
                </div>
              </div>
            ) : estadoCompra && estadoCompra.yaReseno ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Ya valoraste esta prenda</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Puedes editar o eliminar tu reseña en cualquier momento desde la lista de opiniones.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 pb-2 border-b border-gray-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Comprador Verificado</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tu Calificación
                  </label>
                  <div className="flex items-center gap-3">
                    {renderStars(calificacion, true, (val) => setCalificacion(val))}
                    <span className="text-xs font-bold text-gray-900">{calificacion} de 5 estrellas</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tu Comentario (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Cuéntanos tu experiencia con el material, talla y calidad..."
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full py-3 bg-black text-white rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{enviando ? 'Publicando...' : 'Publicar mi Reseña'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Lado Derecho: Lista de Reseñas de Otros Compradores (HU-67) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-xs tracking-widest uppercase font-semibold text-gray-900">
              Opiniones de Compradores ({resenas.length})
            </h3>
          </div>

          {resenas.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8 space-y-2">
              <Star className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">Aún no hay opiniones</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Sé el primero en calificar este producto tras comprarlo.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {resenas.map((resena) => {
                const esPropia = user && resena.usuarioId === user.id;
                const enEdicion = editandoId === resena.id;
                const avatarUrl = resolverAvatar(resena.usuario?.foto);
                const nombreCliente = resena.usuario?.nombre || 'Cliente Verificado';
                const inicial = nombreCliente.charAt(0).toUpperCase();

                return (
                  <div
                    key={resena.id}
                    className={`p-6 rounded-2xl border transition-all ${
                      esPropia
                        ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                        : 'bg-white border-gray-100 shadow-sm'
                    }`}
                  >
                    {enEdicion ? (
                      /* Modo Edición Inline (HU-68) */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5 text-amber-600" />
                            <span>Editando tu reseña</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          {renderStars(editCalificacion, true, (val) => setEditCalificacion(val))}
                          <span className="text-xs font-semibold text-gray-700">{editCalificacion} estrellas</span>
                        </div>

                        <textarea
                          rows={3}
                          value={editComentario}
                          onChange={(e) => setEditComentario(e.target.value)}
                          className="w-full text-xs p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:outline-none"
                        />

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={guardandoEdicion}
                            onClick={() => handleGuardarEdicion(resena.id)}
                            className="px-4 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Modo Visualización Normal (HU-67) */
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gray-900 text-white font-bold text-xs flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={nombreCliente} className="w-full h-full object-cover" />
                              ) : (
                                <span>{inicial}</span>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-gray-900">{nombreCliente}</p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold border border-emerald-200">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Compra Verificada</span>
                                </span>
                                {esPropia && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                                    Tu Reseña
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(resena.creadoEn).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {renderStars(resena.calificacion)}

                            {/* Acciones de Autor (HU-68) */}
                            {esPropia && (
                              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicion(resena)}
                                  className="p-1 text-gray-400 hover:text-black rounded hover:bg-gray-100"
                                  title="Editar mi reseña"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarPropia(resena.id)}
                                  className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                  title="Eliminar mi reseña"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {resena.comentario && (
                          <p className="text-xs text-gray-700 leading-relaxed pl-13 pt-1">
                            "{resena.comentario}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
