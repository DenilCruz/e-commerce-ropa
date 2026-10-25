/** Same cache the service worker serves product photos from (see runtimeCaching in vite.config.ts). */
export const CACHE_IMAGENES = 'aura-imagenes';
const SIMULTANEAS = 6;

interface CacheLike {
  match(url: string): Promise<unknown>;
  put(url: string, respuesta: Response): Promise<void>;
}

interface Dependencias {
  abrir?: (nombre: string) => Promise<CacheLike>;
  traer?: (url: string, opciones: RequestInit) => Promise<Response>;
}

const porDefecto = (): Dependencias => ({
  abrir: typeof caches !== 'undefined' ? (nombre) => caches.open(nombre) as Promise<CacheLike> : undefined,
  traer: (url, opciones) => fetch(url, opciones),
});

/**
 * Puts the product photos in the cache the service worker reads from, so the point of sale shows them with no
 * connection. Photos already stored are skipped; a failed photo is skipped too. Returns how many were stored.
 */
export async function precargarImagenes(urls: string[], deps: Dependencias = porDefecto()): Promise<number> {
  if (!deps.abrir || !deps.traer) return 0;
  const traer = deps.traer;
  try {
    const cache = await deps.abrir(CACHE_IMAGENES);
    const pendientes = [...new Set(urls.filter(Boolean))];
    let guardadas = 0;

    const trabajador = async () => {
      for (let url = pendientes.shift(); url !== undefined; url = pendientes.shift()) {
        try {
          if (await cache.match(url)) continue;
          // no-cors: the photos live on another origin; an opaque copy is enough to show them in <img>
          await cache.put(url, await traer(url, { mode: 'no-cors' }));
          guardadas += 1;
        } catch {
          /* one missing photo must not stop the others */
        }
      }
    };

    await Promise.all(Array.from({ length: SIMULTANEAS }, trabajador));
    return guardadas;
  } catch {
    return 0;
  }
}
