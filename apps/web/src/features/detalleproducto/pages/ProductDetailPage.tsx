import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { obtenerProductoPorId } from "../../catalogo/services/catalogo.api";
import { Producto, VarianteProducto } from "../../catalogo/types";
import { HeartButton } from '../../favoritos/components/HeartButton';
import { ResenasSection } from '../../resenas/components/ResenasSection';
import { useCartStore } from '../../../store/cart.store';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<VarianteProducto | null>(null);
  const [imagenActiva, setImagenActiva] = useState<string>('');
  
  // Para los acordeones de información extra
  const [seccionAbierta, setSeccionAbierta] = useState<string>('descripcion');

  useEffect(() => {
    const cargarProducto = async () => {
      try {
        setCargando(true);
        if (!id) return;
        const data = await obtenerProductoPorId(id);
        setProducto(data);
        
        if (data.variantes && data.variantes.length > 0) {
          setVarianteSeleccionada(data.variantes[0]);
        }
        
        const imgPrincipal = data.imagenes?.find(img => img.esPrincipal) || data.imagenes?.[0];
        if (imgPrincipal) {
          setImagenActiva(imgPrincipal.url);
        }
      } catch (err: any) {
        // Manejo silencioso en el UI premium
      } finally {
        setCargando(false);
      }
    };
    cargarProducto();
  }, [id]);

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
    if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
    return `${ASSETS_URL}/uploads/${url}`;
  };

  const { addItem } = useCartStore();
  const navigateTo = useNavigate();
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
      setTimeout(() => setExitoAgregar(false), 4000);
    } catch (err: any) {
      console.error('Error al añadir al carrito:', err);
      setErrorAgregar(err?.message || 'No se pudo añadir el producto al carrito.');
    } finally {
      setAgregando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="w-8 h-8 border-[1.5px] border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm tracking-widest uppercase text-gray-400 mb-6">No encontrado</p>
        <Link to="/catalogo" className="text-xs tracking-widest uppercase border-b border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition-colors">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const precioBase = parseFloat(producto.precio);
  const precioExtra = varianteSeleccionada ? parseFloat(varianteSeleccionada.precioExtra || '0') : 0;
  const precioFinal = (precioBase + precioExtra).toFixed(2);

  return (
    <div className="max-w-screen-2xl mx-auto bg-white">
      {/* Breadcrumb Minimalista */}
      <div className="px-6 py-8">
        <nav className="flex text-[11px] tracking-widest uppercase text-gray-400 space-x-2">
          <Link to="/" className="hover:text-black transition-colors">Inicio</Link>
          <span>/</span>
          <Link to="/catalogo" className="hover:text-black transition-colors">Catálogo</Link>
          <span>/</span>
          <span className="text-black">{producto.categoria?.nombre || 'Colección'}</span>
        </nav>
      </div>

      <div className="flex flex-col lg:flex-row px-6 pb-20 gap-16">
        
        {/* Lado Izquierdo: Galería de Imágenes (Protagónica) */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">
          <div className="w-full bg-[#f9f9f9] aspect-[3/4] overflow-hidden flex items-center justify-center">
            <img 
              src={getImageUrl(imagenActiva)} 
              alt={producto.nombre}
              className="w-full h-full object-cover object-center"
            />
          </div>
          
          {producto.imagenes && producto.imagenes.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {producto.imagenes.map(img => (
                <button 
                  key={img.id}
                  onClick={() => setImagenActiva(img.url)}
                  className={`w-24 aspect-[3/4] flex-shrink-0 bg-[#f9f9f9] transition-opacity ${
                    imagenActiva === img.url ? 'opacity-100 ring-1 ring-black ring-offset-2' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lado Derecho: Información Editorial */}
        <div className="w-full lg:w-2/5 flex flex-col pt-4 lg:pr-12 lg:sticky lg:top-24 self-start">
          
          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-light text-black mb-4 tracking-tight">
              {producto.nombre}
            </h1>
            <p className="text-xl font-normal text-black">
              ${precioFinal}
            </p>
          </div>

          {/* Selector de Tallas Minimalista */}
          {producto.variantes && producto.variantes.length > 0 && (
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs uppercase tracking-widest text-gray-500 font-medium">Talla</span>
                <button className="text-[10px] uppercase tracking-widest underline text-gray-400 hover:text-black transition-colors">
                  Guía de Tallas
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {producto.variantes.map(variante => {
                  const isSelected = varianteSeleccionada?.id === variante.id;
                  const isOutOfStock = variante.stock === 0;
                  
                  return (
                    <button
                      key={variante.id}
                      disabled={isOutOfStock}
                      onClick={() => setVarianteSeleccionada(variante)}
                      className={`
                        w-14 h-14 flex items-center justify-center text-xs tracking-widest uppercase transition-all
                        ${isOutOfStock ? 'opacity-30 cursor-not-allowed line-through text-gray-400' : 'cursor-pointer hover:border-black'}
                        ${isSelected ? 'border-[1.5px] border-black font-medium text-black' : 'border border-gray-200 text-gray-600'}
                      `}
                    >
                      {variante.talla?.nombre || 'ÚNICA'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selector de Cantidad y Stock */}
          {varianteSeleccionada && varianteSeleccionada.stock > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase tracking-widest text-gray-500 font-medium">Cantidad</span>
                <span className="text-xs text-gray-400">
                  {varianteSeleccionada.stock} disponible{varianteSeleccionada.stock !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    disabled={cantidad <= 1}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-semibold text-gray-900">
                    {cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCantidad(Math.min(varianteSeleccionada.stock, cantidad + 1))}
                    disabled={cantidad >= varianteSeleccionada.stock}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-gray-500">
                  Subtotal: <strong className="text-black">Bs. {(Number(precioFinal) * cantidad).toFixed(2)}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {exitoAgregar && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>¡Añadido!</strong> Se {cantidad === 1 ? 'agregó 1 prenda' : `agregaron ${cantidad} prendas`} a tu bolsa.
                </span>
              </div>
              <Link 
                to="/carrito" 
                className="underline font-bold text-emerald-900 hover:text-black ml-4 whitespace-nowrap"
              >
                Ver Carrito →
              </Link>
            </div>
          )}

          {/* Error Banner si falla */}
          {errorAgregar && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="font-medium">{errorAgregar}</span>
              </div>
              <button 
                onClick={() => setErrorAgregar(null)} 
                className="text-red-500 hover:text-red-800 font-bold ml-2 text-sm leading-none"
              >
                ✕
              </button>
            </div>
          )}

          {/* Botón Añadir Premium */}
          <div className="flex gap-4 mb-12">
            <button 
              onClick={handleAddToCart}
              disabled={!varianteSeleccionada || varianteSeleccionada.stock === 0 || agregando}
              className={`flex-1 py-4 text-xs tracking-widest uppercase font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                exitoAgregar 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {agregando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Agregando...</span>
                </>
              ) : exitoAgregar ? (
                <>
                  <span>¡Añadido a la Cesta!</span>
                  <Check className="w-4 h-4" />
                </>
              ) : !varianteSeleccionada 
                ? 'Seleccionar Talla'
                : varianteSeleccionada.stock === 0 
                  ? 'Agotado' 
                  : 'Añadir a la Cesta'}
            </button>
            <HeartButton productoId={producto.id} className="w-14 h-14 border border-gray-200 hover:border-black" />
          </div>

          {/* Acordeones Editoriales (Detalles, Envío, Composición) */}
          <div className="border-t border-gray-200">
            {/* Detalle */}
            <div className="border-b border-gray-200">
              <button 
                onClick={() => setSeccionAbierta(seccionAbierta === 'descripcion' ? '' : 'descripcion')}
                className="w-full py-5 flex justify-between items-center text-xs uppercase tracking-widest font-medium"
              >
                Descripción
                <span className="text-xl font-light leading-none">{seccionAbierta === 'descripcion' ? '-' : '+'}</span>
              </button>
              {seccionAbierta === 'descripcion' && (
                <div className="pb-6 text-sm text-gray-500 font-light leading-relaxed">
                  {producto.descripcion}
                </div>
              )}
            </div>

            {/* Composición */}
            <div className="border-b border-gray-200">
              <button 
                onClick={() => setSeccionAbierta(seccionAbierta === 'composicion' ? '' : 'composicion')}
                className="w-full py-5 flex justify-between items-center text-xs uppercase tracking-widest font-medium"
              >
                Composición y Cuidado
                <span className="text-xl font-light leading-none">{seccionAbierta === 'composicion' ? '-' : '+'}</span>
              </button>
              {seccionAbierta === 'composicion' && (
                <div className="pb-6 text-sm text-gray-500 font-light leading-relaxed space-y-2">
                  <p>Trabajamos con programas de seguimiento para garantizar el cumplimiento de nuestros estándares.</p>
                  <ul className="list-disc pl-4 space-y-1 mt-2">
                    <li>Lavar a máquina max. 30ºC. Centrifugado corto.</li>
                    <li>No usar lejía / blanqueador.</li>
                    <li>Planchar máximo 110ºC.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Envíos y Devoluciones */}
            <div className="border-b border-gray-200">
              <button 
                onClick={() => setSeccionAbierta(seccionAbierta === 'envios' ? '' : 'envios')}
                className="w-full py-5 flex justify-between items-center text-xs uppercase tracking-widest font-medium"
              >
                Envíos y Devoluciones
                <span className="text-xl font-light leading-none">{seccionAbierta === 'envios' ? '-' : '+'}</span>
              </button>
              {seccionAbierta === 'envios' && (
                <div className="pb-6 text-sm text-gray-500 font-light leading-relaxed space-y-4">
                  <div>
                    <strong className="block text-black font-medium mb-1">Recogida en tienda - Gratuito</strong>
                    <p>En la tienda que elijas en 2-3 días laborables.</p>
                  </div>
                  <div>
                    <strong className="block text-black font-medium mb-1">Envío a domicilio - $5.00</strong>
                    <p>Entrega estimada de 2 a 4 días laborables.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Sección de Reseñas */}
      <div className="px-6">
        <ResenasSection productoId={producto.id} />
      </div>
    </div>
  );
};
