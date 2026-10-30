import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { tiendasApi } from '../features/tiendas/services/tiendas.api';
import { RefreshCw } from 'lucide-react';

export const AdminRoute: React.FC = () => {
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const [verificando, setVerificando] = useState(isAuthenticated && user?.rol !== 'ADMIN');

  useEffect(() => {
    if (!isAuthenticated || user?.rol === 'ADMIN') {
      setVerificando(false);
      return;
    }

    let montado = true;
    const recuperarSesionAdmin = async () => {
      try {
        const misTiendas = await tiendasApi.listarMias();
        const tiendasAdmin = misTiendas.filter((t) => t.rol !== 'CLIENTE');
        if (tiendasAdmin.length > 0) {
          const slugPreferido = localStorage.getItem('tenant_slug')?.toLowerCase();
          const tiendaElegida =
            tiendasAdmin.find((t) => t.slug.toLowerCase() === slugPreferido) ||
            tiendasAdmin.find((t) => t.esActiva) ||
            tiendasAdmin[0];

          const sesion = await tiendasApi.seleccionar(tiendaElegida.id);
          if (montado) {
            localStorage.removeItem('el-magnifico-cart-storage');
            localStorage.setItem('tenant_slug', sesion.tienda?.slug || tiendaElegida.slug);
            setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
          }
        }
      } catch (err) {
        console.warn('Error al recuperar sesión de tienda en AdminRoute:', err);
      } finally {
        if (montado) setVerificando(false);
      }
    };

    recuperarSesionAdmin();
    return () => {
      montado = false;
    };
  }, [isAuthenticated, user?.rol, setAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (verificando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF8F5] space-y-3">
        <RefreshCw className="w-8 h-8 text-[#9B7B54] animate-spin" />
        <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
          Activando tu espacio administrativo...
        </p>
      </div>
    );
  }

  if (user?.rol !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
