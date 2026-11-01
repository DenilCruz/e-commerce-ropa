import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Check, WifiOff } from 'lucide-react';
import { obtenerProductos } from '../../catalogo/services/catalogo.api';
import { Producto } from '../../catalogo/types';
import { useTenantStore } from '../../../hooks/useTenantStore';
import { VirtualTryOnModal } from '../../carrito/components/VirtualTryOnModal';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { ImageSequenceCanvas } from '../../../components/spatial/ImageSequenceCanvas';
import { SpatialGlassCard } from '../../../components/spatial/SpatialGlassCard';
import './virtual-try-on-spatial.css';

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
  const { isOnline } = useNetworkStatus();
  const { getStoreUrl } = useTenantStore();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [anguloVista, setAnguloVista] = useState(180);
  const [mostrarGuiaVisual, setMostrarGuiaVisual] = useState(false);

  useEffect(() => {
    obtenerProductos()
      .then((prods) => {
        setProductos(prods);
        if (productoIdParam) {
          const encontrado = prods.find(
            (p) => p.id === productoIdParam || p.variantes?.some((v) => v.id === productoIdParam)
          );
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
    <div className="spatial-try-on space-y-12 max-w-6xl mx-auto py-4">
      {/* Encabezado */}
      <div className="space-y-3 text-center max-w-2xl mx-auto">
        <Link
          to={getStoreUrl("/catalogo")}
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
          Mira cómo te queda cada prenda antes de decidir: gírala, compárala y pruébatela con tu propia foto.
        </p>
      </div>

      {/* Advertencia Offline para IA */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <WifiOff className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs uppercase tracking-wider font-bold text-amber-950">
              Conexión Requerida para el Probador Virtual IA
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed font-light">
              El Probador Virtual con Inteligencia Artificial requiere conexión a internet para procesar la fotografía y renderizar las prendas de alta costura.
            </p>
          </div>
        </div>
      )}

      {/* Prenda Seleccionada y Trigger */}
      {productoSeleccionado && (
        <div className="spatial-try-on__studio">
          <div className="spatial-try-on__stage">
            <ImageSequenceCanvas
              images={(productoSeleccionado.imagenes || []).map((image) => getImageUrl(image.url))}
              alt={productoSeleccionado.nombre}
              mode="drag-and-hover-orbit"
              controls
              onAngleChange={setAnguloVista}
              objectFit="contain"
              className="spatial-try-on__sequence"
            />
            <div className="spatial-try-on__stage-caption">
              <span>Vista de la prenda</span><span>{(productoSeleccionado.imagenes?.length || 0) > 1 ? 'Imágenes de catálogo' : 'Vista simulada'}</span>
            </div>
            {mostrarGuiaVisual && <svg className="spatial-try-on__guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M50 4V96M18 31C34 26 66 26 82 31M24 54C39 49 61 49 76 54M30 76C42 72 58 72 70 76M33 18C42 12 58 12 67 18" />
              <path d="M35 18C26 32 27 67 35 83M65 18C74 32 73 67 65 83M43 10V90M57 10V90" />
            </svg>}
            <div className="spatial-try-on__stage-tools">
              <label className="spatial-try-on__guide-toggle">
                <input type="checkbox" checked={mostrarGuiaVisual} onChange={(event) => setMostrarGuiaVisual(event.target.checked)} />
                <span>Guía visual</span>
              </label>
              <span className="spatial-try-on__angle">{Math.round(anguloVista)}°</span>
            </div>
          </div>
          <SpatialGlassCard className="spatial-try-on__selection" strength={1}>
            <span className="spatial-try-on__collection-label">{productoSeleccionado.categoria?.nombre || 'Colección'}</span>
            <h2>{productoSeleccionado.nombre}</h2>
            <p className="spatial-try-on__price">${Number(productoSeleccionado.precio).toFixed(2)}</p>
            <p className="spatial-try-on__selection-note">Gira la prenda para ver cada ángulo. Cuando quieras, pruébatela con tu foto.</p>
            <button
              onClick={() => { if (isOnline) setModalAbierto(true); }}
              disabled={!isOnline}
              className="spatial-try-on__launch"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isOnline ? 'Probármela ahora' : 'Conéctate para probártela'}</span>
            </button>
          </SpatialGlassCard>
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
                <button
                  key={prod.id}
                  onClick={() => {
                    setProductoSeleccionado(prod);
                    setModalAbierto(true);
                  }}
                  type="button"
                  className={`spatial-try-on__garment group relative bg-white border transition-all duration-200 overflow-hidden ${
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
                </button>
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
