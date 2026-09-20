import React, { useEffect } from 'react';
import { useFavoritosStore } from '../store/favoritos.store';
import { useAuthStore } from '../../../store/auth.store';
import { Link, Navigate } from 'react-router-dom';
import { ProductCard } from '../../catalogo/components/ProductCard';

export const FavoritosPage: React.FC = () => {
  const { user } = useAuthStore();
  const { items, cargarFavoritos, cargando } = useFavoritosStore();

  useEffect(() => {
    if (user) {
      cargarFavoritos(user.id);
    }
  }, [user, cargarFavoritos]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-light tracking-tight uppercase mb-2">Mi Lista de Deseos</h1>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-10">
        {items.length} {items.length === 1 ? 'Artículo' : 'Artículos'} guardados
      </p>

      {cargando ? (
        <div className="flex justify-center items-center min-h-[30vh]">
          <div className="w-6 h-6 border-[1.5px] border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-[#f9f9f9]">
          <p className="text-sm font-light text-gray-500 mb-6">Aún no tienes artículos guardados.</p>
          <Link to="/catalogo" className="text-xs tracking-widest uppercase border-b border-black pb-1 hover:text-gray-600 transition-colors">
            Explorar Catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(favorito => (
            favorito.producto ? (
              <div key={favorito.id} className="relative">
                <ProductCard producto={favorito.producto} />
              </div>
            ) : null
          ))}
        </div>
      )}
    </div>
  );
};
