import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { Producto } from '../types';
import { HeartButton } from '../../favoritos/components/HeartButton';
import { useCartStore } from '../../../store/cart.store';
import { useTenantStore } from '../../../hooks/useTenantStore';
import { toast } from 'sonner';
import './ProductCard.css';

interface ProductCardProps {
  producto: Producto;
}

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

export const ProductCard: React.FC<ProductCardProps> = ({ producto }) => {
  const navigate = useNavigate();
  const { getStoreUrl } = useTenantStore();
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

  const productUrl = getStoreUrl(`/producto/${producto.id}`);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (producto.variantes && producto.variantes.length > 0) {
      const varianteDisponible = producto.variantes.find((v) => v.stock > 0) || producto.variantes[0];
      setAgregando(true);
      try {
        await addItem(varianteDisponible.id, 1, {
          nombre: producto.nombre,
          precioUnitario: Number(producto.precio),
          imagen: imagenPrincipal?.url || null,
          talla: varianteDisponible.talla?.nombre || null,
          color: varianteDisponible.color?.nombre || null,
          productoId: producto.id,
        });
        setAgregadoExito(true);
        setTimeout(() => setAgregadoExito(false), 2000);
        toast.success(`"${producto.nombre}" se agregó a tu bolsa de compras.`);
      } catch {
        navigate(productUrl);
      } finally {
        setAgregando(false);
      }
    } else {
      navigate(productUrl);
    }
  };

  return (
    <article className="product-card group">
      <div className="product-card__visual">
        <Link to={productUrl} className="product-card__image-link">
          <img 
            src={urlImagen} 
            alt={producto.nombre} 
            className="product-card__image"
          />
          {producto.destacado && (
            <span className="product-card__badge">
              Atelier Pick
            </span>
          )}
        </Link>
        
        {/* Guardar en favoritos */}
        <div className="product-card__favorite">
          <HeartButton productoId={producto.id} variant="floating" />
        </div>
      </div>
      
      <div className="product-card__details">
        <div className="space-y-1 mb-3">
          {producto.categoria && (
            <p className="text-[10px] uppercase tracking-luxury text-[#9B7B54] font-medium">
              {producto.categoria.nombre}
            </p>
          )}
          <h3 className="font-serif text-sm font-normal text-stone-900 line-clamp-1 group-hover:text-[#9B7B54] transition-colors">
            <Link to={productUrl}>
              {producto.nombre}
            </Link>
          </h3>
          <p className="product-card__price">
            ${Number(producto.precio).toFixed(2)}
          </p>
        </div>
        
        <button
          onClick={handleQuickAdd}
          disabled={agregando}
          className={`product-card__quick-add ${
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
    </article>
  );
};
