import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Heart, 
  Package, 
  User, 
  ShieldCheck, 
  LogOut, 
  FolderTree, 
  ChevronDown, 
  ChevronRight, 
  Menu, 
  X, 
  Tag, 
  Sparkles 
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useFavoritosStore } from '../features/favoritos/store/favoritos.store';
import { useCartStore } from '../store/cart.store';
import { authApi } from '../features/autenticacion/services/auth.api';
import { obtenerCategorias } from '../features/catalogo/services/catalogo.api';
import { Categoria } from '../features/catalogo/types';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, refreshToken } = useAuthStore();
  const { items: favoritosItems, cargarFavoritos } = useFavoritosStore();
  const totalCartItems = useCartStore((s) => s.cart?.totalItems || (s.guestItems?.reduce((acc, i) => acc + i.cantidad, 0) || 0));

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [dropdownCategoriasAbierto, setDropdownCategoriasAbierto] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [categoriaMovilExpandida, setCategoriaMovilExpandida] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterDropdown = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setDropdownCategoriasAbierto(true);
  };

  const handleMouseLeaveDropdown = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDropdownCategoriasAbierto(false);
    }, 200);
  };

  // Sincronizar favoritos del usuario autenticado
  useEffect(() => {
    if (user?.id) {
      cargarFavoritos(user.id);
    }
  }, [user?.id, cargarFavoritos]);

  // Cargar árbol de categorías para el menú (HU-33)
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const data = await obtenerCategorias();
        // Filtrar solo categorías activas
        const activas = data.filter(c => c.activa !== false);
        setCategorias(activas);
      } catch (err) {
        console.error('Error cargando categorías para el menú:', err);
      }
    };
    fetchCats();
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownCategoriasAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    };
  }, []);

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setDropdownCategoriasAbierto(false);
    setMenuMovilAbierto(false);
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Continuar con logout local
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Barra superior de anuncios */}
      <div className="bg-black text-white text-[11px] font-medium py-1.5 px-4 text-center tracking-wider uppercase flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Nueva Colección Exclusiva · Envíos a todo el país</span>
      </div>

      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* LOGO & NAVEGACIÓN DESKTOP */}
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2.5 group">
              <span className="bg-black text-white px-2 py-1 rounded text-xs font-black group-hover:scale-105 transition-transform">
                EM
              </span>
              <span className="tracking-tighter">El Magnífico</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link to="/catalogo" className="hover:text-black transition-colors flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-gray-400" />
                <span>Catálogo</span>
              </Link>

              {/* DROPDOWN ÁRBOL DE CATEGORÍAS */}
              <div 
                className="relative" 
                ref={dropdownRef}
                onMouseEnter={handleMouseEnterDropdown}
                onMouseLeave={handleMouseLeaveDropdown}
              >
                <button
                  type="button"
                  onClick={() => setDropdownCategoriasAbierto(!dropdownCategoriasAbierto)}
                  className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-colors ${
                    dropdownCategoriasAbierto ? 'bg-gray-100 text-black font-semibold' : 'hover:text-black'
                  }`}
                >
                  <FolderTree className="w-4 h-4 text-gray-400" />
                  <span>Categorías</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                    dropdownCategoriasAbierto ? 'rotate-180 text-black' : ''
                  }`} />
                </button>

                {/* MEGA-MENÚ DESPLEGABLE CON EL ÁRBOL */}
                {dropdownCategoriasAbierto && (
                  <div className="absolute left-0 mt-2 w-[540px] bg-white rounded-2xl shadow-xl border border-gray-200 p-6 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                      <div>
                        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-900 flex items-center gap-2">
                          <FolderTree className="w-4 h-4 text-black" />
                          Árbol de Categorías
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Explora nuestras colecciones y prendas</p>
                      </div>
                      <Link
                        to="/catalogo"
                        onClick={() => setDropdownCategoriasAbierto(false)}
                        className="text-xs text-black font-semibold hover:underline"
                      >
                        Ver todo el catálogo →
                      </Link>
                    </div>

                    {categorias.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">No hay categorías disponibles</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-6 max-h-[420px] overflow-y-auto pr-2">
                        {categorias.map(cat => {
                          const tieneSubcats = cat.subcategorias && cat.subcategorias.length > 0;

                          return (
                            <div key={cat.id} className="space-y-2">
                              {/* Categoría Principal */}
                              <Link
                                to={`/catalogo?categoria=${cat.id}`}
                                onClick={() => setDropdownCategoriasAbierto(false)}
                                className="group/item flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  {cat.imagen ? (
                                    <img
                                      src={getImageUrl(cat.imagen)}
                                      alt={cat.nombre}
                                      className="w-7 h-7 object-cover rounded-md border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-gray-600">
                                      <Tag className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                  <span className="font-semibold text-gray-900 group-hover/item:text-black text-sm">
                                    {cat.nombre}
                                  </span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover/item:text-black group-hover/item:translate-x-0.5 transition-all" />
                              </Link>

                              {/* Subcategorías Anidadas */}
                              {tieneSubcats && (
                                <ul className="pl-9 space-y-1 border-l-2 border-gray-100 ml-3.5">
                                  {cat.subcategorias!.filter(s => s.activa !== false).map(sub => (
                                    <li key={sub.id}>
                                      <Link
                                        to={`/catalogo?categoria=${sub.id}`}
                                        onClick={() => setDropdownCategoriasAbierto(false)}
                                        className="text-xs text-gray-500 hover:text-black hover:font-semibold py-1 px-2 rounded block transition-colors"
                                      >
                                        ↳ {sub.nombre}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link to="/carrito" className="hover:text-black transition-colors flex items-center gap-1.5 relative">
                <ShoppingCart className="w-4 h-4 text-gray-400" />
                <span>Carrito</span>
                {totalCartItems > 0 && (
                  <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center leading-tight">
                    {totalCartItems}
                  </span>
                )}
              </Link>

              {isAuthenticated && (
                <>
                  <Link to="/favoritos" className="hover:text-black transition-colors flex items-center gap-1.5 relative">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>Favoritos</span>
                    {favoritosItems.length > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center leading-tight">
                        {favoritosItems.length}
                      </span>
                    )}
                  </Link>
                  <Link to="/pedidos" className="hover:text-black transition-colors flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span>Mis Pedidos</span>
                  </Link>
                </>
              )}

              {user?.rol === 'ADMIN' && (
                <Link to="/admin" className="text-purple-600 font-semibold hover:text-purple-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Panel Admin</span>
                </Link>
              )}
            </nav>
          </div>

          {/* ACCIONES DERECHA (USUARIO / SESIÓN) */}
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
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-medium text-gray-700 hover:text-black px-3 py-1.5 rounded-lg transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/registro"
                  className="text-xs sm:text-sm font-medium bg-black text-white hover:bg-gray-800 px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
                >
                  Registrarse
                </Link>
              </div>
            )}

            {/* BOTÓN MENÚ MÓVIL */}
            <button
              onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
              aria-label="Abrir Menú"
            >
              {menuMovilAbierto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* MENÚ MÓVIL DESPLEGABLE (HU-33 Responsive) */}
        {menuMovilAbierto && (
          <div className="lg:hidden border-t border-gray-200 mt-3 pt-4 space-y-4 animate-in slide-in-from-top duration-150">
            <nav className="flex flex-col space-y-2 text-sm font-medium">
              <Link to="/catalogo" className="p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Catálogo Completo
              </Link>
              <Link to="/carrito" className="p-2 rounded-lg hover:bg-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Carrito de Compras</span>
                </div>
                {totalCartItems > 0 && (
                  <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {totalCartItems}
                  </span>
                )}
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/favoritos" className="p-2 rounded-lg hover:bg-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <span>Favoritos</span>
                    </div>
                    {favoritosItems.length > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {favoritosItems.length}
                      </span>
                    )}
                  </Link>
                  <Link to="/pedidos" className="p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Mis Pedidos
                  </Link>
                  <Link to="/perfil" className="p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Mi Perfil
                  </Link>
                </>
              )}
              {user?.rol === 'ADMIN' && (
                <Link to="/admin" className="p-2 rounded-lg bg-purple-50 text-purple-700 font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Panel Admin
                </Link>
              )}
            </nav>

            {/* Árbol de Categorías en Móvil */}
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-black" />
                Árbol de Categorías
              </p>
              <div className="space-y-1">
                {categorias.map(cat => {
                  const tieneSubcats = cat.subcategorias && cat.subcategorias.length > 0;
                  const expandida = categoriaMovilExpandida === cat.id;

                  return (
                    <div key={cat.id} className="rounded-lg bg-gray-50 overflow-hidden">
                      <div className="flex items-center justify-between p-2.5">
                        <Link
                          to={`/catalogo?categoria=${cat.id}`}
                          className="font-medium text-sm text-gray-900 hover:text-black flex-1"
                        >
                          {cat.nombre}
                        </Link>
                        {tieneSubcats && (
                          <button
                            onClick={() => setCategoriaMovilExpandida(expandida ? null : cat.id)}
                            className="p-1 text-gray-400 hover:text-black"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${expandida ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {tieneSubcats && expandida && (
                        <div className="bg-gray-100/70 px-4 py-2 space-y-1.5 border-t border-gray-200">
                          {cat.subcategorias!.filter(s => s.activa !== false).map(sub => (
                            <Link
                              key={sub.id}
                              to={`/catalogo?categoria=${sub.id}`}
                              className="block text-xs text-gray-600 hover:text-black py-1"
                            >
                              ↳ {sub.nombre}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 text-center py-8 text-sm border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-gray-300">El Magnífico — E-Commerce de Ropa</p>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Todos los derechos reservados. Diseñado para ofrecer la mejor experiencia de compra.
          </p>
        </div>
      </footer>
    </div>
  );
};
