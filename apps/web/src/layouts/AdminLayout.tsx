import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Package,
  Boxes,
  ShoppingBag,
  Ticket,
  Users,
  ArrowLeft,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/reportes', label: 'Reportes de Ventas', icon: BarChart3 },
    { to: '/admin/reportes-dinamicos', label: 'Reportes por Voz (IA)', icon: Sparkles },
    { to: '/admin/productos', label: 'Productos', icon: Package },
    { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
    { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
    { to: '/admin/cupones', label: 'Cupones', icon: Ticket },
    { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-950 text-white flex flex-col shrink-0 border-r border-gray-800">
        <div className="p-6 space-y-6 flex-1">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="bg-white text-black px-2.5 py-1 rounded font-black text-xs tracking-wider">
              EM
            </span>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white uppercase">El Magnífico</h2>
              <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Admin Panel</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col space-y-1.5 text-xs font-semibold">
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
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-gray-900'
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

        {/* Footer Back Link */}
        <div className="p-6 border-t border-gray-900">
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
