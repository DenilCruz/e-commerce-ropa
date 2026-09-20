import React, { useEffect } from 'react';
import { useFavoritosStore } from '../store/favoritos.store';
import { useAuthStore } from '../../../store/auth.store';
import { useNavigate } from 'react-router-dom';

interface HeartButtonProps {
  productoId: string;
  className?: string;
}

export const HeartButton: React.FC<HeartButtonProps> = ({ productoId, className = '' }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { esFavorito, toggleFavorito, cargarFavoritos } = useFavoritosStore();

  useEffect(() => {
    if (user) {
      cargarFavoritos(user.id);
    }
  }, [user, cargarFavoritos]);

  const activo = esFavorito(productoId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    toggleFavorito(user.id, productoId);
  };

  return (
    <button 
      onClick={handleClick}
      className={`flex items-center justify-center transition-colors ${className}`}
      aria-label={activo ? 'Quitar de favoritos' : 'Añadir a favoritos'}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        strokeWidth={1} 
        stroke="currentColor" 
        className={`w-5 h-5 transition-transform duration-300 ${activo ? 'fill-black text-black scale-110' : 'fill-none hover:scale-110'}`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    </button>
  );
};
