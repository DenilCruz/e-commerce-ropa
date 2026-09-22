import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, Sparkles, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cart.store';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string | null) => {
  if (!url) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);
  const { 
    cart, 
    isDrawerOpen, 
    closeDrawer, 
    updateQuantity, 
    removeItem, 
    totalConDescuento, 
    descuento,
    cargando 
  } = useCartStore();

  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const subtotal = cart?.total || 0;

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Evitar scroll del body cuando el drawer esté abierto
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop con desenfoque atelier */}
      <div 
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          ref={drawerRef}
          className="w-screen max-w-md bg-[#FAF8F5] border-l border-[#E7E1D7] shadow-2xl flex flex-col transform transition-transform ease-out duration-300 animate-in slide-in-from-right"
        >
          {/* Header del Drawer */}
          <div className="px-6 py-5 border-b border-[#E7E1D7] flex items-center justify-between bg-white/70 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-lg tracking-wider uppercase text-stone-900 font-normal">
                Bolsa de Compras
              </h2>
              <span className="text-xs font-sans tracking-widest text-stone-500 uppercase">
                ({totalItems} {totalItems === 1 ? 'artículo' : 'artículos'})
              </span>
            </div>
            <button
              onClick={closeDrawer}
              className="p-2 text-stone-400 hover:text-stone-900 transition-colors rounded-full hover:bg-stone-100"
              aria-label="Cerrar bolsa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner de Envío de Cortesía */}
          <div className="bg-[#F2ECE1] px-6 py-2.5 text-center text-xs text-stone-700 tracking-wide flex items-center justify-center gap-2 border-b border-[#E7E1D7]">
            <Sparkles className="w-3.5 h-3.5 text-[#9B7B54]" />
            <span>Envío atelier asegurado de cortesía en todas las órdenes</span>
          </div>

          {/* Contenido de la bolsa */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 divide-y divide-[#E7E1D7]">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#F2ECE1] flex items-center justify-center text-stone-400">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-lg text-stone-800">Tu bolsa está vacía</p>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    Explora nuestra colección de alta costura y añade piezas únicas a tu selección.
                  </p>
                </div>
                <button
                  onClick={() => {
                    closeDrawer();
                    navigate('/catalogo');
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white text-xs tracking-widest uppercase hover:bg-stone-800 transition-colors"
                >
                  Explorar Catálogo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              items.map((item) => {
                const itemIdOrVar = item.id || item.varianteId;
                const img = getImageUrl(item.producto?.imagen);
                const precioUnidad = Number(item.precioUnitario || item.producto?.precioBase || 0);
                const nombrePrenda = item.producto?.nombre || 'Prenda AURA';
                const prodId = item.producto?.id || item.productoId || '';

                return (
                  <div key={itemIdOrVar} className="pt-4 first:pt-0 flex gap-4">
                    {/* Miniatura 3:4 */}
                    <div className="w-20 h-28 shrink-0 bg-[#F2ECE1] rounded-xs overflow-hidden border border-[#E7E1D7]">
                      <img
                        src={img}
                        alt={nombrePrenda}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>

                    {/* Detalles */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <Link
                            to={`/producto/${prodId}`}
                            onClick={closeDrawer}
                            className="font-serif text-sm text-stone-900 hover:text-[#9B7B54] transition-colors leading-snug"
                          >
                            {nombrePrenda}
                          </Link>
                          <button
                            onClick={() => removeItem(itemIdOrVar)}
                            disabled={cargando}
                            className="text-stone-400 hover:text-red-700 transition-colors p-1"
                            title="Eliminar de la bolsa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Variantes (Talla y Color) */}
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-500 uppercase tracking-wider">
                          {item.talla?.nombre && <span>Talla: <strong className="text-stone-700">{item.talla.nombre}</strong></span>}
                          {item.talla?.nombre && item.color?.nombre && <span>·</span>}
                          {item.color?.nombre && <span>Color: <strong className="text-stone-700">{item.color.nombre}</strong></span>}
                        </div>
                      </div>

                      {/* Stepper y Precio */}
                      <div className="flex items-center justify-between mt-3 pt-2">
                        <div className="flex items-center border border-[#D5CCC0] rounded-none bg-white">
                          <button
                            onClick={() => updateQuantity(itemIdOrVar, item.cantidad - 1)}
                            disabled={cargando || item.cantidad <= 1}
                            className="px-2 py-1 text-stone-500 hover:text-stone-900 disabled:opacity-30 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-medium text-stone-800 min-w-[20px] text-center font-sans">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemIdOrVar, item.cantidad + 1)}
                            disabled={cargando}
                            className="px-2 py-1 text-stone-500 hover:text-stone-900 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-sans text-sm font-semibold text-stone-900 tracking-tight">
                          ${(precioUnidad * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Probador Virtual Callout en Drawer */}
          {items.length > 0 && (
            <div className="mx-6 my-2 p-3 bg-gradient-to-r from-[#F2ECE1] to-[#EAE2D5] border border-[#D5CCC0] rounded-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#9B7B54] shrink-0" />
                <div className="text-[11px] text-stone-700">
                  <p className="font-semibold text-stone-900">Probador Virtual con IA</p>
                  <p className="text-stone-500">Comprueba la caída y combinaciones</p>
                </div>
              </div>
              <button
                onClick={() => {
                  closeDrawer();
                  navigate('/probador');
                }}
                className="px-2.5 py-1 text-[11px] uppercase tracking-wider bg-stone-900 text-white hover:bg-stone-800 transition-colors shrink-0"
              >
                Probar
              </button>
            </div>
          )}

          {/* Footer del Drawer: Subtotal y Botones */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#E7E1D7] bg-white space-y-3">
              {descuento > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Descuento aplicado</span>
                  <span>-${descuento.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-baseline">
                <span className="font-serif text-sm uppercase tracking-widest text-stone-600">Subtotal Estimado</span>
                <span className="font-serif text-xl font-medium text-stone-900">
                  ${(totalConDescuento || subtotal).toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Impuestos y tarifas de importación calculadas al finalizar compra.
              </p>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    closeDrawer();
                    navigate('/checkout');
                  }}
                  className="w-full py-3.5 px-4 bg-stone-900 text-white font-sans text-xs uppercase tracking-luxury hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Proceder al Pago</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    closeDrawer();
                    navigate('/carrito');
                  }}
                  className="w-full py-2.5 px-4 border border-[#D5CCC0] text-stone-800 font-sans text-xs uppercase tracking-wider hover:bg-stone-50 transition-colors text-center"
                >
                  Ver Bolsa Detallada
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
