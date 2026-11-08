import { ProductoLocal, SkuDuplicado, VarianteCatalogo, VarianteNueva, VentaLocal } from '../types';
import {
  listarDe,
  marcarConflictoEn,
  marcarErrorEn,
  marcarSincronizadaEn,
  marcarSincronizandoEn,
  recuperarInterrumpidasEn,
  reintentarEn,
  siguienteSecuencia,
  volverAColaEn,
} from './cola';
import { STORE_CATALOGO, STORE_PRODUCTOS, STORE_VENTAS, pedido, transaccion, uuidV4 } from './posDb';

export interface Categoria {
  id: string;
  nombre: string;
}

export interface OpcionAtributo {
  id: string;
  nombre: string;
}

export interface NuevoProductoLocal {
  tenantId: string;
  usuarioId: string;
  nombre: string;
  precio: number;
  categoriaId: string;
  categoriaNombre: string;
  sku: string;
  stock: number;
  talla?: OpcionAtributo | null;
  color?: OpcionAtributo | null;
  descripcion?: string;
}

export class ProductoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ProductoInvalidoError';
  }
}

const redondear = (n: number) => Number(n.toFixed(2));
const clave = (tenantId: string, varianteId: string) => `${tenantId}:${varianteId}`;

/** Catalog row of a variant that only exists on this device so far. */
function filaDeCatalogo(p: ProductoLocal, v: VarianteNueva, stockLocal: number): VarianteCatalogo {
  return {
    clave: clave(p.tenantId, v.id),
    tenantId: p.tenantId,
    varianteId: v.id,
    productoId: p.id,
    sku: v.sku,
    nombre: p.nombre,
    talla: v.tallaNombre ?? 'Única',
    color: v.colorNombre ?? 'Original',
    precio: redondear(p.precio),
    stockServidor: v.stock,
    stockLocal,
    categoria: p.categoriaNombre,
    categoriaId: p.categoriaId,
    tallaId: v.tallaId,
    colorId: v.colorId,
    local: true,
  };
}

/** Variants of products still waiting in the queue, as catalog rows (used when the snapshot is renewed). */
export function filasLocales(productos: ProductoLocal[]): VarianteCatalogo[] {
  return productos
    .filter((p) => p.estado !== 'SINCRONIZADA')
    .flatMap((p) => p.variantes.map((v) => filaDeCatalogo(p, v, v.stock)));
}

export function validarNuevoProducto(d: NuevoProductoLocal): void {
  if (!d.nombre?.trim()) throw new ProductoInvalidoError('El nombre del producto es obligatorio.');
  if (!d.categoriaId) throw new ProductoInvalidoError('Elige una categoría.');
  if (!Number.isFinite(d.precio) || d.precio <= 0) throw new ProductoInvalidoError('El precio debe ser mayor que cero.');
  if (!d.sku?.trim()) throw new ProductoInvalidoError('El SKU es obligatorio.');
  if (!Number.isInteger(d.stock) || d.stock < 0) throw new ProductoInvalidoError('El stock inicial debe ser un entero de cero o más.');
}

/** Suggests a SKU such as CAM-4F2A91 from the product name. Cheap collision check against the known SKUs. */
export function sugerirSku(nombre: string, existentes: Iterable<string> = []): string {
  const usados = new Set([...existentes].map((s) => s.toUpperCase()));
  const base =
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'PRD';
  for (let i = 0; i < 20; i += 1) {
    const sufijo = uuidV4().replace(/-/g, '').slice(0, 6).toUpperCase();
    const sku = `${base}-${sufijo}`;
    if (!usados.has(sku)) return sku;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

/** Categories, sizes and colors the cached catalog knows; the quick product form can only use those ids. */
export function opcionesDelCatalogo(catalogo: VarianteCatalogo[]) {
  const unicas = (pares: [string | undefined, string | undefined][]): OpcionAtributo[] => {
    const mapa = new Map<string, string>();
    for (const [id, nombre] of pares) if (id && nombre) mapa.set(id, nombre);
    return [...mapa].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };
  return {
    categorias: unicas(catalogo.map((v) => [v.categoriaId, v.categoria])) as Categoria[],
    tallas: unicas(catalogo.map((v) => [v.tallaId, v.tallaId ? v.talla : undefined])),
    colores: unicas(catalogo.map((v) => [v.colorId, v.colorId ? v.color : undefined])),
  };
}

/**
 * Creates a product on this device and queues it. It shows up in the local catalog at once with
 * stockLocal = initial stock, so it can be sold in the same session. Ids are generated here (C2).
 */
export async function crearProductoLocal(datos: NuevoProductoLocal): Promise<ProductoLocal> {
  validarNuevoProducto(datos);
  return transaccion([STORE_PRODUCTOS, STORE_CATALOGO], 'readwrite', async (tx) => {
    const variante: VarianteNueva = {
      id: uuidV4(),
      sku: datos.sku.trim(),
      stock: datos.stock,
      tallaId: datos.talla?.id,
      colorId: datos.color?.id,
      tallaNombre: datos.talla?.nombre,
      colorNombre: datos.color?.nombre,
    };
    const producto: ProductoLocal = {
      id: uuidV4(),
      tenantId: datos.tenantId,
      usuarioId: datos.usuarioId,
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || undefined,
      precio: redondear(datos.precio),
      categoriaId: datos.categoriaId,
      categoriaNombre: datos.categoriaNombre,
      variantes: [variante],
      creadoEn: new Date().toISOString(),
      secuencia: await siguienteSecuencia(tx, STORE_PRODUCTOS),
      estado: 'PENDIENTE',
      intentos: 0,
    };
    tx.objectStore(STORE_PRODUCTOS).put(producto);
    tx.objectStore(STORE_CATALOGO).put(filaDeCatalogo(producto, variante, variante.stock));
    return producto;
  });
}

export const listarProductosLocales = (tenantId: string) => listarDe<ProductoLocal>(STORE_PRODUCTOS, tenantId);

export const marcarProductoSincronizando = (id: string) => marcarSincronizandoEn(STORE_PRODUCTOS, id);
export const marcarProductoSincronizado = (id: string) => marcarSincronizadaEn(STORE_PRODUCTOS, id);
export const marcarProductoConflicto = (id: string, items: SkuDuplicado[]) => marcarConflictoEn(STORE_PRODUCTOS, id, items);
export const marcarProductoError = (id: string, mensaje: string) => marcarErrorEn(STORE_PRODUCTOS, id, mensaje);
export const volverProductoACola = (id: string, mensaje?: string) => volverAColaEn(STORE_PRODUCTOS, id, mensaje);
export const reintentarProducto = (id: string) => reintentarEn(STORE_PRODUCTOS, id);
export const recuperarProductosInterrumpidos = () => recuperarInterrumpidasEn(STORE_PRODUCTOS);

/** Conflict resolution "edit the SKU and retry": the same product id, so the server key is unchanged. */
export async function cambiarSkuYReintentar(id: string, varianteId: string, nuevoSku: string): Promise<ProductoLocal> {
  const sku = nuevoSku.trim();
  if (!sku) throw new ProductoInvalidoError('El SKU es obligatorio.');
  return transaccion([STORE_PRODUCTOS, STORE_CATALOGO], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_PRODUCTOS);
    const p: ProductoLocal | undefined = await pedido(store.get(id));
    if (!p) throw new Error('El producto local ya no existe.');
    if (p.estado !== 'CONFLICTO' && p.estado !== 'ERROR') throw new Error('Solo se puede editar un producto en conflicto o con error.');
    const nuevo: ProductoLocal = {
      ...p,
      variantes: p.variantes.map((v) => (v.id === varianteId ? { ...v, sku } : v)),
      estado: 'PENDIENTE',
      conflicto: undefined,
      ultimoError: undefined,
    };
    store.put(nuevo);
    const catalogo = tx.objectStore(STORE_CATALOGO);
    const fila: VarianteCatalogo | undefined = await pedido(catalogo.get(clave(p.tenantId, varianteId)));
    if (fila) catalogo.put({ ...fila, sku });
    return nuevo;
  });
}

/** Drops a product the server never registered, together with its local catalog rows. */
export async function cancelarProducto(id: string): Promise<void> {
  await transaccion([STORE_PRODUCTOS, STORE_CATALOGO, STORE_VENTAS], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_PRODUCTOS);
    const p: ProductoLocal | undefined = await pedido(store.get(id));
    if (!p) return;
    if (p.estado === 'SINCRONIZANDO' || p.estado === 'SINCRONIZADA') {
      throw new Error(`Un producto ${p.estado.toLowerCase()} no se puede cancelar.`);
    }
    const ventas: VentaLocal[] = await pedido(tx.objectStore(STORE_VENTAS).index('tenantId').getAll(p.tenantId));
    const ids = new Set(p.variantes.map((v) => v.id));
    const usado = ventas.some((v) => v.estado !== 'SINCRONIZADA' && v.items.some((i) => ids.has(i.varianteId)));
    if (usado) throw new Error('Hay ventas guardadas con este producto. Cancélalas antes de cancelar el producto.');
    store.delete(id);
    for (const v of p.variantes) tx.objectStore(STORE_CATALOGO).delete(clave(p.tenantId, v.id));
  });
}

/** Hides finished products from the queue list; they already live in the server catalog. */
export async function borrarProductosSincronizados(tenantId: string): Promise<number> {
  return transaccion([STORE_PRODUCTOS], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_PRODUCTOS);
    const filas: ProductoLocal[] = await pedido(store.index('tenantId').getAll(tenantId));
    const hechas = filas.filter((p) => p.estado === 'SINCRONIZADA');
    for (const p of hechas) store.delete(p.id);
    return hechas.length;
  });
}

