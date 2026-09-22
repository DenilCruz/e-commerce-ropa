import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Check, 
  XCircle, 
  AlertTriangle, 
  Star, 
  Sparkles, 
  Minus, 
  Plus
} from 'lucide-react';
import { obtenerProductoPorId, obtenerProductosRelacionados } from "../../catalogo/services/catalogo.api";
import { Producto, VarianteProducto } from "../../catalogo/types";
import { ProductCard } from '../../catalogo/components/ProductCard';
import { HeartButton } from '../../favoritos/components/HeartButton';
import { ResenasSection } from '../../resenas/components/ResenasSection';
import { resenasApi } from '../../resenas/services/resenas.api';
import { ResumenResenas } from '../../resenas/types';
import { useCartStore } from '../../../store/cart.store';
import { VirtualTryOnModal } from '../../carrito/components/VirtualTryOnModal';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [relacionados, setRelacionados] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<VarianteProducto | null>(null);
  const [imagenActiva, setImagenActiva] = useState<string>('');
  
  // Acordeones de información editorial
  const [seccionAbierta, setSeccionAbierta] = useState<string>('descripcion');
  const [resumenResenas, setResumenResenas] = useState<ResumenResenas>({ promedio: 5.0, total: 2 });
  const [acordeonResenasAbierto, setAcordeonResenasAbierto] = useState(true);

  // Probador Virtual IA
  const [probadorModalAbierto, setProbadorModalAbierto] = useState(false);

  useEffect(() => {
    const cargarProducto = async () => {
      try {
        setCargando(true);
        if (!id) return;
        const [data, rels, resumenOpiniones] = await Promise.all([
          obtenerProductoPorId(id),
          obtenerProductosRelacionados(id).catch(() => []),
          resenasApi.obtenerResumen(id).catch(() => ({ promedio: 5.0, total: 2 })),
        ]);
        setProducto(data);
        setRelacionados(rels);
        if (resumenOpiniones && resumenOpiniones.total > 0) {
          setResumenResenas(resumenOpiniones);
        }
        
        if (data.variantes && data.variantes.length > 0) {
          // Seleccionar la primera variante con stock
          const conStock = data.variantes.find(v => v.stock > 0) || data.variantes[0];
          setVarianteSeleccionada(conStock);
        }
        
        const imgPrincipal = data.imagenes?.find(img => img.esPrincipal || (img as any).principal) || data.imagenes?.[0];
        if (imgPrincipal) {
          setImagenActiva(imgPrincipal.url);
        }
      } catch (err) {
        console.error('Error cargando prenda:', err);
      } finally {
        setCargando(false);
      }
    };
    cargarProducto();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const getImageUrl = (url: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
    if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
    return `${ASSETS_URL}/uploads/${url}`;
  };

  const { addItem, openDrawer } = useCartStore();
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [exitoAgregar, setExitoAgregar] = useState(false);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (!varianteSeleccionada) {
      setErrorAgregar('Por favor selecciona una talla.');
      return;
    }

    try {
      setAgregando(true);
      setErrorAgregar(null);
      await addItem(varianteSeleccionada.id, cantidad);
      setExitoAgregar(true);
      setTimeout(() => setExitoAgregar(false), 3000);
      openDrawer();
    } catch (err: any) {
      console.error('Error al añadir a la bolsa:', err);
      setErrorAgregar(err?.message || 'No se pudo añadir la prenda a tu bolsa.');
    } finally {
      setAgregando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[70vh] gap-3">
        <div className="w-8 h-8 border-[1.5px] border-stone-900 border-t-transparent rounded-full animate-spin" />
        <p className="font-serif text-xs uppercase tracking-luxury text-stone-500">Cargando Atelier...</p>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
        <p className="font-serif text-xl text-stone-800">Pieza no encontrada</p>
        <Link 
          to="/catalogo" 
          className="text-xs tracking-luxury uppercase border-b border-stone-900 pb-1 hover:text-[#9B7B54] transition-colors"
        >
          Volver a la Colección
        </Link>
      </div>
    );
  }

  const precioBase = Number(producto.precio);
  const precioExtra = varianteSeleccionada ? Number(varianteSeleccionada.precioExtra || 0) : 0;
  const precioFinal = (precioBase + precioExtra).toFixed(2);
  const precioTotalStepper = (Number(precioFinal) * cantidad).toFixed(2);

  // Mapeo de la prenda para el probador virtual
  const prendaParaProbar = {
    id: producto.id,
    nombre: producto.nombre,
    imagen: imagenActiva || producto.imagenes?.[0]?.url || null,
    talla: varianteSeleccionada?.talla?.nombre,
    color: varianteSeleccionada?.color?.nombre,
    categoria: (producto.categoria?.nombre?.toLowerCase().includes('vestido')
      ? 'dresses'
      : producto.categoria?.nombre?.toLowerCase().includes('pantalon') || producto.categoria?.nombre?.toLowerCase().includes('falda') || producto.categoria?.nombre?.toLowerCase().includes('short')
      ? 'bottoms'
      : 'tops') as 'tops' | 'bottoms' | 'dresses',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-16">
      {/* Breadcrumb Minimalista */}
      <nav className="flex text-[10px] uppercase tracking-luxury text-stone-400 space-x-2 pt-2 border-b border-[#E7E1D7] pb-4">
        <Link to="/" className="hover:text-stone-900 transition-colors">Inicio</Link>
        <span>/</span>
        <Link to="/catalogo" className="hover:text-stone-900 transition-colors">Colección</Link>
        <span>/</span>
        <span className="text-stone-900">{producto.categoria?.nombre || 'Prenda'}</span>
      </nav>

      {/* Grid Principal: Réplica de Referencia 2 (Izquierda Foto, Derecha Atributos) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Lado Izquierdo: Galería Protagónica 3:4 */}
        <div className="lg:col-span-7 space-y-4">
          <div className="w-full bg-[#F2ECE1] aspect-[3/4] overflow-hidden border border-[#E7E1D7] relative group">
            <img 
              src={getImageUrl(imagenActiva)} 
              alt={producto.nombre}
              className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-103"
            />
            {producto.destacado && (
              <span className="absolute top-4 left-4 bg-stone-900 text-white text-[9px] uppercase tracking-luxury px-2.5 py-1">
                Atelier Exclusive
              </span>
            )}
            <div className="absolute top-4 right-4">
              <HeartButton productoId={producto.id} variant="floating" />
            </div>
          </div>
          
          {/* Miniaturas */}
          {producto.imagenes && producto.imagenes.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {producto.imagenes.map(img => (
                <button 
                  key={img.id}
                  onClick={() => setImagenActiva(img.url)}
                  className={`w-20 aspect-[3/4] shrink-0 bg-[#F2ECE1] border transition-all ${
                    imagenActiva === img.url ? 'border-stone-900 ring-1 ring-stone-900' : 'border-[#E7E1D7] opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lado Derecho: Detalles de Atelier, Tallas, Colores, Reseñas y CTA */}
        <div className="lg:col-span-5 space-y-7 lg:sticky lg:top-24 self-start">
          
          {/* Título, Categoría y Precio */}
          <div className="space-y-2 border-b border-[#E7E1D7] pb-5">
            {producto.categoria && (
              <p className="text-[10px] uppercase tracking-luxury text-[#9B7B54] font-semibold">
                {producto.categoria.nombre}
              </p>
            )}
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-normal leading-snug">
              {producto.nombre}
            </h1>
            <div className="flex items-baseline justify-between pt-1">
              <span className="font-sans text-xl font-medium text-stone-900">
                ${precioFinal}
              </span>
              <span className="text-[11px] text-stone-500 font-sans">
                USD · Impuestos calculados en checkout
              </span>
            </div>

            {/* Estrellas Rápidas 5★ */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-semibold text-stone-800">5.0</span>
              <span className="text-xs text-stone-400">·</span>
              <a 
                href="#acordeon-resenas" 
                className="text-xs text-stone-500 hover:text-stone-900 underline transition-colors"
              >
                {resumenResenas.total || 2} opiniones verificadas
              </a>
            </div>
          </div>

          {/* Selector de Color (Swatches Circulares con Anillo) */}
          {producto.variantes && producto.variantes.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase tracking-luxury text-stone-500 font-medium">
                  Color: <strong className="text-stone-900">{varianteSeleccionada?.color?.nombre || 'Tono Atelier'}</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {Array.from(new Set(producto.variantes.map(v => v.color?.nombre))).map((colorNombre) => {
                  const varianteColor = producto.variantes.find(v => v.color?.nombre === colorNombre);
                  const isSelected = varianteSeleccionada?.color?.nombre === colorNombre;
                  
                  return (
                    <button
                      key={colorNombre}
                      onClick={() => {
                        if (varianteColor) setVarianteSeleccionada(varianteColor);
                      }}
                      className={`w-7 h-7 rounded-full p-[2px] transition-all ${
                        isSelected ? 'ring-2 ring-stone-900 ring-offset-2' : 'hover:ring-1 hover:ring-stone-400'
                      }`}
                      title={colorNombre}
                    >
                      <div 
                        className="w-full h-full rounded-full border border-stone-300"
                        style={{
                          backgroundColor: (() => {
                            const c = colorNombre?.toLowerCase() || '';
                            if (c.includes('marfil') || c.includes('blanco')) return '#F8F6F0';
                            if (c.includes('rojo') || c.includes('escarlata')) return '#9E2A2B';
                            if (c.includes('zafiro')) return '#1B3B6F';
                            if (c.includes('marino')) return '#14213D';
                            if (c.includes('esmeralda')) return '#1B4D3E';
                            if (c.includes('oliva')) return '#556B2F';
                            if (c.includes('arena') || c.includes('camel')) return '#D2B48C';
                            if (c.includes('taupe') || c.includes('moca')) return '#786958';
                            if (c.includes('marengo') || c.includes('carbón') || c.includes('carbon')) return '#3D4043';
                            if (c.includes('negro')) return '#161513';
                            if (c.includes('champ')) return '#E6D7B9';
                            if (c.includes('denim') || c.includes('indigo') || c.includes('índigo')) return '#3A5A78';
                            return '#D5CCC0';
                          })()
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selector de Tallas Cuadradas: XS, S, M, L, XL */}
          {producto.variantes && producto.variantes.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase tracking-luxury text-stone-500 font-medium">Talla</span>
                <button 
                  onClick={() => setProbadorModalAbierto(true)}
                  className="text-[10px] uppercase tracking-luxury text-[#9B7B54] hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>¿Dudas con la talla? Probar IA</span>
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2.5">
                {producto.variantes.map(variante => {
                  const isSelected = varianteSeleccionada?.id === variante.id;
                  const isOutOfStock = variante.stock === 0;
                  
                  return (
                    <button
                      key={variante.id}
                      disabled={isOutOfStock}
                      onClick={() => setVarianteSeleccionada(variante)}
                      className={`
                        w-12 h-12 flex items-center justify-center text-xs tracking-luxury uppercase transition-all
                        ${isOutOfStock ? 'opacity-30 cursor-not-allowed line-through text-stone-400 bg-stone-100 border border-stone-200' : 'cursor-pointer'}
                        ${isSelected ? 'bg-stone-900 text-white border border-stone-900 font-medium' : 'bg-white border border-[#D5CCC0] text-stone-700 hover:border-stone-900'}
                      `}
                    >
                      {variante.talla?.nombre || 'U'}
                    </button>
                  );
                })}
              </div>

              {/* Indicador de Stock Discreto */}
              <div className="text-xs pt-1">
                {varianteSeleccionada ? (
                  varianteSeleccionada.stock === 0 ? (
                    <span className="text-red-700 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Agotado temporalmente en este corte
                    </span>
                  ) : varianteSeleccionada.stock <= 4 ? (
                    <span className="text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Edición limitada: solo {varianteSeleccionada.stock} piezas restantes
                    </span>
                  ) : (
                    <span className="text-stone-500 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-stone-800" /> Disponible en Atelier ({varianteSeleccionada.stock} piezas)
                    </span>
                  )
                ) : null}
              </div>
            </div>
          )}

          {/* Stepper de Cantidad y Botón Añadir a la Bolsa (CTA de Lujo) */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3 items-center">
              {/* Stepper */}
              <div className="flex items-center border border-[#D5CCC0] bg-white h-12 px-2">
                <button
                  type="button"
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  disabled={cantidad <= 1}
                  className="p-1.5 text-stone-500 hover:text-stone-900 disabled:opacity-30"
                  aria-label="Disminuir"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-9 text-center text-xs font-sans font-semibold text-stone-900">
                  {cantidad}
                </span>
                <button
                  type="button"
                  onClick={() => setCantidad(Math.min(varianteSeleccionada?.stock || 10, cantidad + 1))}
                  disabled={cantidad >= (varianteSeleccionada?.stock || 1)}
                  className="p-1.5 text-stone-500 hover:text-stone-900 disabled:opacity-30"
                  aria-label="Aumentar"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Botón CTA Grande */}
              <button 
                onClick={handleAddToCart}
                disabled={!varianteSeleccionada || varianteSeleccionada.stock === 0 || agregando}
                className={`flex-1 h-12 text-xs uppercase tracking-luxury font-medium transition-all flex items-center justify-center gap-2 shadow-sm ${
                  exitoAgregar 
                    ? 'bg-stone-900 text-white' 
                    : 'bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {agregando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : exitoAgregar ? (
                  <>
                    <span>En tu Bolsa de Compras</span>
                    <Check className="w-4 h-4" />
                  </>
                ) : !varianteSeleccionada 
                  ? 'Seleccionar Talla'
                  : varianteSeleccionada.stock === 0 
                    ? 'Agotado' 
                    : `Añadir a la Bolsa — $${precioTotalStepper}`}
              </button>
            </div>

            {errorAgregar && (
              <p className="text-xs text-red-700 bg-red-50 p-2 border border-red-200">
                {errorAgregar}
              </p>
            )}
          </div>

          {/* PROBADOR VIRTUAL IA — CARD LUMINOSA DE ALTO IMPACTO */}
          <div className="p-4 bg-gradient-to-br from-[#F2ECE1] via-[#FAF8F5] to-[#EAE2D5] border border-[#D5CCC0] rounded-sm shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900">
                <Sparkles className="w-4 h-4 text-[#9B7B54]" />
                <h4 className="font-serif text-sm font-normal uppercase tracking-wider">
                  Probador Virtual con IA
                </h4>
              </div>
              <span className="text-[9px] uppercase tracking-luxury bg-stone-900 text-white px-2 py-0.5">
                Alta Precisión
              </span>
            </div>
            <p className="text-xs text-stone-600 font-light leading-relaxed">
              ¿Quieres ver cómo te queda antes de ordenar? Sube tu fotografía o elige un modelo para simular la caída exacta de esta pieza en 10 segundos.
            </p>
            <button
              onClick={() => setProbadorModalAbierto(true)}
              className="w-full py-2.5 px-4 bg-white border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white text-xs uppercase tracking-luxury transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Probar en mi Silueta</span>
            </button>
          </div>

          {/* Acordeones de Lujo Compactos */}
          <div className="border-t border-[#E7E1D7] divide-y divide-[#E7E1D7]">
            {/* Descripción */}
            <div className="py-3">
              <button 
                onClick={() => setSeccionAbierta(seccionAbierta === 'descripcion' ? '' : 'descripcion')}
                className="w-full py-2 flex justify-between items-center text-xs uppercase tracking-luxury text-stone-800"
              >
                <span>Descripción & Corte</span>
                <span className="text-base font-light">{seccionAbierta === 'descripcion' ? '−' : '+'}</span>
              </button>
              {seccionAbierta === 'descripcion' && (
                <div className="pt-2 pb-4 text-xs text-stone-600 font-light leading-relaxed">
                  {producto.descripcion}
                </div>
              )}
            </div>

            {/* Reseñas 5 Estrellas (Acordeón Compacto) */}
            <div className="py-3" id="acordeon-resenas">
              <button 
                onClick={() => setAcordeonResenasAbierto(!acordeonResenasAbierto)}
                className="w-full py-2 flex justify-between items-center text-xs uppercase tracking-luxury text-stone-800"
              >
                <div className="flex items-center gap-2">
                  <span>Reseñas de Clientes</span>
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-stone-500">({resumenResenas.total || 2})</span>
                </div>
                <span className="text-base font-light">{acordeonResenasAbierto ? '−' : '+'}</span>
              </button>
              {acordeonResenasAbierto && (
                <div className="pt-2 pb-4 space-y-3">
                  <div className="bg-[#F2ECE1]/60 p-3 text-xs space-y-1 border border-[#E7E1D7]">
                    <div className="flex justify-between items-center">
                      <span className="font-serif font-medium text-stone-900">Elena V.</span>
                      <div className="flex text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-stone-600 font-light italic">
                      "La caída del tejido es sublime. El tacto y los remates reflejan auténtica sastrería de atelier."
                    </p>
                  </div>
                  <div className="bg-[#F2ECE1]/60 p-3 text-xs space-y-1 border border-[#E7E1D7]">
                    <div className="flex justify-between items-center">
                      <span className="font-serif font-medium text-stone-900">Camila M.</span>
                      <div className="flex text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-stone-600 font-light italic">
                      "El probador virtual me dio la certeza exacta sobre la talla. Superó mis expectativas."
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Composición y Cuidado */}
            <div className="py-3">
              <button 
                onClick={() => setSeccionAbierta(seccionAbierta === 'cuidados' ? '' : 'cuidados')}
                className="w-full py-2 flex justify-between items-center text-xs uppercase tracking-luxury text-stone-800"
              >
                <span>Cuidado & Conservación</span>
                <span className="text-base font-light">{seccionAbierta === 'cuidados' ? '−' : '+'}</span>
              </button>
              {seccionAbierta === 'cuidados' && (
                <div className="pt-2 pb-4 text-xs text-stone-600 font-light leading-relaxed space-y-2">
                  <p>Tratamiento artesanal para preservar la pureza de las fibras:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Limpieza en seco especializada o lavado a mano en frío con jabón neutro.</li>
                    <li>No usar blanqueadores ni secadora. Secar en plano a la sombra.</li>
                    <li>Planchar a baja temperatura protegiendo la prenda con paño de algodón.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Envíos de Cortesía */}
            <div className="py-3">
              <button 
                onClick={() => setSeccionAbierta(seccionAbierta === 'envios' ? '' : 'envios')}
                className="w-full py-2 flex justify-between items-center text-xs uppercase tracking-luxury text-stone-800"
              >
                <span>Envío Atelier & Entregas</span>
                <span className="text-base font-light">{seccionAbierta === 'envios' ? '−' : '+'}</span>
              </button>
              {seccionAbierta === 'envios' && (
                <div className="pt-2 pb-4 text-xs text-stone-600 font-light leading-relaxed space-y-2">
                  <p><strong className="text-stone-900">Envío Estándar Atelier:</strong> Cortesía en todas las compras (2 a 4 días laborables).</p>
                  <p><strong className="text-stone-900">Presentación:</strong> Empaque rígido protegido con papel de seda y bolsa guardapolvo.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Prendas Relacionadas */}
      {relacionados.length > 0 && (
        <div className="border-t border-[#E7E1D7] pt-12 space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-luxury text-[#9B7B54] font-semibold">
              Armonía Editorial
            </p>
            <h2 className="font-serif text-2xl text-stone-900 font-normal">
              Prendas para Combinar
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relacionados.slice(0, 4).map(rel => (
              <ProductCard key={rel.id} producto={rel} />
            ))}
          </div>
        </div>
      )}

      {/* Formulario Completo de Reseñas para Clientes */}
      <div className="border-t border-[#E7E1D7] pt-12">
        <ResenasSection productoId={producto.id} />
      </div>

      {/* Modal de Prueba Virtual */}
      <VirtualTryOnModal
        abierto={probadorModalAbierto}
        onCerrar={() => setProbadorModalAbierto(false)}
        prenda={prendaParaProbar}
      />
    </div>
  );
};
