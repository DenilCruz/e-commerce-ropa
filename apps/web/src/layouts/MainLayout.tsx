import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useCartStore } from '../store/cart.store';
import { authApi } from '../features/autenticacion/services/auth.api';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, refreshToken } = useAuthStore();
  const totalItems = useCartStore((s) => s.cart?.totalItems || 0);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Continuar con logout local incluso si la petición falla
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <span className="bg-black text-white px-2 py-1 rounded text-sm font-bold">EM</span>
            <span>El Magnífico</span>
          </Link>

          <nav className="hidden md:flex gap-5 text-sm font-medium text-gray-600 items-center">
            <Link to="/catalogo" className="hover:text-black transition-colors">Catálogo</Link>
            <Link to="/carrito" className="hover:text-black transition-colors flex items-center gap-1.5">
              <span>Carrito</span>
              {totalItems > 0 && (
                <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {totalItems}
                </span>
              )}
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/favoritos" className="hover:text-black transition-colors">Favoritos</Link>
                <Link to="/pedidos" className="hover:text-black transition-colors">Mis Pedidos</Link>
                <Link to="/perfil" className="hover:text-black transition-colors">Mi Perfil</Link>
              </>
            )}
            {user?.rol === 'ADMIN' && (
              <Link to="/admin" className="text-purple-600 font-semibold hover:text-purple-800">
                Panel Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/perfil"
                className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                  {user.nombre?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span className="font-medium hidden sm:inline">{user.nombre}</span>
                {user.rol && (
                  <span className="text-[10px] uppercase tracking-wider bg-gray-200 px-1.5 py-0.5 rounded font-semibold text-gray-600">
                    {user.rol}
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-700 hover:text-black px-3 py-1.5 rounded-lg transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/registro"
                className="text-sm font-medium bg-black text-white hover:bg-gray-800 px-4 py-1.5 rounded-lg shadow-sm transition-all"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-400 text-center py-6 text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} El Magnífico — E-Commerce de Ropa. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
