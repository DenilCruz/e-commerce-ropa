import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  Heart, 
  Package, 
  User, 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  ChevronRight, 
  Menu, 
  X, 
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useFavoritosStore } from '../features/favoritos/store/favoritos.store';
import { useCartStore } from '../store/cart.store';
import { authApi } from '../features/autenticacion/services/auth.api';
import { obtenerCategorias } from '../features/catalogo/services/catalogo.api';
import { Categoria } from '../features/catalogo/types';
import { CartDrawer } from '../components/cart/CartDrawer';

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
  const openDrawer = useCartStore((s) => s.openDrawer);

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
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 font-sans selection:bg-[#E7E1D7] selection:text-stone-900">
      {/* HEADER PRINCIPAL AURA */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E7E1D7] px-4 sm:px-8 py-3.5 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* LOGO & NAVEGACIÓN DESKTOP */}
          <div className="flex items-center gap-10">
            <Link to="/" className="group flex items-center gap-2">
              <span className="font-serif text-2xl tracking-[0.25em] font-normal uppercase text-stone-900 group-hover:text-[#9B7B54] transition-colors">
                AURA
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-7 text-xs uppercase tracking-widest font-medium text-stone-600">
              <Link 
                to="/catalogo" 
                className="hover:text-stone-900 transition-colors py-1"
              >
                Colección
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
                  className={`flex items-center gap-1 py-1 transition-colors uppercase tracking-widest ${
                    dropdownCategoriasAbierto ? 'text-stone-900 font-semibold' : 'hover:text-stone-900'
                  }`}
                >
                  <span>Categorías</span>
                  <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform duration-200 ${
                    dropdownCategoriasAbierto ? 'rotate-180 text-stone-900' : ''
                  }`} />
                </button>

                {/* MEGA-MENÚ DESPLEGABLE CON EL ÁRBOL */}
                {dropdownCategoriasAbierto && (
                  <div className="absolute left-0 mt-3 w-[560px] bg-[#FAF8F5] rounded-none shadow-xl border border-[#E7E1D7] p-7 z-50 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#E7E1D7]">
                      <div>
                        <h3 className="font-serif text-base tracking-widest uppercase text-stone-900">
                          Catálogo Editorial
                        </h3>
                        <p className="text-[11px] text-stone-500 font-sans tracking-normal mt-0.5">Explora cortes de atelier y tejidos nobles</p>
                      </div>
                      <Link
                        to="/catalogo"
                        onClick={() => setDropdownCategoriasAbierto(false)}
                        className="text-xs text-stone-900 font-sans uppercase tracking-widest font-semibold hover:text-[#9B7B54] transition-colors"
                      >
                        Ver todo →
                      </Link>
                    </div>

                    {categorias.length === 0 ? (
                      <p className="text-xs text-stone-400 py-4 text-center">No hay categorías disponibles</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-6 max-h-[420px] overflow-y-auto pr-2">
                        {categorias.map(cat => {
                          const tieneSubcats = cat.subcategorias && cat.subcategorias.length > 0;

                          return (
                            <div key={cat.id} className="space-y-1.5">
                              {/* Categoría Principal */}
                              <Link
                                to={`/catalogo?categoria=${cat.id}`}
                                onClick={() => setDropdownCategoriasAbierto(false)}
                                className="group/item flex items-center justify-between p-1.5 rounded-sm hover:bg-[#F2ECE1] transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  {cat.imagen ? (
                                    <img
                                      src={getImageUrl(cat.imagen)}
                                      alt={cat.nombre}
                                      className="w-7 h-9 object-cover rounded-xs border border-[#E7E1D7]"
                                    />
                                  ) : (
                                    <div className="w-7 h-9 rounded-xs bg-[#EAE2D5] flex items-center justify-center text-stone-600">
                                      <Layers className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                  <span className="font-serif text-sm text-stone-900 group-hover/item:text-[#9B7B54] transition-colors">
                                    {cat.nombre}
                                  </span>
                                </div>
                                <ChevronRight className="w-3 h-3 text-stone-400 group-hover/item:text-stone-900 group-hover/item:translate-x-0.5 transition-all" />
                              </Link>

                              {/* Subcategorías Anidadas */}
                              {tieneSubcats && (
                                <ul className="pl-6 space-y-1 border-l border-[#E7E1D7] ml-3.5">
                                  {cat.subcategorias!.filter(s => s.activa !== false).map(sub => (
                                    <li key={sub.id}>
                                      <Link
                                        to={`/catalogo?categoria=${sub.id}`}
                                        onClick={() => setDropdownCategoriasAbierto(false)}
                                        className="text-[11px] text-stone-500 hover:text-stone-900 py-0.5 px-2 block transition-colors tracking-wide"
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

              {/* PROBADOR VIRTUAL IA */}
              <Link 
                to="/probador" 
                className="hover:text-stone-900 transition-colors flex items-center gap-1.5 py-1 text-[#9B7B54] font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Probador Virtual IA</span>
              </Link>
            </nav>
          </div>

          {/* ACCIONES DERECHA (USUARIO / BOLSA) */}
          <div className="flex items-center gap-4">
            {/* FAVORITOS */}
            {isAuthenticated && (
              <Link 
                to="/favoritos" 
                className="text-stone-600 hover:text-stone-900 transition-colors relative p-1"
                title="Lista de Deseos"
              >
                <Heart className="w-4 h-4 text-stone-700" />
                {favoritosItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-[9px] font-medium px-1 rounded-full min-w-[14px] text-center leading-tight">
                    {favoritosItems.length}
                  </span>
                )}
              </Link>
            )}

            {/* BOLSA / CART DRAWER TRIGGER */}
            <button
              onClick={openDrawer}
              className="text-stone-700 hover:text-stone-900 transition-colors relative p-1.5 flex items-center gap-1 group"
              title="Abrir bolsa de compras"
              aria-label="Bolsa de compras"
            >
              <ShoppingBag className="w-4 h-4 text-stone-800 group-hover:scale-105 transition-transform" />
              <span className="hidden sm:inline text-xs uppercase tracking-widest font-medium text-stone-700">
                Bolsa
              </span>
              {totalCartItems > 0 && (
                <span className="bg-stone-900 text-white text-[10px] font-sans font-medium px-1.5 py-0.2 rounded-full min-w-[16px] text-center leading-tight ml-0.5">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* USUARIO / SESIÓN */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-[#E7E1D7]">
                <Link
                  to="/perfil"
                  className="flex items-center gap-2 text-xs text-stone-700 hover:text-stone-900 transition-colors py-1"
                >
                  <span className="w-6 h-6 rounded-full bg-[#EAE2D5] text-stone-800 flex items-center justify-center text-[10px] font-semibold border border-[#D5CCC0]">
                    {user.nombre?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <span className="font-medium hidden md:inline tracking-wide">{user.nombre}</span>
                </Link>

                <Link
                  to="/pedidos"
                  className="text-stone-600 hover:text-stone-900 transition-colors p-1"
                  title="Mis Pedidos"
                >
                  <Package className="w-4 h-4" />
                </Link>

                {user?.rol === 'ADMIN' && (
                  <Link 
                    to="/admin" 
                    className="text-xs uppercase tracking-widest text-[#9B7B54] font-semibold hover:text-stone-900 flex items-center gap-1"
                    title="Panel de Administración"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Admin</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="text-stone-400 hover:text-stone-800 transition-colors p-1"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs uppercase tracking-widest pl-2 border-l border-[#E7E1D7]">
                <Link
                  to="/login"
                  className="text-stone-700 hover:text-stone-900 transition-colors py-1 font-medium"
                >
                  Ingresar
                </Link>
                <Link
                  to="/registro"
                  className="bg-stone-900 text-white hover:bg-stone-800 px-3 py-1.5 transition-colors font-medium hidden sm:inline-block"
                >
                  Crear Cuenta
                </Link>
              </div>
            )}

            {/* BOTÓN MENÚ MÓVIL */}
            <button
              onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
              className="lg:hidden p-1.5 text-stone-700 hover:text-stone-900 hover:bg-[#F2ECE1] transition-colors"
              aria-label="Abrir Menú"
            >
              {menuMovilAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MENÚ MÓVIL DESPLEGABLE */}
        {menuMovilAbierto && (
          <div className="lg:hidden border-t border-[#E7E1D7] mt-3 pt-4 space-y-4 animate-in slide-in-from-top duration-150 bg-[#FAF8F5]">
            <nav className="flex flex-col space-y-1 text-xs uppercase tracking-wider font-medium">
              <Link to="/catalogo" className="p-2 hover:bg-[#F2ECE1] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Colección Completa
              </Link>
              <Link to="/probador" className="p-2 hover:bg-[#F2ECE1] flex items-center gap-2 text-[#9B7B54]">
                <Sparkles className="w-4 h-4" />
                Probador Virtual IA
              </Link>
              <button
                onClick={() => {
                  setMenuMovilAbierto(false);
                  openDrawer();
                }}
                className="p-2 hover:bg-[#F2ECE1] flex items-center justify-between w-full text-left uppercase tracking-wider"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Bolsa de Compras</span>
                </div>
                {totalCartItems > 0 && (
                  <span className="bg-stone-900 text-white text-[10px] font-sans font-medium px-2 py-0.5 rounded-full">
                    {totalCartItems}
                  </span>
                )}
              </button>

              {isAuthenticated && (
                <>
                  <Link to="/favoritos" className="p-2 hover:bg-[#F2ECE1] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      <span>Lista de Deseos</span>
                    </div>
                    {favoritosItems.length > 0 && (
                      <span className="bg-stone-900 text-white text-[10px] font-sans font-medium px-2 py-0.5 rounded-full">
                        {favoritosItems.length}
                      </span>
                    )}
                  </Link>
                  <Link to="/pedidos" className="p-2 hover:bg-[#F2ECE1] flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Mis Pedidos
                  </Link>
                  <Link to="/perfil" className="p-2 hover:bg-[#F2ECE1] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Mi Perfil
                  </Link>
                </>
              )}

              {user?.rol === 'ADMIN' && (
                <Link to="/admin" className="p-2 bg-[#F2ECE1] text-[#9B7B54] font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Panel de Administración
                </Link>
              )}
            </nav>

            {/* Árbol de Categorías en Móvil */}
            <div className="border-t border-[#E7E1D7] pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                Categorías de Colección
              </p>
              <div className="space-y-1">
                {categorias.map(cat => {
                  const tieneSubcats = cat.subcategorias && cat.subcategorias.length > 0;
                  const expandida = categoriaMovilExpandida === cat.id;

                  return (
                    <div key={cat.id} className="border-b border-[#E7E1D7]/50">
                      <div className="flex items-center justify-between p-2">
                        <Link
                          to={`/catalogo?categoria=${cat.id}`}
                          className="font-serif text-sm text-stone-800 hover:text-stone-900 flex-1"
                        >
                          {cat.nombre}
                        </Link>
                        {tieneSubcats && (
                          <button
                            onClick={() => setCategoriaMovilExpandida(expandida ? null : cat.id)}
                            className="p-1 text-stone-400 hover:text-stone-800"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandida ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {tieneSubcats && expandida && (
                        <div className="bg-[#F2ECE1]/60 px-4 py-2 space-y-1">
                          {cat.subcategorias!.filter(s => s.activa !== false).map(sub => (
                            <Link
                              key={sub.id}
                              to={`/catalogo?categoria=${sub.id}`}
                              className="block text-xs text-stone-600 hover:text-stone-900 py-1"
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

      {/* SLIDE-OVER CART DRAWER */}
      <CartDrawer />

      {/* FOOTER AURA */}
      <footer className="bg-[#161513] text-[#FAF8F5] pt-16 pb-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
            {/* Marca y Manifiesto */}
            <div className="space-y-4 md:col-span-1">
              <h3 className="font-serif text-2xl tracking-[0.25em] uppercase text-white font-normal">
                AURA
              </h3>
              <p className="font-serif italic text-stone-400 text-sm leading-relaxed">
                "Elegancia sutil, presencia absoluta."
              </p>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Atelier dedicado a siluetas atemporales confeccionadas con materias primas de la más alta distinción.
              </p>
            </div>

            {/* Enlaces de Colección */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-widest text-stone-400 font-medium">Colecciones</h4>
              <ul className="space-y-2 text-xs text-stone-300 font-light">
                <li><Link to="/catalogo?categoria=264efe79-ded7-4cfa-a0b0-110b822944c5" className="hover:text-white transition-colors">Vestidos de Seda</Link></li>
                <li><Link to="/catalogo?categoria=afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b" className="hover:text-white transition-colors">Sastrería & Abrigos</Link></li>
                <li><Link to="/catalogo?categoria=3a3ed9f0-94be-45a7-8699-c007a4ef9795" className="hover:text-white transition-colors">Camisería Fina</Link></li>
                <li><Link to="/catalogo?categoria=583d0937-40b2-4070-96b3-4685fdb92bc2" className="hover:text-white transition-colors">Pantalones Wide-Leg</Link></li>
              </ul>
            </div>

            {/* Experiencia & Atelier */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-widest text-stone-400 font-medium">Experiencia Atelier</h4>
              <ul className="space-y-2 text-xs text-stone-300 font-light">
                <li><Link to="/probador" className="hover:text-white transition-colors flex items-center gap-1.5 text-[#9B7B54] font-medium"><Sparkles className="w-3 h-3" /> Probador Virtual IA</Link></li>
                <li><span className="text-stone-400">Guía de Cuidados de Tejidos</span></li>
                <li><span className="text-stone-400">Sastrería a Medida</span></li>
                <li><span className="text-stone-400">Servicio de Concierge</span></li>
              </ul>
            </div>

            {/* Servicio al Cliente & Moneda */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-widest text-stone-400 font-medium">Atelier & Divisa</h4>
              <p className="text-xs text-stone-400 leading-relaxed font-light">
                Precios expresados en Dólares Estadounidenses ($ USD). Envíos y entregas aseguradas en empaque atelier.
              </p>
              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 text-[10px] tracking-widest uppercase border border-stone-700 text-stone-300">
                  USD ($) · Global Checkout
                </span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
            <p>© {new Date().getFullYear()} AURA Atelier. Todos los derechos reservados.</p>
            <div className="flex gap-6 tracking-wide">
              <span>Términos de Privacidad</span>
              <span>·</span>
              <span>Políticas de Atelier</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
