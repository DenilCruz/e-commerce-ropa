import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../features/autenticacion/services/auth.api';
import { AdminPlanBadge } from '../features/tiendas/components/AdminPlanBadge';
import { StoreSwitcher } from '../features/tiendas/components/StoreSwitcher';
import { usePlanLimites } from '../features/tiendas/hooks/usePlanLimites';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { logout, refreshToken } = useAuthStore();
  const { metricas } = usePlanLimites();
  const storeSlug = metricas?.tienda?.slug || 'aura';

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
      {/* SIDEBAR */}
      <aside className="w-64 h-screen bg-[#161513] text-stone-100 flex flex-col shrink-0 border-r border-[#2A2723] shadow-xl z-20">
        {/* Logo / Header (Fijo arriba) */}
        <div className="p-5 pb-4 shrink-0 border-b border-[#2A2723]/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="bg-[#9B7B54] text-white px-2.5 py-1 rounded font-serif font-bold text-xs tracking-wider shrink-0">
              {(metricas?.tienda?.nombre || 'A').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-[0.2em] text-white uppercase font-serif truncate">
                {metricas?.tienda?.nombre || 'AURA'}
              </h2>
              <span className="text-[10px] text-stone-400 font-mono tracking-widest uppercase block truncate">
                Atelier Admin
              </span>
            </div>
          </div>
        </div>

        {/* Selector rápido de Tienda en Admin */}
        <div className="px-4 py-2.5 border-b border-[#2A2723]/60 bg-[#1C1A18] flex items-center justify-between text-stone-200">
          <span className="text-[10px] uppercase tracking-widest text-stone-400 font-mono">Tienda activa:</span>
          <div className="bg-white/95 text-stone-900 px-2.5 py-1 rounded shadow-xs">
            <StoreSwitcher />
          </div>
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

      {/* MAIN CONTENT con scroll independiente */}
      <main className="flex-1 h-screen min-h-0 overflow-y-auto p-6 lg:p-8 bg-[#FAF8F5]">
        <Outlet />
      </main>
    </div>
  );
};
