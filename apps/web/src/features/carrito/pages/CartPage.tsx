import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  AlertCircle,
  ShoppingBag,
  Ticket,
  CheckCircle2,
  XCircle,
  Tag,
  ChevronUp,
  ChevronDown,
  Lock,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '../../../store/cart.store';
import { useAuthStore } from '../../../store/auth.store';
import { cuponesApi } from '../../cupones/services/cupones.api';
import { Cupon } from '../../cupones/types';
import { VirtualTryOnModal } from '../components/VirtualTryOnModal';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    cargando,
    error,
    cupon,
    descuento,
    totalConDescuento,
    cargarCarrito,
    updateQuantity,
    removeItem,
    clearCart,
    aplicarCupon,
    removerCupon,
  } = useCartStore();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [codigoCupon, setCodigoCupon] = useState('');
  const [aplicandoCupon, setAplicandoCupon] = useState(false);
  const [mensajeCupon, setMensajeCupon] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [cuponesDisponibles, setCuponesDisponibles] = useState<Cupon[]>([]);
  const [mostrarCupones, setMostrarCupones] = useState(false);

  // Estados del Probador Virtual con IA
  const [modalProbadorAbierto, setModalProbadorAbierto] = useState(false);
  const [prendaParaProbar, setPrendaParaProbar] = useState<{
    id?: string;
    nombre: string;
    imagen: string | null;
    talla?: string;
    color?: string;
    categoria?: 'tops' | 'bottoms' | 'dresses';
  } | null>(null);

  useEffect(() => {
    cargarCarrito();
  }, []);

  // Cargar cupones sugeridos activos
  useEffect(() => {
    cuponesApi
      .listarCupones(true)
      .then((data) => setCuponesDisponibles(data))
      .catch(() => setCuponesDisponibles([]));
  }, []);

  const handleAplicarCupon = async (e?: React.FormEvent, codigoCustom?: string) => {
    if (e) e.preventDefault();
    const codigo = (codigoCustom || codigoCupon).trim().toUpperCase();

    if (!codigo) {
      setMensajeCupon({ tipo: 'error', texto: 'Por favor ingresa un código de cupón.' });
      return;
    }

    setAplicandoCupon(true);
    setMensajeCupon(null);

    const res = await aplicarCupon(codigo);
    if (res.success) {
      setMensajeCupon({ tipo: 'exito', texto: res.mensaje });
      setCodigoCupon('');
    } else {
      setMensajeCupon({ tipo: 'error', texto: res.mensaje });
    }
    setAplicandoCupon(false);
  };

  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const subtotal = cart?.total || 0;
  const envioEstimado = subtotal >= 200 || subtotal === 0 ? 0 : 15;
  const totalFinal = Number(Math.max(0, (totalConDescuento || subtotal) + envioEstimado).toFixed(2));

  const getImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseURL = 'http://localhost:3000';
    if (url.startsWith('/uploads')) return `${baseURL}${url}`;
    if (url.startsWith('/')) return `${baseURL}/uploads${url}`;
    return `${baseURL}/uploads/${url}`;
  };

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto px-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span>Bolsa de Compras</span>
            <span className="text-xs font-bold uppercase tracking-wider bg-black text-white px-2.5 py-1 rounded-full">
              {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa tus prendas seleccionadas y gestiona tus cupones antes de pagar.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas vaciar todo el carrito?')) {
                clearCart();
              }
            }}
            className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar bolsa</span>
          </button>
        )}
      </div>

      {/* ERROR GENERAL SI LO HAY */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => cargarCarrito()} className="text-xs underline font-semibold">
            Reintentar
          </button>
        </div>
      )}

      {/* ESTADO VACÍO */}
      {!cargando && items.length === 0 ? (
        <div className="text-center py-16 sm:py-24 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-2xl mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-50 rounded-full flex items-center justify-center shadow-inner">
            <ShoppingBag className="w-9 h-9 text-gray-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-2">
            Tu bolsa de compras está vacía
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
            Parece que aún no has agregado prendas a tu carrito. Explora nuestras colecciones exclusivas de temporada y encuentra tu estilo ideal.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-black text-white hover:bg-gray-800 font-semibold px-8 py-3.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
          >
            <span>Explorar Colección</span>
            <span>→</span>
          </Link>
        </div>
      ) : (
        /* CONTENIDO DEL CARRITO CON ARTÍCULOS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LISTA DE PRODUCTOS (COLUMNA IZQUIERDA - 7 o 8 COLS) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* BANNER PROBADOR VIRTUAL CON IA */}
            <div className="bg-gradient-to-r from-gray-950 via-indigo-950 to-purple-950 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-indigo-900/50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    Probador Virtual con IA disponible
                    <span className="bg-indigo-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Nuevo</span>
                  </h3>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    ¿Dudas de cómo te quedará alguna prenda? Pruébatela virtualmente antes de comprar.
                  </p>
                </div>
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const first = items[0];
                    setPrendaParaProbar({
                      id: first.producto?.id,
                      nombre: first.producto?.nombre || 'Prenda',
                      imagen: first.producto?.imagen || null,
                      talla: first.talla?.nombre,
                      color: first.color?.nombre,
                      categoria: 'tops',
                    });
                    setModalProbadorAbierto(true);
                  }}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-black text-xs font-black rounded-xl transition shrink-0 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Probar Prenda</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {items.map((item) => {
                const itemIdOrVar = item.id || item.varianteId;
                const imgUrl = getImageUrl(item.producto?.imagen);
                const precio = Number(item.precioUnitario || 0);
                const itemSubtotal = Number(item.subtotal || precio * item.cantidad);

                return (
                  <div
                    key={itemIdOrVar}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors"
                  >
                    {/* FOTO E INFORMACIÓN DEL PRODUCTO */}
                    <div className="flex items-center gap-4 sm:gap-5 flex-1">
                      <div className="w-20 h-24 sm:w-24 sm:h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={item.producto?.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Sin Foto
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/producto/${item.producto?.id || ''}`}
                          className="font-bold text-gray-900 text-base sm:text-lg hover:underline truncate block"
                        >
                          {item.producto?.nombre || 'Prenda de Vestir'}
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-600">
                          {item.talla && (
                            <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md font-semibold">
                              Talla: {item.talla.nombre}
                            </span>
                          )}
                          {item.color && (
                            <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md font-semibold">
                              Color: {item.color.nombre}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <div className="text-sm font-semibold text-gray-900">
                            Bs. {precio.toFixed(2)} <span className="text-xs font-normal text-gray-500">c/u</span>
                          </div>

                          {/* BOTÓN PROBAR EN MÍ */}
                          <button
                            type="button"
                            onClick={() => {
                              setPrendaParaProbar({
                                id: item.producto?.id,
                                nombre: item.producto?.nombre || 'Prenda',
                                imagen: item.producto?.imagen || null,
                                talla: item.talla?.nombre,
                                color: item.color?.nombre,
                                categoria: 'tops',
                              });
                              setModalProbadorAbierto(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/80 rounded-xl text-[11px] font-bold text-indigo-900 transition shadow-2xs group cursor-pointer"
                            title="Ver cómo te queda esta prenda con IA"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                            <span>Probar en mí (IA)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SELECTOR DE CANTIDAD, SUBTOTAL Y ELIMINAR */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {/* STEPPER DE CANTIDAD */}
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemIdOrVar, item.cantidad - 1)}
                          disabled={cargando}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 font-bold transition-colors disabled:opacity-50"
                          title="Reducir cantidad"
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-bold text-sm text-gray-900">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemIdOrVar, item.cantidad + 1)}
                          disabled={cargando || (item.stockDisponible > 0 && item.cantidad >= item.stockDisponible)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 font-bold transition-colors disabled:opacity-50"
                          title="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>

                      {/* SUBTOTAL DEL ITEM */}
                      <div className="text-right min-w-[90px]">
                        <div className="text-base sm:text-lg font-black text-gray-900">
                          Bs. {itemSubtotal.toFixed(2)}
                        </div>
                      </div>

                      {/* BOTÓN ELIMINAR */}
                      <button
                        type="button"
                        onClick={() => removeItem(itemIdOrVar)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar del carrito"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SEGUIR COMPRANDO */}
            <div className="flex items-center justify-between pt-2">
              <Link
                to="/catalogo"
                className="text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-black flex items-center gap-1.5 transition-colors"
              >
                <span>←</span>
                <span>Continuar explorando el catálogo</span>
              </Link>
            </div>
          </div>

          {/* RESUMEN DE ORDEN & CUPONES (COLUMNA DERECHA - 5 o 4 COLS - STICKY) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* CAJA DE CUPONES DE DESCUENTO (HU-73 & HU-74) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
              <h3 className="font-black text-gray-900 text-base tracking-tight mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-purple-600" />
                <span>Cupón de Descuento</span>
              </h3>

              {cupon ? (
                /* CUPÓN APLICADO ACTIVAMENTE */
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-800 text-sm uppercase tracking-wider">
                          {cupon.codigo}
                        </span>
                        <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {cupon.tipo === 'PORCENTAJE' ? `${cupon.valor}% OFF` : `Bs. ${cupon.valor} OFF`}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1">
                        Descuento aplicado: <strong>- Bs. {descuento.toFixed(2)}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        removerCupon();
                        setMensajeCupon(null);
                      }}
                      className="text-xs text-gray-500 hover:text-red-700 font-semibold underline p-1"
                      title="Quitar cupón"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                /* FORMULARIO DE APLICACIÓN DE CUPÓN */
                <form onSubmit={handleAplicarCupon} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoCupon}
                      onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                      placeholder="Ej. VERANO20"
                      className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      disabled={aplicandoCupon || !codigoCupon.trim()}
                      className="bg-black text-white hover:bg-gray-800 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      {aplicandoCupon ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Aplicar'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* MENSAJES DE NOTIFICACIÓN DE CUPÓN (HU-74) */}
              {mensajeCupon && (
                <div
                  className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 ${
                    mensajeCupon.tipo === 'exito'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {mensajeCupon.tipo === 'exito' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1 font-medium">{mensajeCupon.texto}</span>
                </div>
              )}

              {/* CUPONES DISPONIBLES EN TIENDA */}
              {cuponesDisponibles.length > 0 && !cupon && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setMostrarCupones(!mostrarCupones)}
                    className="text-xs font-bold text-gray-600 hover:text-black flex items-center justify-between w-full"
                  >
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ver cupones activos ({cuponesDisponibles.length})</span>
                    </span>
                    <span>{mostrarCupones ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                  </button>

                  {mostrarCupones && (
                    <div className="mt-2.5 space-y-2">
                      {cuponesDisponibles.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleAplicarCupon(undefined, c.codigo)}
                          className="cursor-pointer p-2.5 rounded-lg border border-dashed border-gray-300 hover:border-black bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-mono font-bold text-gray-900">{c.codigo}</span>
                            <span className="text-gray-500 block text-[11px]">
                              {c.tipo === 'PORCENTAJE' ? `${c.valor}% de descuento` : `Bs. ${c.valor} de descuento`}
                              {c.montoMinimo > 0 ? ` (Mín. Bs. ${c.montoMinimo})` : ''}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 hover:underline">
                            Aplicar
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RESUMEN DE LA ORDEN (HU-41) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-lg tracking-tight pb-3 border-b border-gray-100">
                Resumen del Pedido
              </h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal prendas</span>
                  <span className="font-semibold text-gray-900">Bs. {subtotal.toFixed(2)}</span>
                </div>

                {descuento > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Descuento cupón</span>
                    <span>- Bs. {descuento.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600 items-center">
                  <div>
                    <span>Envío estimado</span>
                    {subtotal >= 200 && (
                      <span className="block text-[11px] text-emerald-600 font-semibold">
                        ¡Califica para envío gratis!
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">
                    {envioEstimado === 0 ? (
                      <span className="text-emerald-600 uppercase text-xs font-bold">Gratis</span>
                    ) : (
                      `Bs. ${envioEstimado.toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-between items-baseline">
                <div>
                  <span className="text-base font-bold text-gray-900">Total a Pagar</span>
                  <span className="block text-[11px] text-gray-500 font-normal">Impuestos y tasas incluidos</span>
                </div>
                <div className="text-2xl font-black text-gray-900">
                  Bs. {totalFinal.toFixed(2)}
                </div>
              </div>

              {/* BOTÓN PROCEDER AL CHECKOUT */}
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { from: { pathname: '/pago' } } });
                  } else {
                    navigate('/pago');
                  }
                }}
                disabled={items.length === 0}
                className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl text-center shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4"
              >
                <span>Proceder al Pago</span>
                <Lock className="w-4 h-4" />
              </button>

              <div className="pt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                  <span>Pago Protegido</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-gray-500" />
                  <span>Envío Express</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROBADOR VIRTUAL */}
      <VirtualTryOnModal
        abierto={modalProbadorAbierto}
        onCerrar={() => setModalProbadorAbierto(false)}
        prenda={prendaParaProbar}
      />
    </div>
  );
};
