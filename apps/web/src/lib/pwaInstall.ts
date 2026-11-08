/** Pure rules for the "install the app" prompt, kept apart from React so they can be tested without a DOM. */

export const CLAVE_DESCARTADO = 'aura:pwa-install-descartado';
export const CLAVE_GUIA_IOS = 'aura:pwa-install-guia-ios';
export const SILENCIO_DIAS = 14;

const DIA_MS = 24 * 3600 * 1000;

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

export type OfertaInstalacion = 'INSTALAR' | 'GUIA_IOS' | null;

/** iPhone, iPad (also the desktop-class iPadOS user agent, told apart by touch points) or iPod. */
export function esIos(userAgent: string, maxTouchPoints = 0): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** Safari proper: other iOS browsers (Chrome, Firefox, Edge) cannot add to the home screen the same way. */
export function esSafariIos(userAgent: string, maxTouchPoints = 0): boolean {
  return esIos(userAgent, maxTouchPoints) && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(userAgent);
}

/** True when the page already runs as an installed app. */
export function estaInstalada(standaloneMedia: boolean, navigatorStandalone?: boolean): boolean {
  return standaloneMedia || navigatorStandalone === true;
}

function leer(almacen: Almacen | null | undefined, clave: string): string | null {
  try {
    return almacen?.getItem(clave) ?? null;
  } catch {
    return null;
  }
}

function escribir(almacen: Almacen | null | undefined, clave: string, valor: string): void {
  try {
    almacen?.setItem(clave, valor);
  } catch {
    /* private mode or storage disabled: the prompt may reappear, which is harmless */
  }
}

/** True while the user's "not now" still holds (14 days by default). */
export function enSilencio(almacen: Almacen | null | undefined, ahora = Date.now(), dias = SILENCIO_DIAS): boolean {
  const guardado = Number(leer(almacen, CLAVE_DESCARTADO));
  return Number.isFinite(guardado) && guardado > 0 && ahora - guardado < dias * DIA_MS;
}

export function descartarOferta(almacen: Almacen | null | undefined, ahora = Date.now()): void {
  escribir(almacen, CLAVE_DESCARTADO, String(ahora));
}

export function guiaIosVista(almacen: Almacen | null | undefined): boolean {
  return leer(almacen, CLAVE_GUIA_IOS) === '1';
}

export function marcarGuiaIosVista(almacen: Almacen | null | undefined): void {
  escribir(almacen, CLAVE_GUIA_IOS, '1');
}

export interface EntradaOferta {
  /** The browser fired `beforeinstallprompt` and the event is still usable. */
  hayEventoDeInstalacion: boolean;
  instalada: boolean;
  safariIos: boolean;
  silencio: boolean;
  guiaIosYaVista: boolean;
}

/** Which offer to show, if any: the native prompt button, the iOS hint (once), or nothing. */
export function decidirOferta(e: EntradaOferta): OfertaInstalacion {
  if (e.instalada) return null;
  if (e.hayEventoDeInstalacion) return e.silencio ? null : 'INSTALAR';
  if (e.safariIos && !e.guiaIosYaVista) return 'GUIA_IOS';
  return null;
}
