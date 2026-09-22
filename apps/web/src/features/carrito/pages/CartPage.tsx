import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  AlertCircle,
  ShoppingBag,
  Ticket,
  Sparkles,
  ArrowRight,
  Plus,
  Minus
} from 'lucide-react';
import { useCartStore } from '../../../store/cart.store';
import { VirtualTryOnModal } from '../components/VirtualTryOnModal';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

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

  const [codigoCupon, setCodigoCupon] = useState('');
  const [aplicandoCupon, setAplicandoCupon] = useState(false);
  const [mensajeCupon, setMensajeCupon] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

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
  const envioEstimado = 0; // Envíos de cortesía en el atelier AURA
  const totalFinal = Number(Math.max(0, (totalConDescuento || subtotal) + envioEstimado).toFixed(2));

  const getImageUrl = (url?: string | null) => {
    if (!url) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
    if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
    return `${ASSETS_URL}/uploads/${url}`;
  };

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto space-y-10">
      {/* HEADER EDITORIAL AURA */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-6 border-b border-[#E7E1D7] gap-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-luxury text-[#9B7B54] font-semibold">
            Selección Personal
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-normal">
            Bolsa de Compras
          </h1>
          <p className="text-xs text-stone-500 font-light">
            {totalItems} {totalItems === 1 ? 'pieza seleccionada' : 'piezas seleccionadas'} en tu atelier
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('¿Deseas vaciar todos los artículos de tu bolsa?')) {
                clearCart();
              }
            }}
            className="text-xs uppercase tracking-luxury text-stone-500 hover:text-red-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar bolsa</span>
          </button>
        )}
      </div>

      {/* ERROR GENERAL SI LO HAY */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => cargarCarrito()} className="text-xs underline font-semibold">
            Reintentar
          </button>
        </div>
      )}

      {/* ESTADO VACÍO */}
      {!cargando && items.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#E7E1D7] max-w-xl mx-auto px-6 space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#F2ECE1] flex items-center justify-center text-stone-400">
            <ShoppingBag className="w-8 h-8 text-stone-500" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-stone-900 font-normal">
              Tu bolsa de compras está vacía
            </h2>
            <p className="text-xs text-stone-500 font-light max-w-md mx-auto leading-relaxed">
              Descubre nuestra colección permanente de alta costura, donde cada silueta está diseñada para perdurar.
            </p>
          </div>
          <div>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 bg-stone-900 text-white hover:bg-stone-800 text-xs uppercase tracking-luxury px-8 py-3.5 transition-all shadow-sm"
            >
              <span>Explorar Colección</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* CONTENIDO DEL CARRITO CON ARTÍCULOS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LISTA DE PRODUCTOS (COLUMNA IZQUIERDA - 7 u 8 COLS) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            {/* CALLOUT PROBADOR VIRTUAL IA */}
            <div className="bg-[#F2ECE1] border border-[#D5CCC0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-[#D5CCC0]">
                  <Sparkles className="w-5 h-5 text-[#9B7B54]" />
                </div>
                <div>
                  <h3 className="font-serif text-sm text-stone-900 font-medium">
                    Atelier Virtual con Inteligencia Artificial
                  </h3>
                  <p className="text-xs text-stone-600 font-light mt-0.5">
                    ¿Dudas con la caída o combinación? Pruébatela antes de finalizar tu orden.
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
                      nombre: first.producto?.nombre || 'Prenda AURA',
                      imagen: first.producto?.imagen || null,
                      talla: first.talla?.nombre,
                      color: first.color?.nombre,
                      categoria: 'tops',
                    });
                    setModalProbadorAbierto(true);
                  }}
                  className="px-5 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-luxury hover:bg-stone-800 transition-colors shrink-0 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#EAE2D5]" />
                  <span>Probar Prenda</span>
                </button>
              )}
            </div>

            {/* LISTA DE PRENDAS EN LA BOLSA */}
            <div className="bg-white border border-[#E7E1D7] divide-y divide-[#E7E1D7]">
              {items.map((item) => {
                const itemIdOrVar = item.id || item.varianteId;
                const imgUrl = getImageUrl(item.producto?.imagen);
                const precio = Number(item.precioUnitario || 0);
                const itemSubtotal = Number(item.subtotal || precio * item.cantidad);

                return (
                  <div
                    key={itemIdOrVar}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-[#FAF8F5]/60 transition-colors"
                  >
                    {/* FOTO 3:4 E INFORMACIÓN */}
                    <div className="flex items-center gap-5 flex-1">
                      <div className="w-20 h-28 bg-[#F2ECE1] overflow-hidden shrink-0 border border-[#E7E1D7]">
                        <img
                          src={imgUrl}
                          alt={item.producto?.nombre}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Link
                          to={`/producto/${item.producto?.id || ''}`}
                          className="font-serif text-base text-stone-900 hover:text-[#9B7B54] transition-colors line-clamp-1"
                        >
                          {item.producto?.nombre || 'Prenda AURA'}
                        </Link>

                        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wider text-stone-500">
                          {item.talla && (
                            <span>Talla: <strong className="text-stone-800">{item.talla.nombre}</strong></span>
                          )}
                          {item.talla && item.color && <span>·</span>}
                          {item.color && (
                            <span>Color: <strong className="text-stone-800">{item.color.nombre}</strong></span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="font-sans text-xs text-stone-500">
                            ${precio.toFixed(2)} c/u
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPrendaParaProbar({
                                id: item.producto?.id,
                                nombre: item.producto?.nombre || 'Prenda AURA',
                                imagen: item.producto?.imagen || null,
                                talla: item.talla?.nombre,
                                color: item.color?.nombre,
                                categoria: 'tops',
                              });
                              setModalProbadorAbierto(true);
                            }}
                            className="text-[10px] uppercase tracking-luxury text-[#9B7B54] hover:underline flex items-center gap-1 font-medium"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Probar con IA</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SELECTOR DE CANTIDAD, SUBTOTAL Y ELIMINAR */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#E7E1D7]">
                      {/* STEPPER */}
                      <div className="flex items-center border border-[#D5CCC0] bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemIdOrVar, item.cantidad - 1)}
                          disabled={cargando || item.cantidad <= 1}
                          className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 disabled:opacity-30 transition-colors"
                          title="Reducir cantidad"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold text-stone-900">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemIdOrVar, item.cantidad + 1)}
                          disabled={cargando || (item.stockDisponible > 0 && item.cantidad >= item.stockDisponible)}
                          className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 disabled:opacity-30 transition-colors"
                          title="Aumentar cantidad"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* SUBTOTAL DEL ITEM */}
                      <div className="text-right min-w-[90px]">
                        <span className="font-sans text-sm font-semibold text-stone-900">
                          ${itemSubtotal.toFixed(2)}
                        </span>
                      </div>

                      {/* BOTÓN ELIMINAR */}
                      <button
                        type="button"
                        onClick={() => removeItem(itemIdOrVar)}
                        className="p-1.5 text-stone-400 hover:text-red-700 transition-colors"
                        title="Eliminar de la bolsa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SEGUIR COMPRANDO */}
            <div className="pt-2">
              <Link
                to="/catalogo"
                className="text-xs uppercase tracking-luxury text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-2"
              >
                <span>← Continuar explorando la colección</span>
              </Link>
            </div>
          </div>

          {/* RESUMEN DE ORDEN & CUPONES (COLUMNA DERECHA) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* CAJA DE CUPONES DE DESCUENTO */}
            <div className="bg-white border border-[#E7E1D7] p-6 space-y-4">
              <h3 className="font-serif text-base uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#9B7B54]" />
                <span>Cupón de Cortesía</span>
              </h3>

              {cupon ? (
                /* CUPÓN APLICADO ACTIVAMENTE */
                <div className="bg-[#F2ECE1] border border-[#D5CCC0] p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-stone-900 uppercase">
                      {cupon.codigo}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        removerCupon();
                        setMensajeCupon(null);
                      }}
                      className="text-[10px] uppercase tracking-wider text-stone-500 hover:text-red-700 underline"
                    >
                      Remover
                    </button>
                  </div>
                  <p className="text-emerald-800 font-medium">
                    Descuento aplicado: <strong>-${descuento.toFixed(2)}</strong>
                  </p>
                </div>
              ) : (
                /* FORMULARIO INGRESO DE CUPÓN */
                <form onSubmit={handleAplicarCupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoCupon}
                      onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO DE CUPÓN"
                      className="flex-1 px-3 py-2.5 bg-[#FAF8F5] border border-[#D5CCC0] text-xs uppercase tracking-wider focus:outline-none focus:border-stone-900"
                    />
                    <button
                      type="submit"
                      disabled={aplicandoCupon || !codigoCupon.trim()}
                      className="px-4 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-luxury hover:bg-stone-800 disabled:opacity-40 transition-colors"
                    >
                      {aplicandoCupon ? '...' : 'Aplicar'}
                    </button>
                  </div>

                  {mensajeCupon && (
                    <p className={`text-xs ${mensajeCupon.tipo === 'exito' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {mensajeCupon.texto}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* RESUMEN DE TOTALES */}
            <div className="bg-white border border-[#E7E1D7] p-6 space-y-4">
              <h3 className="font-serif text-base uppercase tracking-wider text-stone-900 pb-3 border-b border-[#E7E1D7]">
                Resumen del Pedido
              </h3>

              <div className="space-y-3 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">${subtotal.toFixed(2)}</span>
                </div>

                {descuento > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Descuento aplicado</span>
                    <span>-${descuento.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Envío Atelier Asegurado</span>
                  <span className="text-emerald-700 uppercase tracking-luxury font-medium text-[10px]">
                    Cortesía
                  </span>
                </div>

                <div className="pt-3 border-t border-[#E7E1D7] flex justify-between items-baseline">
                  <span className="font-serif text-base uppercase tracking-wider text-stone-900">Total</span>
                  <span className="font-serif text-2xl font-medium text-stone-900">${totalFinal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-stone-400">
                  Precios en Dólares Estadounidenses ($ USD).
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full py-4 px-6 bg-stone-900 text-white text-xs uppercase tracking-luxury hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 shadow-sm font-medium"
                >
                  <span>Proceder al Pago</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Probador Virtual IA */}
      <VirtualTryOnModal
        abierto={modalProbadorAbierto}
        onCerrar={() => setModalProbadorAbierto(false)}
        prenda={prendaParaProbar}
      />
    </div>
  );
};
