import { useState, useEffect, useCallback } from 'react';
import { planesApi, MetricasYLimitesResponse, PlanConfig } from '../services/planes.api';
import { useAuthStore } from '../../../store/auth.store';
import { toast } from 'sonner';

export function usePlanLimites() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [metricas, setMetricas] = useState<MetricasYLimitesResponse | null>(null);
  const [catalogo, setCatalogo] = useState<PlanConfig[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [actualizando, setActualizando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const cat = await planesApi.obtenerCatalogo();
      setCatalogo(cat);

      if (isAuthenticated && accessToken) {
        const datos = await planesApi.obtenerConsumoYLimites();
        setMetricas(datos);
      }
    } catch (err: any) {
      console.error('Error cargando límites de plan:', err);
      setError(err?.response?.data?.message || 'No se pudieron cargar los límites del plan.');
    } finally {
      setCargando(false);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const cambiarPlan = async (nuevoPlan: 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO') => {
    try {
      setActualizando(true);
      const res = await planesApi.cambiarPlan(nuevoPlan);
      setMetricas(res);
      toast.success(`¡Plan actualizado con éxito al ${res.plan.nombre}!`);
      return res;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al actualizar el plan.';
      toast.error(msg);
      throw err;
    } finally {
      setActualizando(false);
    }
  };

  return {
    metricas,
    catalogo,
    cargando,
    actualizando,
    error,
    recargar: cargarDatos,
    cambiarPlan,
  };
}
