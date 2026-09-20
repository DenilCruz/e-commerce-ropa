import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 space-y-4 flex-1">
          <div className="mb-8">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span className="bg-white text-black px-2 py-1 rounded text-xs font-bold">EM</span>
              <span>Admin Panel</span>
            </h2>
          </div>
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <Link to="/admin" className="p-2 hover:bg-gray-800 rounded transition-colors">Dashboard</Link>
            <Link to="/admin/productos" className="p-2 hover:bg-gray-800 rounded transition-colors">Productos</Link>
            <Link to="/admin/inventario" className="p-2 hover:bg-gray-800 rounded transition-colors">Inventario</Link>
            <Link to="/admin/pedidos" className="p-2 hover:bg-gray-800 rounded transition-colors">Pedidos</Link>
            <Link to="/admin/usuarios" className="p-2 hover:bg-gray-800 rounded transition-colors">Usuarios</Link>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-800">
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            <span>←</span> Volver a la Tienda
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};
