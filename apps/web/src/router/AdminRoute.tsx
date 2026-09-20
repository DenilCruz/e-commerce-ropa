import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export const AdminRoute: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || user?.rol !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};
