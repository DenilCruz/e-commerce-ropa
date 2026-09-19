import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { UserRole } from '@ecommerce/shared';

export const AdminRoute: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || user?.role !== UserRole.ADMIN) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};
