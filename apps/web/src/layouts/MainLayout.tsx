import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">E-Commerce Ropa</Link>
        <nav className="flex gap-4 text-sm font-medium">
          <Link to="/catalogo" className="hover:text-blue-600">Catálogo</Link>
          <Link to="/carrito" className="hover:text-blue-600">Carrito</Link>
          <Link to="/pedidos" className="hover:text-blue-600">Mis Pedidos</Link>
          <Link to="/perfil" className="hover:text-blue-600">Mi Cuenta</Link>
        </nav>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <Outlet />
      </main>
      <footer className="bg-gray-900 text-gray-400 text-center py-6 text-sm">
        © {new Date().getFullYear()} E-Commerce Ropa. Todos los derechos reservados.
      </footer>
    </div>
  );
};
