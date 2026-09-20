import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';

import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

import { LoginPage } from '../features/autenticacion/pages/LoginPage';
import { RegisterPage } from '../features/autenticacion/pages/RegisterPage';
import { ForgotPasswordPage } from '../features/autenticacion/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/autenticacion/pages/ResetPasswordPage';
import { VerifyEmailPage } from '../features/autenticacion/pages/VerifyEmailPage';

import { CatalogPage } from '../features/catalogo/pages/CatalogPage';
import { ProductDetailPage } from '../features/detalleproducto/pages/ProductDetailPage';
import { CartPage } from '../features/carrito/pages/CartPage';
import { CheckoutPage } from '../features/pago/pages/CheckoutPage';
import { OrdersPage } from '../features/pedidos/pages/OrdersPage';
import { ProfilePage } from '../features/perfil/pages/ProfilePage';
import { FavoritosPage } from '../features/favoritos/pages/FavoritosPage';

import { AdminDashboardPage } from '../features/admin/dashboard/AdminDashboardPage';
import { AdminProductsPage } from '../features/admin/productos/AdminProductsPage';
import { AdminInventoryPage } from '../features/admin/inventario/pages/AdminInventoryPage';
import { AdminOrdersPage } from '../features/admin/pedidos/AdminOrdersPage';
import { AdminUsersPage } from '../features/admin/usuarios/AdminUsersPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Tienda Pública */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/catalogo" replace />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/producto/:id" element={<ProductDetailPage />} />
        <Route path="/carrito" element={<CartPage />} />

        {/* Rutas Protegidas Cliente */}
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/favoritos" element={<FavoritosPage />} />
        </Route>
      </Route>

      {/* Flujos de Autenticación */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar-password" element={<ForgotPasswordPage />} />
        <Route path="/restablecer-password" element={<ResetPasswordPage />} />
        <Route path="/verificar-email" element={<VerifyEmailPage />} />
      </Route>

      {/* Panel Administrador */}
      <Route path="/admin" element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="productos" element={<AdminProductsPage />} />
          <Route path="inventario" element={<AdminInventoryPage />} />
          <Route path="pedidos" element={<AdminOrdersPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
        </Route>
      </Route>
    </Routes>
  );
};
