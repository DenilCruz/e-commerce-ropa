/**
 * Push registration logic, free of any Expo import so it can be tested with fakes.
 * The Expo-specific parts live behind `AdaptadorPush` (see pushExpo.ts).
 */

export type EstadoPermiso = 'granted' | 'denied' | 'undetermined';

export interface AdaptadorPush {
  /** Push tokens only exist on a physical device (not in an emulator or Expo Go on the web). */
  esDispositivoFisico(): boolean;
  /** EAS project id from the app config, or undefined when the build has none. */
  projectId(): string | undefined;
  obtenerPermiso(): Promise<EstadoPermiso>;
  pedirPermiso(): Promise<EstadoPermiso>;
  /** Android needs a channel before it can show a notification. */
  prepararCanal(): Promise<void>;
  obtenerToken(projectId: string): Promise<string>;
}

/** Remembers which token was registered for which store, so an unchanged token is not posted again. */
export interface AlmacenToken {
  leer(): Promise<string | null>;
  guardar(valor: string): Promise<void>;
  borrar(): Promise<void>;
}

/** The two endpoints of the API (C5). They throw on network or HTTP failure. */
export interface ServidorPush {
  registrar(token: string): Promise<void>;
  baja(token: string): Promise<void>;
}

export interface DependenciasPush {
  adaptador: AdaptadorPush;
  almacen: AlmacenToken;
  servidor: ServidorPush;
}

export type ResultadoRegistro =
  | 'REGISTRADO'
  | 'SIN_CAMBIOS'
  | 'SIN_DISPOSITIVO'
  | 'SIN_PROJECT_ID'
  | 'PERMISO_DENEGADO'
  | 'ERROR_TOKEN'
  | 'ERROR_RED';

const SEPARADOR = '|';
const comoGuardado = (tenantId: string, token: string) => `${tenantId}${SEPARADOR}${token}`;
const separar = (valor: string | null): { tenantId: string; token: string } | null => {
  if (!valor) return null;
  const i = valor.indexOf(SEPARADOR);
  return i < 0 ? null : { tenantId: valor.slice(0, i), token: valor.slice(i + 1) };
};

/**
 * Asks for permission, gets the device token and registers it for the active store.
 * Every failure degrades silently: it returns what happened and the next launch tries again.
 */
export async function registrarPush(deps: DependenciasPush, tenantId: string): Promise<ResultadoRegistro> {
  const { adaptador, almacen, servidor } = deps;
  if (!adaptador.esDispositivoFisico()) return 'SIN_DISPOSITIVO';
  const projectId = adaptador.projectId();
  if (!projectId) return 'SIN_PROJECT_ID';

  let token: string;
  try {
    let permiso = await adaptador.obtenerPermiso();
    if (permiso === 'undetermined') permiso = await adaptador.pedirPermiso();
    if (permiso !== 'granted') return 'PERMISO_DENEGADO';
    await adaptador.prepararCanal();
    token = await adaptador.obtenerToken(projectId);
  } catch {
    return 'ERROR_TOKEN';
  }
  if (!token) return 'ERROR_TOKEN';

  const previo = separar(await almacen.leer().catch(() => null));
  if (previo && previo.tenantId === tenantId && previo.token === token) return 'SIN_CAMBIOS';

  try {
    await servidor.registrar(token);
  } catch {
    return 'ERROR_RED'; // nothing is saved, so the next launch posts it again
  }
  await almacen.guardar(comoGuardado(tenantId, token)).catch(() => undefined);

  // The device got a new token: the old one would only collect undeliverable notifications
  if (previo && previo.tenantId === tenantId && previo.token !== token) {
    await servidor.baja(previo.token).catch(() => undefined);
  }
  return 'REGISTRADO';
}

/** Unregisters this device's token. Call it before the session is cleared (the request needs the access token). */
export async function darDeBajaPush(deps: Pick<DependenciasPush, 'almacen' | 'servidor'>): Promise<'BAJA' | 'SIN_TOKEN' | 'ERROR_RED'> {
  const previo = separar(await deps.almacen.leer().catch(() => null));
  if (!previo) return 'SIN_TOKEN';
  let resultado: 'BAJA' | 'ERROR_RED' = 'BAJA';
  try {
    await deps.servidor.baja(previo.token);
  } catch {
    resultado = 'ERROR_RED';
  }
  await deps.almacen.borrar().catch(() => undefined);
  return resultado;
}

/** Roles that receive store notifications (C5). */
export function recibePush(rol: string | null | undefined): boolean {
  return !!rol && ['ADMIN', 'ADMINISTRADOR', 'VENDEDOR', 'SUPERADMIN'].includes(rol.toUpperCase());
}

/** Screen a tapped notification should open, from its `data.url`, or null when it has none we know. */
export function rutaDeNotificacion(data: unknown): 'PuntoDeVenta' | null {
  const url = (data as { url?: unknown } | null | undefined)?.url;
  if (typeof url !== 'string') return null;
  const limpia = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return limpia === '/admin/ventas' ? 'PuntoDeVenta' : null;
}
