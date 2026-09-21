import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { Producto } from '../types';
import { useCartStore } from '../../../store/cart.store';

interface ProductCardProps {
  producto: Producto;
}

// Obtenemos la URL base (http://localhost:3000)
const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const ProductCard: React.FC<ProductCardProps> = ({ producto }) => {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const [agregando, setAgregando] = useState(false);
  const [agregadoExito, setAgregadoExito] = useState(false);

  // Función para normalizar la URL de la imagen
  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
    if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
    return `${ASSETS_URL}/uploads/${url}`;
  };

  const imagenPrincipal = producto.imagenes?.find((img) => img.esPrincipal) || producto.imagenes?.[0];
  const urlImagen = imagenPrincipal ? getImageUrl(imagenPrincipal.url) : 'https://placehold.co/400x500?text=Sin+Imagen';

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Si tiene variantes y hay al menos una con stock
    if (producto.variantes && producto.variantes.length > 0) {
      const varianteDisponible = producto.variantes.find((v) => v.stock > 0) || producto.variantes[0];
      setAgregando(true);
      try {
        await addItem(varianteDisponible.id, 1);
        setAgregadoExito(true);
        setTimeout(() => setAgregadoExito(false), 2200);
      } catch (err: any) {
        // Si requiere seleccionar talla específica o hubo error, navegar al detalle
        navigate(`/producto/${producto.id}`);
      } finally {
        setAgregando(false);
      }
    } else {
      navigate(`/producto/${producto.id}`);
    }
  };

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
      <div>
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
        
        <div className="p-4 pb-2">
          <div className="flex justify-between items-start mb-1">
            <Link to={`/producto/${producto.id}`} className="hover:underline">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{producto.nombre}</h3>
            </Link>
            <p className="text-sm font-bold text-gray-900 ml-2 whitespace-nowrap">Bs. {Number(producto.precio).toFixed(2)}</p>
          </div>
          {producto.categoria && (
            <p className="text-xs text-gray-500">{producto.categoria.nombre}</p>
          )}
        </div>
      </div>
      
      <div className="p-4 pt-0">
        <button
          onClick={handleQuickAdd}
          disabled={agregando}
          className={`w-full mt-2 border text-sm font-medium py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 flex items-center justify-center gap-1.5 ${
            agregadoExito
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-white border-gray-300 text-gray-800 hover:bg-black hover:text-white hover:border-black'
          }`}
        >
          {agregando ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : agregadoExito ? (
            <>
              <span className="font-semibold">¡Añadido!</span>
              <Check className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Añadir al Carrito</span>
              <ShoppingBag className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
