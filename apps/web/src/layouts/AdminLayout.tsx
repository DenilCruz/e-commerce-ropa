import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white p-6 space-y-4">
        <h2 className="text-lg font-bold">Admin Panel</h2>
        <nav className="flex flex-col space-y-2 text-sm">
          <Link to="/admin" className="p-2 hover:bg-gray-800 rounded">Dashboard</Link>
          <Link to="/admin/productos" className="p-2 hover:bg-gray-800 rounded">Productos</Link>
          <Link to="/admin/pedidos" className="p-2 hover:bg-gray-800 rounded">Pedidos</Link>
          <Link to="/admin/usuarios" className="p-2 hover:bg-gray-800 rounded">Usuarios</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};
