import { useEffect, useRef } from 'react';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useAuthStore } from '../store/auth.store';
import { useNetworkStore } from '../store/network.store';
import { leerSesion } from '../services/pos/sesion';
import { recibePush, registrarPush, rutaDeNotificacion } from '../services/push/registroPush';
import { RootStackParamList } from '../navigation/types';

/**
 * After login, with a store session, registers this device for push. Runs again when the connection returns
 * or the store changes, so a failure (no network) is retried without any user action.
 */
export function usePushRegistro() {
  const token = useAuthStore((s) => s.token);
  const rol = useAuthStore((s) => s.user?.rol);
  const online = useNetworkStore((s) => s.isConnected);
  const tenantId = leerSesion(token)?.tenantId;

  useEffect(() => {
    if (!tenantId || !online || !recibePush(rol)) return;
    let vivo = true;
    (async () => {
      try {
        // Loaded here so a missing native module (Expo Go, tests) never breaks the app start
        const { dependenciasPush } = await import('../services/push/pushExpo');
        if (vivo) await registrarPush(dependenciasPush, tenantId);
      } catch {
        /* push is optional: degrade silently */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [tenantId, online, rol]);
}

/** Opens the point of sale when the user taps a notification (data.url "/admin/ventas"). */
export function useAperturaPorNotificacion(navRef: NavigationContainerRefWithCurrent<RootStackParamList>, listo: boolean) {
  const pendiente = useRef<'PuntoDeVenta' | null>(null);

  useEffect(() => {
    if (listo && pendiente.current) {
      navRef.navigate(pendiente.current);
      pendiente.current = null;
    }
  }, [listo, navRef]);

  useEffect(() => {
    let quitar: (() => void) | undefined;
    let vivo = true;
    const abrir = (data: unknown) => {
      const ruta = rutaDeNotificacion(data);
      if (!ruta) return;
      if (navRef.isReady()) navRef.navigate(ruta);
      else pendiente.current = ruta; // cold start: navigate as soon as the container is ready
    };
    (async () => {
      try {
        const { Notifications } = await import('../services/push/pushExpo');
        if (!vivo) return;
        const sub = Notifications.addNotificationResponseReceivedListener((r) => abrir(r.notification.request.content.data));
        quitar = () => sub.remove();
        const inicial = await Notifications.getLastNotificationResponseAsync();
        if (inicial) abrir(inicial.notification.request.content.data);
      } catch {
        /* no notifications module here */
      }
    })();
    return () => {
      vivo = false;
      quitar?.();
    };
  }, [navRef]);
}
