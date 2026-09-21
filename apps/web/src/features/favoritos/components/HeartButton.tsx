import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavoritosStore } from '../store/favoritos.store';
import { useAuthStore } from '../../../store/auth.store';
import { useNavigate } from 'react-router-dom';

interface HeartButtonProps {
  productoId: string;
  className?: string;
  iconClassName?: string;
  variant?: 'default' | 'floating' | 'outline';
}

export const HeartButton: React.FC<HeartButtonProps> = ({
  productoId,
  className = '',
  iconClassName = '',
  variant = 'default',
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { esFavorito, toggleFavorito, cargarFavoritos } = useFavoritosStore();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (user) {
      cargarFavoritos(user.id);
    }
  }, [user, cargarFavoritos]);

  const activo = esFavorito(productoId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    await toggleFavorito(user.id, productoId);
  };

  // Estilos según la variante visual
  const getVariantStyles = () => {
    if (variant === 'floating') {
      return 'w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200/80 shadow-sm hover:shadow-md hover:bg-white transition-all duration-200';
    }
    if (variant === 'outline') {
      return 'p-2 rounded-xl border border-gray-200 hover:border-black transition-colors';
    }
    return '';
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center transition-all duration-200 focus:outline-none ${getVariantStyles()} ${className}`}
      aria-label={activo ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      title={activo ? 'Quitar de favoritos' : 'Guardar en favoritos'}
    >
      <Heart
        className={`transition-all duration-300 ${
          activo
            ? 'fill-rose-500 text-rose-500'
            : 'text-gray-400 hover:text-gray-700'
        } ${animating ? 'scale-125' : 'scale-100'} ${
          iconClassName || (variant === 'floating' ? 'w-4 h-4' : 'w-5 h-5')
        }`}
      />
    </button>
  );
};
