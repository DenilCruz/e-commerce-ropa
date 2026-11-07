import type { MiTienda } from './tiendas.api';

export function slugDeTienda(entrada: string): string | null {
  const valor = entrada.trim().toLowerCase();
  const enlace = valor.match(/^(?:https?:\/\/[^/]+)?\/t\/([a-z0-9-]+)(?:[/?#].*)?$/);
  const slug = enlace?.[1] ?? valor;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export function tiendasParaCambiar(tiendas: MiTienda[], rolActual?: string) {
  if (rolActual === 'SUPERADMIN') return tiendas;
  const gestionadas = tiendas.filter(({ rol }) => ['ADMIN', 'ADMINISTRADOR'].includes(rol));
  return gestionadas.length ? gestionadas : tiendas;
}
