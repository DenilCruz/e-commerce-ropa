import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { Producto } from '../types';
import { HeartButton } from '../../favoritos/components/HeartButton';
import { useCartStore } from '../../../store/cart.store';
import { toast } from 'sonner';

interface ProductCardProps {
  producto: Producto;
}

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const ProductCard: React.FC<ProductCardProps> = ({ producto }) => {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const [agregando, setAgregando] = useState(false);
  const [agregadoExito, setAgregadoExito] = useState(false);

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
    if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
    return `${ASSETS_URL}/uploads/${url}`;
  };

  const imagenPrincipal = producto.imagenes?.find((img) => img.esPrincipal || (img as any).principal) || producto.imagenes?.[0];
  const urlImagen = imagenPrincipal ? getImageUrl(imagenPrincipal.url) : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (producto.variantes && producto.variantes.length > 0) {
      const varianteDisponible = producto.variantes.find((v) => v.stock > 0) || producto.variantes[0];
      setAgregando(true);
      try {
        await addItem(varianteDisponible.id, 1);
        setAgregadoExito(true);
        setTimeout(() => setAgregadoExito(false), 2000);
        toast.success(`"${producto.nombre}" se agregó a tu bolsa de compras.`);
      } catch {
        navigate(`/producto/${producto.id}`);
      } finally {
        setAgregando(false);
      }
    } else {
      navigate(`/producto/${producto.id}`);
    }
  };

  return (
    <div className="group bg-white border border-[#E7E1D7] overflow-hidden hover:border-stone-400 transition-all duration-300 flex flex-col justify-between">
      <div className="relative">
        <Link to={`/producto/${producto.id}`} className="block relative aspect-[3/4] overflow-hidden bg-[#F2ECE1]">
          <img 
            src={urlImagen} 
            alt={producto.nombre} 
            className="w-full h-full object-cover object-top group-hover:scale-104 transition-transform duration-700 ease-out"
          />
          {producto.destacado && (
            <span className="absolute top-2.5 left-2.5 bg-stone-900/90 backdrop-blur-xs text-white text-[9px] uppercase tracking-luxury px-2 py-0.5">
              Atelier Pick
            </span>
          )}
        </Link>
        
        {/* Guardar en favoritos */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <HeartButton productoId={producto.id} variant="floating" />
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1 justify-between bg-white">
        <div className="space-y-1 mb-3">
          {producto.categoria && (
            <p className="text-[10px] uppercase tracking-luxury text-[#9B7B54] font-medium">
              {producto.categoria.nombre}
            </p>
          )}
          <h3 className="font-serif text-sm font-normal text-stone-900 line-clamp-1 group-hover:text-[#9B7B54] transition-colors">
            <Link to={`/producto/${producto.id}`}>
              {producto.nombre}
            </Link>
          </h3>
          <p className="font-sans text-xs font-semibold text-stone-900 tracking-tight pt-0.5">
            ${Number(producto.precio).toFixed(2)}
          </p>
        </div>
        
        <button
          onClick={handleQuickAdd}
          disabled={agregando}
          className={`w-full py-2.5 px-3 border text-xs uppercase tracking-luxury transition-all flex items-center justify-center gap-1.5 font-medium ${
            agregadoExito
              ? 'bg-stone-900 border-stone-900 text-white'
              : 'border-[#D5CCC0] text-stone-800 hover:bg-stone-900 hover:text-white hover:border-stone-900'
          }`}
        >
          {agregando ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : agregadoExito ? (
            <>
              <span>En la Bolsa</span>
              <Check className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Añadir a la Bolsa</span>
              <ShoppingBag className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
