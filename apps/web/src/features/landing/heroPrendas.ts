import { isCutoutUrl } from '../../lib/cutout';

export type PrendaHero = { id: string; nombre: string; precio: string; imagen: string; ejemplo?: boolean };

/** Transparent cut-outs shipped with the web build (public/landing). The landing shows these when no store has subscribed yet. */
const EJEMPLO: { id: string; nombre: string; archivo: string }[] = [
  { id: 'ejemplo-abrigo', nombre: 'Abrigo cruzado', archivo: '/landing/abrigo.webp' },
  { id: 'ejemplo-vestido', nombre: 'Vestido de lino', archivo: '/landing/vestido.webp' },
  { id: 'ejemplo-camisa', nombre: 'Camisa de vestir', archivo: '/landing/camisa.webp' },
  { id: 'ejemplo-falda', nombre: 'Falda plisada', archivo: '/landing/falda.webp' },
  { id: 'ejemplo-polera', nombre: 'Polera de algodón', archivo: '/landing/polera.webp' },
  { id: 'ejemplo-shorts', nombre: 'Shorts de sastrería', archivo: '/landing/shorts.webp' },
  { id: 'ejemplo-pantalon', nombre: 'Pantalón de lino', archivo: '/landing/pantalon.webp' },
];

export function prendasEjemplo(): PrendaHero[] {
  return EJEMPLO.map((p) => ({ id: p.id, nombre: p.nombre, precio: '', imagen: p.archivo, ejemplo: true }));
}

type Producto = {
  id?: string;
  nombre?: string;
  precio?: string | number;
  activo?: boolean;
  destacado?: boolean;
  categoria?: { id?: string };
  categoriaId?: string;
  imagenes?: { url?: string; principal?: boolean }[];
};

/**
 * Real cut-out products from the example store when there are enough to fill the carousel.
 * Otherwise the static example, so a visitor with no subscription still sees one garment and the scroll turn.
 */
export function elegirPrendasCarrusel(list: unknown, assetBase: string): PrendaHero[] {
  const ejemplo = prendasEjemplo();
  if (!Array.isArray(list)) return ejemplo;
  const withPhoto = (list as Producto[]).filter((p) => {
    const img = p?.imagenes?.find((i) => i.principal) || p?.imagenes?.[0];
    return p?.activo !== false && !!img?.url && isCutoutUrl(img.url);
  });
  const seen = new Set<string>();
  const ordered = [...withPhoto.filter((p) => p.destacado), ...withPhoto.filter((p) => !p.destacado)];
  const picked = ordered.filter((p) => {
    const k = p.categoria?.id || p.categoriaId || p.id || '';
    if (seen.has(k) && seen.size < 6) return false;
    seen.add(k);
    return true;
  }).slice(0, 12);
  if (picked.length < 3) return ejemplo;
  return picked.map((p) => {
    const img = p.imagenes!.find((i) => i.principal) || p.imagenes![0];
    const path = img.url || '';
    return {
      id: p.id || path,
      nombre: p.nombre || 'Prenda',
      precio: String(p.precio ?? ''),
      imagen: path.startsWith('http') ? path : `${assetBase}${path.startsWith('/uploads') ? path : `/uploads/${path.replace(/^\//, '')}`}`,
    };
  });
}
