import React from 'react';
import { Link } from 'react-router-dom';
import { Producto } from '../types';
import { HeartButton } from '../../favoritos/components/HeartButton';
import { ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  producto: Producto;
}

// Obtenemos la URL base (http://localhost:3000)
const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const ProductCard: React.FC<ProductCardProps> = ({ producto }) => {
  // Función para normalizar la URL de la imagen
  const getImageUrl = (url?: string) => {
    if (!url) return 'https://placehold.co/400x500?text=Sin+Imagen';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
    if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
    return `${ASSETS_URL}/uploads/${url}`;
  };

  const imagenPrincipal = producto.imagenes?.find(img => img.esPrincipal || img.principal) || producto.imagenes?.[0];
  const urlImagen = getImageUrl(imagenPrincipal?.url);

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
      <div className="relative">
        <Link to={`/producto/${producto.id}`} className="block relative aspect-[4/5] overflow-hidden bg-gray-100">
          <img 
            src={urlImagen} 
            alt={producto.nombre} 
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          {producto.destacado && (
            <span className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shadow-sm">
              Destacado
            </span>
          )}
        </Link>
        
        {/* HU-76: Botón de guardar en favoritos directamente en la tarjeta */}
        <div className="absolute top-2 right-2 z-10">
          <HeartButton productoId={producto.id} variant="floating" />
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div className="mb-3">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 hover:text-gray-600 transition-colors">
              <Link to={`/producto/${producto.id}`}>
                {producto.nombre}
              </Link>
            </h3>
            <p className="text-sm font-bold text-gray-900 whitespace-nowrap">${Number(producto.precio).toFixed(2)}</p>
          </div>
          {producto.categoria && (
            <p className="text-xs text-gray-500 font-medium">{producto.categoria.nombre}</p>
          )}
        </div>
        
        <Link
          to={`/producto/${producto.id}`}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-800 text-xs font-medium uppercase tracking-wider py-2.5 rounded-lg hover:bg-black hover:text-white hover:border-black transition-colors focus:outline-none"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Ver Opciones</span>
        </Link>
      </div>
    </div>
  );
};
