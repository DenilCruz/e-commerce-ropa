import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Check } from 'lucide-react';
import { obtenerProductos } from '../../catalogo/services/catalogo.api';
import { Producto } from '../../catalogo/types';
import { VirtualTryOnModal } from '../../carrito/components/VirtualTryOnModal';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const VirtualTryOnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const productoIdParam = searchParams.get('producto');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerProductos()
      .then((prods) => {
        setProductos(prods);
        if (productoIdParam) {
          const encontrado = prods.find((p) => p.id === productoIdParam);
          if (encontrado) {
            setProductoSeleccionado(encontrado);
            setModalAbierto(true);
          } else if (prods.length > 0) {
            setProductoSeleccionado(prods[0]);
          }
        } else if (prods.length > 0) {
          setProductoSeleccionado(prods[0]);
        }
      })
      .finally(() => setCargando(false));
  }, [productoIdParam]);

  const prendaParaProbar = productoSeleccionado ? {
    id: productoSeleccionado.id,
    nombre: productoSeleccionado.nombre,
    imagen: productoSeleccionado.imagenes?.[0]?.url || null,
    categoria: (productoSeleccionado.categoria?.nombre?.toLowerCase().includes('vestido') 
      ? 'dresses' 
      : productoSeleccionado.categoria?.nombre?.toLowerCase().includes('pantalon') || productoSeleccionado.categoria?.nombre?.toLowerCase().includes('falda') || productoSeleccionado.categoria?.nombre?.toLowerCase().includes('short')
      ? 'bottoms'
      : 'tops') as 'tops' | 'bottoms' | 'dresses',
  } : null;

  return (
    <div className="space-y-12 max-w-5xl mx-auto py-4">
      {/* Encabezado */}
      <div className="space-y-3 text-center max-w-2xl mx-auto">
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-luxury text-stone-500 hover:text-stone-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Catálogo</span>
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F2ECE1] border border-[#E7E1D7] text-[#9B7B54] text-[10px] uppercase tracking-luxury mx-auto">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Atelier Virtual IA</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-normal">
          Probador Virtual de Alta Costura
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
          Selecciona una prenda de nuestra colección para simular su caída, proporciones y ajuste realista en tu fotografía o en nuestros avatares de estudio.
        </p>
      </div>

      {/* Prenda Seleccionada y Trigger */}
      {productoSeleccionado && (
        <div className="bg-white border border-[#E7E1D7] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-5">
            <div className="w-20 h-28 shrink-0 bg-[#F2ECE1] overflow-hidden border border-[#E7E1D7]">
              <img
                src={getImageUrl(productoSeleccionado.imagenes?.[0]?.url)}
                alt={productoSeleccionado.nombre}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-luxury text-[#9B7B54] font-medium">
                {productoSeleccionado.categoria?.nombre || 'Colección'}
              </span>
              <h2 className="font-serif text-xl text-stone-900">
                {productoSeleccionado.nombre}
              </h2>
              <p className="font-sans text-sm font-semibold text-stone-900">
                ${Number(productoSeleccionado.precio).toFixed(2)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalAbierto(true)}
            className="w-full sm:w-auto px-8 py-3.5 bg-stone-900 text-white text-xs uppercase tracking-luxury hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 shadow-sm font-medium"
          >
            <Sparkles className="w-4 h-4 text-[#EAE2D5]" />
            <span>Iniciar Prueba Virtual</span>
          </button>
        </div>
      )}

      {/* Selector de Prendas del Catálogo */}
      <div className="space-y-6">
        <h3 className="font-serif text-xl text-stone-900 border-b border-[#E7E1D7] pb-3">
          Selecciona una prenda para probarte:
        </h3>

        {cargando ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="animate-pulse aspect-[3/4] bg-[#EAE2D5]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {productos.map((prod) => {
              const isSelected = productoSeleccionado?.id === prod.id;
              const imgUrl = getImageUrl(prod.imagenes?.[0]?.url);

              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    setProductoSeleccionado(prod);
                    setModalAbierto(true);
                  }}
                  className={`cursor-pointer group relative bg-white border transition-all duration-200 overflow-hidden ${
                    isSelected ? 'border-stone-900 ring-2 ring-stone-900' : 'border-[#E7E1D7] hover:border-stone-400'
                  }`}
                >
                  <div className="aspect-[3/4] bg-[#F2ECE1] overflow-hidden relative">
                    <img
                      src={imgUrl}
                      alt={prod.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-stone-900 text-white p-1 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-serif text-xs text-stone-900 line-clamp-1 group-hover:text-[#9B7B54] transition-colors">
                      {prod.nombre}
                    </p>
                    <p className="text-xs font-semibold text-stone-900 font-sans">
                      ${Number(prod.precio).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Prueba Virtual */}
      <VirtualTryOnModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        prenda={prendaParaProbar}
      />
    </div>
  );
};
