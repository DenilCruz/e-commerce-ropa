import React from 'react';
import { Link } from 'react-router-dom';
import { Producto } from '../types';

interface ProductCardProps {
  producto: Producto;
}

// Obtenemos la URL base (http://localhost:3000)
const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const ProductCard: React.FC<ProductCardProps> = ({ producto }) => {
  // Buscar la imagen principal o la primera
  const imagenPrincipal = producto.imagenes?.find(img => img.esPrincipal) || producto.imagenes?.[0];
  const urlImagen = imagenPrincipal ? `${ASSETS_URL}${imagenPrincipal.url}` : 'https://placehold.co/400x500?text=Sin+Imagen';

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
      <Link to={`/producto/${producto.id}`} className="block relative aspect-[4/5] overflow-hidden bg-gray-100">
        <img 
          src={urlImagen} 
          alt={producto.nombre} 
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        {producto.destacado && (
          <span className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
            Destacado
          </span>
        )}
      </Link>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{producto.nombre}</h3>
            {producto.categoria && (
              <p className="text-xs text-gray-500">{producto.categoria.nombre}</p>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">${producto.precio}</p>
        </div>
        
        <button className="w-full mt-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 hover:border-black transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1">
          Añadir al Carrito
        </button>
      </div>
    </div>
  );
};
