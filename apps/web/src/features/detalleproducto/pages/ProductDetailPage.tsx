import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { obtenerProductoPorId } from '../../catalogo/services/catalogo.api';
import { Producto, VarianteProducto } from '../../catalogo/types';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para la variante seleccionada
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<VarianteProducto | null>(null);
  // Imagen actualmente mostrada en grande
  const [imagenActiva, setImagenActiva] = useState<string>('');

  useEffect(() => {
    const cargarProducto = async () => {
      try {
        setCargando(true);
        if (!id) return;
        const data = await obtenerProductoPorId(id);
        setProducto(data);
        
        // Configurar valores por defecto
        if (data.variantes && data.variantes.length > 0) {
          setVarianteSeleccionada(data.variantes[0]);
        }
        
        const imgPrincipal = data.imagenes?.find(img => img.esPrincipal) || data.imagenes?.[0];
        if (imgPrincipal) {
          setImagenActiva(imgPrincipal.url);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el producto');
      } finally {
        setCargando(false);
      }
    };
    cargarProducto();
  }, [id]);

  const getImageUrl = (url: string) => {
    if (!url) return 'https://placehold.co/800x1000?text=Sin+Imagen';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
    if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
    return `${ASSETS_URL}/uploads/${url}`;
  };

  const handleAddToCart = () => {
    // Aquí se llamaría al store/servicio de Carrito (módulo de tu compañero)
    alert(`¡Añadido al carrito!\nProducto: ${producto?.nombre}\nSKU: ${varianteSeleccionada?.sku || 'N/A'}`);
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Producto no encontrado</h2>
        <p className="text-gray-500 mb-6">{error || 'El producto que buscas no existe o fue eliminado.'}</p>
        <Link to="/catalogo" className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800">
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  // Precio a mostrar (Base + Extra de la variante)
  const precioBase = parseFloat(producto.precio);
  const precioExtra = varianteSeleccionada ? parseFloat(varianteSeleccionada.precioExtra || '0') : 0;
  const precioFinal = (precioBase + precioExtra).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto py-8">
      <Link to="/catalogo" className="text-sm font-medium text-gray-500 hover:text-black mb-8 inline-block">
        &larr; Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Galería de Imágenes */}
        <div className="space-y-4">
          <div className="aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
            <img 
              src={getImageUrl(imagenActiva)} 
              alt={producto.nombre}
              className="w-full h-full object-cover object-center"
            />
          </div>
          {/* Miniaturas */}
          {producto.imagenes && producto.imagenes.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {producto.imagenes.map(img => (
                <button 
                  key={img.id}
                  onClick={() => setImagenActiva(img.url)}
                  className={`w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    imagenActiva === img.url ? 'border-black opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información del Producto */}
        <div className="flex flex-col">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-2">
              {producto.nombre}
            </h1>
            <p className="text-lg text-gray-500 font-medium">
              {producto.categoria?.nombre || 'Categoría General'}
            </p>
          </div>

          <div className="mb-8">
            <span className="text-3xl font-bold text-gray-900">${precioFinal}</span>
            {precioExtra > 0 && (
              <span className="text-sm text-gray-500 ml-2">(+${precioExtra.toFixed(2)} por esta variante)</span>
            )}
          </div>

          <div className="prose prose-sm text-gray-600 mb-8">
            <p>{producto.descripcion || 'Sin descripción detallada.'}</p>
          </div>

          <div className="h-px bg-gray-200 w-full mb-8"></div>

          {/* Selector de Variantes (Tallas / Colores) */}
          {producto.variantes && producto.variantes.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Opciones Disponibles</h3>
              <div className="grid grid-cols-2 gap-3">
                {producto.variantes.map(variante => {
                  const isSelected = varianteSeleccionada?.id === variante.id;
                  const isOutOfStock = variante.stock === 0;
                  return (
                    <button
                      key={variante.id}
                      disabled={isOutOfStock}
                      onClick={() => setVarianteSeleccionada(variante)}
                      className={`
                        p-3 rounded-lg border text-left transition-all relative overflow-hidden
                        ${isSelected ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}
                        ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}
                      `}
                    >
                      <div className="font-medium text-sm text-gray-900 flex justify-between">
                        <span>{variante.talla?.nombre || 'Única'}</span>
                        {variante.color && (
                          <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: variante.color.hex }}></span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {isOutOfStock ? 'Agotado' : `${variante.stock} en stock`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex gap-4 mt-auto">
            <button 
              onClick={handleAddToCart}
              disabled={!varianteSeleccionada || varianteSeleccionada.stock === 0}
              className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!varianteSeleccionada 
                ? 'Selecciona una opción'
                : varianteSeleccionada.stock === 0 
                  ? 'Agotado' 
                  : 'Añadir al Carrito'}
            </button>
            <button className="w-14 h-14 flex items-center justify-center rounded-xl border border-gray-300 text-gray-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            <span>Envío estándar disponible. Retornos gratuitos.</span>
          </div>

        </div>
      </div>
    </div>
  );
};
