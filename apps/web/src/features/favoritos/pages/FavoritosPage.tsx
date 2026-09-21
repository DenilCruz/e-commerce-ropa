import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Heart,
  HeartOff,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { useFavoritosStore } from '../store/favoritos.store';
import { useAuthStore } from '../../../store/auth.store';
import { Favorito } from '../types';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const FavoritosPage: React.FC = () => {
  const { user } = useAuthStore();
  const { items, cargarFavoritos, cargando, eliminarFavorito, limpiarTodos, moverAlCarrito } =
    useFavoritosStore();

  const [varianteSeleccionadaPorProducto, setVarianteSeleccionadaPorProducto] = useState<
    Record<string, string>
  >({});
  const [procesandoCarritoId, setProcesandoCarritoId] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [modalConfirmarVaciar, setModalConfirmarVaciar] = useState(false);

  useEffect(() => {
    if (user) {
      cargarFavoritos(user.id);
    }
  }, [user, cargarFavoritos]);

  // Inicializar variante por defecto (primera con stock > 0)
  useEffect(() => {
    const defaultVariants: Record<string, string> = {};
    items.forEach((item) => {
      if (item.producto?.variantes && item.producto.variantes.length > 0) {
        const varianteConStock =
          item.producto.variantes.find((v) => v.stock > 0) || item.producto.variantes[0];
        if (varianteConStock) {
          defaultVariants[item.productoId] = varianteConStock.id;
        }
      }
    });
    setVarianteSeleccionadaPorProducto((prev) => ({ ...defaultVariants, ...prev }));
  }, [items]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://placehold.co/400x500?text=Sin+Imagen';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
    if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
    return `${ASSETS_URL}/uploads/${url}`;
  };

  const handleSeleccionarVariante = (productoId: string, varianteId: string) => {
    setVarianteSeleccionadaPorProducto((prev) => ({
      ...prev,
      [productoId]: varianteId,
    }));
  };

  const handleMoverAlCarrito = async (favorito: Favorito) => {
    if (!favorito.producto) return;
    setMensajeExito(null);
    setMensajeError(null);
    setProcesandoCarritoId(favorito.id);

    const varianteId = varianteSeleccionadaPorProducto[favorito.productoId];

    const resultado = await moverAlCarrito(user.id, favorito.productoId, varianteId, 1);

    setProcesandoCarritoId(null);
    if (resultado.exito) {
      setMensajeExito(
        `"${favorito.producto.nombre}" se ha movido directamente a tu carrito de compras.`,
      );
      setTimeout(() => setMensajeExito(null), 5000);
    } else {
      setMensajeError(resultado.mensaje);
      setTimeout(() => setMensajeError(null), 5000);
    }
  };

  const handleEliminarFavorito = async (productoId: string) => {
    await eliminarFavorito(user.id, productoId);
  };

  const handleVaciarTodo = async () => {
    await limpiarTodos(user.id);
    setModalConfirmarVaciar(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* CABECERA EDITORIAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h1 className="text-2xl font-light tracking-tight text-gray-900 uppercase">
              Mis Favoritos
            </h1>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
            {items.length} {items.length === 1 ? 'prenda guardada' : 'prendas guardadas'} en tu lista de deseos
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setModalConfirmarVaciar(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors self-start sm:self-auto border border-transparent hover:border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vaciar lista</span>
          </button>
        )}
      </div>

      {/* NOTIFICACIONES FEEDBACK */}
      {mensajeExito && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-xs font-medium text-emerald-900">{mensajeExito}</span>
          </div>
          <Link
            to="/carrito"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline uppercase tracking-wider ml-4"
          >
            Ver Carrito <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {mensajeError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-xs font-medium text-red-900">{mensajeError}</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      {cargando ? (
        <div className="flex flex-col justify-center items-center min-h-[40vh]">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs uppercase tracking-widest text-gray-400">Cargando tus prendas favoritas...</p>
        </div>
      ) : items.length === 0 ? (
        /* ESTADO VACÍO ELEGANTE */
        <div className="text-center py-24 px-4 bg-[#fbfbfb] rounded-2xl border border-dashed border-gray-200 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5 text-gray-400">
            <HeartOff className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-light uppercase tracking-tight text-gray-900 mb-2">
            Tu lista de deseos está vacía
          </h2>
          <p className="text-xs text-gray-500 font-light max-w-sm mx-auto mb-8 leading-relaxed">
            Explora nuestra colección y guarda tus prendas preferidas haciendo clic en el corazón para comprarlas después.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-black text-white text-xs uppercase tracking-widest px-6 py-3.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explorar Catálogo</span>
          </Link>
        </div>
      ) : (
        /* LISTADO DE PRODUCTOS EN FAVORITOS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((favorito) => {
            const producto = favorito.producto;
            if (!producto) return null;

            const imagenPrincipal =
              producto.imagenes?.find((img) => img.esPrincipal || img.principal) ||
              producto.imagenes?.[0];
            const urlImagen = getImageUrl(imagenPrincipal?.url);

            const variantes = producto.variantes || [];
            const varianteActualId =
              varianteSeleccionadaPorProducto[producto.id] || variantes[0]?.id;
            const varianteSeleccionada =
              variantes.find((v) => v.id === varianteActualId) || variantes[0];

            const stockDisponible = varianteSeleccionada?.stock ?? 0;
            const tieneStock = stockDisponible > 0;
            const procesandoEste = procesandoCarritoId === favorito.id;

            return (
              <div
                key={favorito.id}
                className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* IMAGEN Y BOTÓN QUITAR */}
                  <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                    <Link to={`/producto/${producto.id}`} className="block w-full h-full">
                      <img
                        src={urlImagen}
                        alt={producto.nombre}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>

                    {/* HU-78: Botón rápido para quitar de favoritos */}
                    <button
                      type="button"
                      onClick={() => handleEliminarFavorito(producto.id)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
                      title="Quitar de favoritos"
                      aria-label="Quitar de favoritos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* BADGE DESTACADO */}
                    {producto.destacado && (
                      <span className="absolute top-3 left-3 bg-black text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">
                        Destacado
                      </span>
                    )}
                  </div>

                  {/* INFORMACIÓN DE LA PRENDA */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 hover:text-gray-600 transition-colors">
                        <Link to={`/producto/${producto.id}`}>{producto.nombre}</Link>
                      </h3>
                      <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        ${Number(producto.precio).toFixed(2)}
                      </p>
                    </div>

                    {producto.categoria && (
                      <p className="text-xs text-gray-400 font-medium mb-3">
                        {producto.categoria.nombre}
                      </p>
                    )}

                    {/* SELECTOR DE TALLA / VARIANTE (HU-79) */}
                    {variantes.length > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                            Seleccionar Talla:
                          </span>
                          {varianteSeleccionada && (
                            <span className="text-[10px] text-gray-400">
                              {varianteSeleccionada.talla?.nombre || 'Única'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {variantes.map((v) => {
                            const esSeleccionada = v.id === varianteActualId;
                            const sinStock = v.stock === 0;

                            return (
                              <button
                                key={v.id}
                                type="button"
                                disabled={sinStock}
                                onClick={() => handleSeleccionarVariante(producto.id, v.id)}
                                className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                                  sinStock
                                    ? 'bg-gray-100 border-gray-200 text-gray-300 line-through cursor-not-allowed'
                                    : esSeleccionada
                                    ? 'bg-black text-white border-black shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                                }`}
                              >
                                {v.talla?.nombre || v.sku}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* INDICADOR DE DISPONIBILIDAD DE STOCK */}
                    <div className="mb-4">
                      {variantes.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> En inventario
                        </span>
                      ) : !tieneStock ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded">
                          <XCircle className="w-3 h-3 text-red-600" /> Agotado en esta talla
                        </span>
                      ) : stockDisponible <= 5 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> ¡Últimas {stockDisponible} unidades!
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> En stock ({stockDisponible} disp.)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN (HU-79 & HU-78) */}
                <div className="p-4 pt-0 flex gap-2">
                  <button
                    type="button"
                    disabled={!tieneStock || procesandoEste}
                    onClick={() => handleMoverAlCarrito(favorito)}
                    className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-xs font-semibold uppercase tracking-wider py-2.5 px-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    title="Pasar al carrito de compras"
                  >
                    {procesandoEste ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5" />
                    )}
                    <span>{!tieneStock ? 'Agotado' : 'Pasar al Carrito'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEliminarFavorito(producto.id)}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                    title="Quitar de favoritos"
                    aria-label="Quitar de favoritos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA VACIAR LISTA */}
      {modalConfirmarVaciar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              ¿Vaciar toda tu lista de favoritos?
            </h3>
            <p className="text-xs text-gray-500 font-light mb-6 leading-relaxed">
              Esta acción eliminará los {items.length} artículos guardados en tu lista de deseos. No podrás deshacer este cambio.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalConfirmarVaciar(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVaciarTodo}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Sí, vaciar lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
