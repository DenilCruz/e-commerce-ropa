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

import { HomePage } from '../features/home/pages/HomePage';
import { CatalogPage } from '../features/catalogo/pages/CatalogPage';
import { ProductDetailPage } from '../features/detalleproducto/pages/ProductDetailPage';
import { VirtualTryOnPage } from '../features/probador/pages/VirtualTryOnPage';
import { CartPage } from '../features/carrito/pages/CartPage';
import { CheckoutPage } from '../features/pago/pages/CheckoutPage';
import { CheckoutReturnPage } from '../features/pago/pages/CheckoutReturnPage';
import { OrdersPage } from '../features/pedidos/pages/OrdersPage';
import { ProfilePage } from '../features/perfil/pages/ProfilePage';
import { FavoritosPage } from '../features/favoritos/pages/FavoritosPage';

import { AdminDashboardPage } from '../features/admin/dashboard/AdminDashboardPage';
import { AdminReportsPage } from '../features/admin/reportes/AdminReportsPage';
import { AdminDynamicReportsPage } from '../features/admin/reportes/AdminDynamicReportsPage';
import { AdminProductsPage } from '../features/admin/productos/AdminProductsPage';
import { AdminInventoryPage } from '../features/admin/inventario/pages/AdminInventoryPage';
import { AdminCouponsPage } from '../features/admin/cupones/pages/AdminCouponsPage';
import { AdminOrdersPage } from '../features/admin/pedidos/AdminOrdersPage';
import { AdminUsersPage } from '../features/admin/usuarios/AdminUsersPage';
import { AdminCategoriesPage } from '../features/admin/categorias/AdminCategoriesPage';
import { AdminFilesPage } from '../features/admin/archivos/pages/AdminFilesPage';
import { AdminReviewsPage } from '../features/admin/resenas/pages/AdminReviewsPage';
import { AdminShippingPage } from '../features/admin/envios/pages/AdminShippingPage';
import { TrackingPage } from '../features/envios/pages/TrackingPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Tienda Pública */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/catalogo/:id" element={<ProductDetailPage />} />
        <Route path="/producto/:id" element={<ProductDetailPage />} />
        <Route path="/probador" element={<VirtualTryOnPage />} />
        <Route path="/carrito" element={<CartPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/tracking/:codigo" element={<TrackingPage />} />

        {/* Rutas Protegidas Cliente */}
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/return" element={<CheckoutReturnPage />} />
          <Route path="/pago" element={<Navigate to="/checkout" replace />} />
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
          <Route path="reportes" element={<AdminReportsPage />} />
          <Route path="reportes-dinamicos" element={<AdminDynamicReportsPage />} />
          <Route path="productos" element={<AdminProductsPage />} />
          <Route path="categorias" element={<AdminCategoriesPage />} />
          <Route path="inventario" element={<AdminInventoryPage />} />
          <Route path="cupones" element={<AdminCouponsPage />} />
          <Route path="pedidos" element={<AdminOrdersPage />} />
          <Route path="envios" element={<AdminShippingPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="archivos" element={<AdminFilesPage />} />
          <Route path="resenas" element={<AdminReviewsPage />} />
        </Route>
      </Route>
    </Routes>
  );
};
