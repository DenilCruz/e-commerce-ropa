import React from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';

import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute, RequiereCapacidad, RequiereDueno } from './AdminRoute';
import { esDueno } from '../lib/roles';
import { useAuthStore } from '../store/auth.store';

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
import { ActividadPage } from '../features/pedidos/pages/ActividadPage';
import { ProfilePage } from '../features/perfil/pages/ProfilePage';
import { FavoritosPage } from '../features/favoritos/pages/FavoritosPage';

import { AdminDashboardPage } from '../features/admin/dashboard/AdminDashboardPage';
import { AdminPredictiveDashboardPage } from '../features/admin/dashboard/AdminPredictiveDashboardPage';
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
import { AdminPuestoPage } from '../features/admin/puesto/AdminPuestoPage';
import { AdminSucursalesPage } from '../features/admin/sucursales/AdminSucursalesPage';
import { AdminShippingPage } from '../features/admin/envios/pages/AdminShippingPage';
import { AdminPosPage } from '../features/ventas-pos/pages/AdminPosPage';
import { TrackingPage } from '../features/envios/pages/TrackingPage';
import { StoreInfoPage } from '../features/info/pages/StoreInfoPage';
import { LandingSaaSPage } from '../features/landing/LandingSaaSPage';
import { PlanRetornoPage } from '../features/tiendas/pages/PlanRetornoPage';
import { AdminPagosConfigPage } from '../features/tiendas/pages/AdminPagosConfigPage';

import { TenantStoreResolver } from '../features/tiendas/components/TenantStoreResolver';

const EntradaAdmin: React.FC = () => {
  const { user } = useAuthStore();
  if (!esDueno(user?.rol)) return <Navigate to="/admin/puesto" replace />;
  return <AdminDashboardPage />;
};

/** Redirecciona rutas genéricas directas a la tienda activa (/catalogo -> /t/:slug/catalogo) */
const DirectStoreRedirect: React.FC<{ target?: string }> = ({ target = '' }) => {
  const location = useLocation();
  const slug = (typeof window !== 'undefined' ? localStorage.getItem('tenant_slug') : null) || 'aura';
  const destination = target ? `/t/${slug}/${target}${location.search}` : `/t/${slug}${location.search}`;
  return <Navigate to={destination} replace />;
};

/** Redirecciona rutas con ID directo a la tienda activa (/producto/:id -> /t/:slug/producto/:id) */
const DirectParamRedirect: React.FC<{ targetPrefix: string }> = ({ targetPrefix }) => {
  const { id, codigo } = useParams<{ id?: string; codigo?: string }>();
  const location = useLocation();
  const slug = (typeof window !== 'undefined' ? localStorage.getItem('tenant_slug') : null) || 'aura';
  const param = id || codigo || '';
  const destination = `/t/${slug}/${targetPrefix}/${param}${location.search}`;
  return <Navigate to={destination} replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 1. SaaS Landing & Planes (Página Raíz de la Plataforma) */}
      <Route path="/" element={<LandingSaaSPage />} />
      <Route path="/planes" element={<LandingSaaSPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/planes/retorno" element={<PlanRetornoPage />} />
      </Route>
      <Route path="/saas" element={<LandingSaaSPage />} />

      {/* 2. Tienda de Inquilino Específica (/t/:slug) - Enlace público para compartir con clientes */}
      <Route path="/t/:slug" element={<TenantStoreResolver />}>
        {/* Rutas de autenticación contextuales en la tienda (Modo Comprador) */}
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="catalogo" element={<CatalogPage />} />
          <Route path="catalogo/:id" element={<ProductDetailPage />} />
          <Route path="producto/:id" element={<ProductDetailPage />} />
          <Route path="probador" element={<VirtualTryOnPage />} />
          <Route path="carrito" element={<CartPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="tracking/:codigo" element={<TrackingPage />} />
          <Route path="info/:tema" element={<StoreInfoPage />} />

          {/* Rutas Protegidas Cliente en tienda */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="checkout/return" element={<CheckoutReturnPage />} />
            <Route path="pago" element={<Navigate to="checkout" replace />} />
            <Route path="pedidos" element={<OrdersPage />} />
            <Route path="actividad" element={<ActividadPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="favoritos" element={<FavoritosPage />} />
          </Route>
        </Route>
      </Route>

      {/* 3. Redirecciones Directas a la Tienda Activa (/catalogo -> /t/:slug/catalogo) */}
      <Route path="/tienda" element={<DirectStoreRedirect target="" />} />
      <Route path="/catalogo" element={<DirectStoreRedirect target="catalogo" />} />
      <Route path="/catalogo/:id" element={<DirectParamRedirect targetPrefix="catalogo" />} />
      <Route path="/producto/:id" element={<DirectParamRedirect targetPrefix="producto" />} />
      <Route path="/probador" element={<DirectStoreRedirect target="probador" />} />
      <Route path="/carrito" element={<DirectStoreRedirect target="carrito" />} />
      <Route path="/tracking" element={<DirectStoreRedirect target="tracking" />} />
      <Route path="/tracking/:codigo" element={<DirectParamRedirect targetPrefix="tracking" />} />
      <Route path="/checkout" element={<DirectStoreRedirect target="checkout" />} />
      <Route path="/checkout/return" element={<DirectStoreRedirect target="checkout/return" />} />
      <Route path="/pago" element={<DirectStoreRedirect target="checkout" />} />
      <Route path="/pedidos" element={<DirectStoreRedirect target="pedidos" />} />
      <Route path="/actividad" element={<DirectStoreRedirect target="actividad" />} />
      <Route path="/perfil" element={<DirectStoreRedirect target="perfil" />} />
      <Route path="/favoritos" element={<DirectStoreRedirect target="favoritos" />} />

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
          <Route index element={<EntradaAdmin />} />
          <Route path="puesto" element={<AdminPuestoPage />} />
          <Route path="inventario" element={<AdminInventoryPage />} />
          <Route path="pedidos" element={<AdminOrdersPage />} />
          <Route element={<RequiereCapacidad capacidad="posOffline" />}>
            <Route path="ventas" element={<AdminPosPage />} />
          </Route>
          <Route element={<RequiereDueno />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="reportes" element={<AdminReportsPage />} />
            <Route path="productos" element={<AdminProductsPage />} />
            <Route path="categorias" element={<AdminCategoriesPage />} />
            <Route path="cupones" element={<AdminCouponsPage />} />
            <Route path="envios" element={<AdminShippingPage />} />
            <Route path="usuarios" element={<AdminUsersPage />} />
            <Route path="sucursales" element={<AdminSucursalesPage />} />
            <Route path="pagos-config" element={<AdminPagosConfigPage />} />
            <Route path="archivos" element={<AdminFilesPage />} />
            <Route path="resenas" element={<AdminReviewsPage />} />
            <Route element={<RequiereCapacidad capacidad="reportesVozNlp" />}>
              <Route path="reportes-dinamicos" element={<AdminDynamicReportsPage />} />
            </Route>
            <Route element={<RequiereCapacidad capacidad="modelosPredictivosMl" />}>
              <Route path="dashboard-predictivo" element={<AdminPredictiveDashboardPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
};
