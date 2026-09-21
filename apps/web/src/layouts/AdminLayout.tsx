import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shirt, 
  FolderTree, 
  Package, 
  ShoppingBag, 
  Users, 
  Image as ImageIcon, 
  Star, 
  ArrowLeft 
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/productos', label: 'Productos', icon: Shirt },
    { to: '/admin/categorias', label: 'Categorías', icon: FolderTree },
    { to: '/admin/inventario', label: 'Inventario', icon: Package },
    { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
    { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
    { to: '/admin/archivos', label: 'Archivos', icon: ImageIcon },
    { to: '/admin/resenas', label: 'Reseñas', icon: Star },
  ];

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 space-y-6 flex-1">
          <div className="border-b border-gray-800 pb-5">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2.5">
              <span className="bg-white text-black px-2 py-1 rounded text-xs font-black">EM</span>
              <span>Admin Panel</span>
            </h2>
            <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
              El Magnífico · Store Management
            </p>
          </div>

          <nav className="flex flex-col space-y-1.5 text-sm font-medium">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-black' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-gray-800">
          <Link
            to="/"
            className="text-xs uppercase tracking-wider font-semibold text-gray-400 hover:text-white transition-colors flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
