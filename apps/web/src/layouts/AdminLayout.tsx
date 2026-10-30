import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Sparkles,
  Shirt,
  FolderTree,
  Boxes,
  ShoppingBag,
  Truck,
  Ticket,
  Users,
  Image as ImageIcon,
  Store,
  Star,
  ArrowLeft,
  LogOut,
  QrCode,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../features/autenticacion/services/auth.api';
import { AdminPlanBadge } from '../features/tiendas/components/AdminPlanBadge';
import { StoreSwitcher } from '../features/tiendas/components/StoreSwitcher';
import { usePlanLimites } from '../features/tiendas/hooks/usePlanLimites';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { logout, refreshToken } = useAuthStore();
  const { metricas } = usePlanLimites();
  const storeSlug = metricas?.tienda?.slug || 'aura';

  // En pantallas chicas el menú es un panel deslizable: se cierra al navegar o con Escape
  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuAbierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAbierto(false);
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [menuAbierto]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.error('Error logging out from admin:', err);
    } finally {
      logout();
      navigate('/');
    }
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard Descriptivo', icon: LayoutDashboard, end: true },
    { to: '/admin/dashboard-predictivo', label: 'Dashboard Predictivo (IA)', icon: TrendingUp },
    { to: '/admin/reportes', label: 'Reportes de Ventas', icon: BarChart3 },
    { to: '/admin/reportes-dinamicos', label: 'Reportes por Voz (IA)', icon: Sparkles },
    { to: '/admin/productos', label: 'Productos', icon: Shirt },
    { to: '/admin/categorias', label: 'Categorías', icon: FolderTree },
    { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
    { to: '/admin/ventas', label: 'Punto de Venta', icon: Store },
    { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
    { to: '/admin/envios', label: 'Envíos y Despachos', icon: Truck },
    { to: '/admin/cupones', label: 'Cupones', icon: Ticket },
    { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
    { to: '/admin/pagos-config', label: 'Pasarela & QR Propio', icon: QrCode },
    { to: '/admin/archivos', label: 'Archivos', icon: ImageIcon },
    { to: '/admin/resenas', label: 'Reseñas', icon: Star },
  ];

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#FAF8F5] text-stone-900 font-sans">
      {/* Fondo oscuro detrás del menú deslizable (solo pantallas chicas) */}
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
        />
      )}

      {/* SIDEBAR: fijo en escritorio, panel deslizable en celular */}
      <aside
        id="menu-admin"
        className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] h-screen bg-[#161513] text-stone-100 flex flex-col shrink-0 border-r border-[#2A2723] shadow-xl transition-transform duration-200 motion-reduce:transition-none lg:static lg:z-20 lg:max-w-none lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Selector de Tienda Activa (Fijo arriba) */}
        <div className="p-3.5 pb-3 shrink-0 border-b border-[#2A2723]/60 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono tracking-[0.16em] uppercase text-stone-400 font-medium">
              Tienda en Gestión
            </span>
            <span className="text-[10px] font-serif tracking-wider uppercase text-[#9B7B54]">
              Atelier Admin
            </span>
          </div>
          <StoreSwitcher variant="sidebar" />
        </div>

        {/* Contenedor central con scroll independiente */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-4 sidebar-dark-scrollbar">
          {/* Items de Navegación */}
          <nav className="flex flex-col space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white text-stone-900 font-bold shadow-sm'
                        : 'text-stone-400 hover:text-white hover:bg-stone-900/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Widget de Consumo y Plan SaaS dentro del scroll */}
          <div className="pt-2">
            <AdminPlanBadge />
          </div>
        </div>

        {/* Footer fijo al pie del sidebar */}
        <div className="p-3.5 border-t border-stone-800 bg-[#161513] shrink-0 space-y-2">
          <Link
            to={`/t/${storeSlug}`}
            className="text-xs text-stone-300 hover:text-white transition-colors flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-[#9B7B54]" />
            <span>Ver Tienda Pública</span>
          </Link>
          <div className="flex items-center justify-between pt-1">
            <Link
              to="/"
              className="text-[11px] text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1.5 font-sans"
            >
              <span>Plataforma SaaS</span>
            </Link>
            <button
              onClick={handleLogout}
              type="button"
              className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 font-medium cursor-pointer"
              title="Cerrar sesión de administrador"
            >
              <LogOut className="w-3 h-3" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 h-screen flex flex-col">
        {/* Barra superior con el botón del menú (solo pantallas chicas) */}
        <header className="lg:hidden shrink-0 h-14 px-4 flex items-center gap-3 bg-[#161513] text-stone-100 border-b border-[#2A2723]">
          <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            aria-controls="menu-admin"
            className="p-2 -ml-2 rounded-lg hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9B7B54]"
          >
            {menuAbierto ? <X className="w-5 h-5" aria-hidden /> : <Menu className="w-5 h-5" aria-hidden />}
          </button>
          <span className="font-serif tracking-[0.2em] uppercase text-sm">AURA</span>
          <span className="ml-auto text-xs text-stone-400 truncate max-w-[50%]">{metricas?.tienda?.nombre}</span>
        </header>

        {/* MAIN CONTENT con scroll independiente */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#FAF8F5]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
