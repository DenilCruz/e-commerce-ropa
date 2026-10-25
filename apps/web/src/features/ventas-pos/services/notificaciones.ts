export type EstadoNotificaciones = 'NO_SOPORTADO' | 'SIN_CONFIGURAR' | 'BLOQUEADO' | 'DISPONIBLE' | 'ACTIVAS';

export interface DatosNotificaciones {
  soportado: boolean;
  habilitadoEnServidor: boolean;
  permiso: NotificationPermission;
  suscrito: boolean;
}

export function estadoNotificaciones(d: DatosNotificaciones): EstadoNotificaciones {
  if (!d.soportado) return 'NO_SOPORTADO';
  if (!d.habilitadoEnServidor) return 'SIN_CONFIGURAR';
  if (d.permiso === 'denied') return 'BLOQUEADO';
  return d.permiso === 'granted' && d.suscrito ? 'ACTIVAS' : 'DISPONIBLE';
}

/** The VAPID public key comes as URL-safe base64; pushManager.subscribe wants the raw bytes. */
export function claveVapidABytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export function navegadorSoportaPush(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
