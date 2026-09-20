import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { obtenerProductoPorId } from '../../catalogo/services/catalogo.api';
import { Producto, VarianteProducto } from '../../catalogo/types';

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

  const handleAddToCart = () => {
    alert(`Añadido al carrito:\n${producto?.nombre}\nTalla: ${varianteSeleccionada?.talla?.nombre || 'Única'}`);
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

          {/* Botón Añadir Premium */}
          <div className="flex gap-4 mb-12">
            <button 
              onClick={handleAddToCart}
              disabled={!varianteSeleccionada || varianteSeleccionada.stock === 0}
              className="flex-1 bg-black text-white py-4 text-xs tracking-widest uppercase font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!varianteSeleccionada 
                ? 'Seleccionar Talla'
                : varianteSeleccionada.stock === 0 
                  ? 'Agotado' 
                  : 'Añadir a la Cesta'}
            </button>
            <button className="w-14 h-14 flex items-center justify-center border border-gray-200 hover:border-black transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
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
    </div>
  );
};
