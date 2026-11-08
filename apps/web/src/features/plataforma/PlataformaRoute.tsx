import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { decidirAccesoPlataforma } from './lib/acceso';

/** Opens the console only to the platform operator (SUPERADMIN). */
export const PlataformaRoute: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const decision = decidirAccesoPlataforma({ isAuthenticated, rol: user?.rol });
  if (decision === 'login') return <Navigate to="/login" replace />;
  if (decision === 'inicio') return <Navigate to="/" replace />;
  return <Outlet />;
};
