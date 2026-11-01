import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { tiendasApi } from '../features/tiendas/services/tiendas.api';
import { usePlanLimites } from '../features/tiendas/hooks/usePlanLimites';
import { esDueno, esPersonal } from '../lib/roles';

export const AdminRoute: React.FC = () => {
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const personal = esPersonal(user?.rol);
  const [verificando, setVerificando] = useState(isAuthenticated && !personal);

  useEffect(() => {
    if (!isAuthenticated || esPersonal(user?.rol)) {
      setVerificando(false);
      return;
    }

    let montado = true;
    const recuperarSesionAdmin = async () => {
      try {
        const misTiendas = await tiendasApi.listarMias();
        const tiendasAdmin = misTiendas.filter((t) => esPersonal(t.rol));
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

  if (!esPersonal(user?.rol)) {
    const slug = localStorage.getItem('tenant_slug');
    return <Navigate to={slug ? `/t/${slug}` : '/'} replace />;
  }

  return <Outlet />;
};

/** Owner and platform operator. A seller goes to their counter. */
export const RequiereDueno: React.FC = () => {
  const { user } = useAuthStore();
  if (!esDueno(user?.rol)) return <Navigate to="/admin/puesto" replace />;
  return <Outlet />;
};

type Capacidad = 'posOffline' | 'reportesVozNlp' | 'modelosPredictivosMl';

/** Hides a screen the current plan does not include. */
export const RequiereCapacidad: React.FC<{ capacidad: Capacidad }> = ({ capacidad }) => {
  const { metricas, cargando } = usePlanLimites();
  if (cargando && !metricas) return null;
  if (metricas && !metricas.capacidades[capacidad]) return <Navigate to="/admin/puesto" replace />;
  return <Outlet />;
};
