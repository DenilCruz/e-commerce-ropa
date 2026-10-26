import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
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
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../features/autenticacion/services/auth.api';
import { AdminPlanBadge } from '../features/tiendas/components/AdminPlanBadge';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { logout, refreshToken } = useAuthStore();

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
    <div className="min-h-screen flex bg-[#FAF8F5] text-stone-900 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#161513] text-stone-100 flex flex-col shrink-0 border-r border-[#2A2723] shadow-xl z-20">
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="bg-[#9B7B54] text-white px-2.5 py-1 rounded font-serif font-bold text-xs tracking-wider">
              A
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-[0.2em] text-white uppercase font-serif">AURA</h2>
              <span className="text-[10px] text-stone-400 font-mono tracking-widest uppercase">Atelier Admin</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
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
        </div>

        {/* Widget de Consumo y Plan SaaS */}
        <AdminPlanBadge />

        {/* Footer Back Link */}
        <div className="p-4 border-t border-stone-800 space-y-2">
          <Link
            to="/t/aura"
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
              className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 font-medium"
              title="Cerrar sesión de administrador"
            >
              <LogOut className="w-3 h-3" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-[#FAF8F5]">
        <Outlet />
      </main>
    </div>
  );
};
