import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api';
import {
  EstadoNotificaciones,
  claveVapidABytes,
  estadoNotificaciones,
  navegadorSoportaPush,
} from '../services/notificaciones';

export function useNotificaciones() {
  const [estado, setEstado] = useState<EstadoNotificaciones>('DISPONIBLE');
  const [trabajando, setTrabajando] = useState(false);

  const leer = useCallback(async () => {
    const soportado = navegadorSoportaPush();
    if (!soportado) return setEstado('NO_SOPORTADO');
    try {
      const { data } = await api.get('/push/clave');
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      setEstado(
        estadoNotificaciones({
          soportado,
          habilitadoEnServidor: Boolean(data?.habilitado),
          permiso: Notification.permission,
          suscrito: Boolean(suscripcion),
        }),
      );
    } catch {
      // Offline or no service worker yet: leave the button as it is
    }
  }, []);

  useEffect(() => {
    void leer();
  }, [leer]);

  const activar = useCallback(async () => {
    setTrabajando(true);
    try {
      const { data } = await api.get('/push/clave');
      if (!data?.habilitado) return await leer();
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') return await leer();
      const registro = await navigator.serviceWorker.ready;
      const suscripcion =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveVapidABytes(data.clave) }));
      await api.post('/push/suscripcion', suscripcion.toJSON());
      await leer();
    } finally {
      setTrabajando(false);
    }
  }, [leer]);

  const desactivar = useCallback(async () => {
    setTrabajando(true);
    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      if (suscripcion) {
        await api.post('/push/baja', { endpoint: suscripcion.endpoint });
        await suscripcion.unsubscribe();
      }
      await leer();
    } finally {
      setTrabajando(false);
    }
  }, [leer]);

  const probar = useCallback(async () => {
    const { data } = await api.post('/push/prueba');
    return Number(data?.entregadas ?? 0);
  }, []);

  return { estado, trabajando, activar, desactivar, probar };
}
