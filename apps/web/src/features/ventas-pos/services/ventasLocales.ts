import { ConflictoItem, EstadoVentaLocal, ItemVentaLocal, VarianteCatalogo, VentaLocal } from '../types';
import { STORE_CATALOGO, STORE_VENTAS, pedido, transaccion, uuidV4 } from './posDb';

/** Product as `GET /productos` returns it; only what the point of sale needs. */
export interface ProductoParaCatalogo {
  id: string;
  nombre: string;
  precio: number | string;
  categoria?: { nombre?: string } | null;
  imagenes?: { url: string; principal?: boolean; esPrincipal?: boolean }[];
  variantes?: {
    id: string;
    sku: string;
    precioExtra?: number | string | null;
    stock: number;
    talla?: { nombre: string } | null;
    color?: { nombre: string } | null;
  }[];
}

export interface LineaVenta {
  varianteId: string;
  cantidad: number;
}

export interface NuevaVentaLocal {
  tenantId: string;
  usuarioId: string;
  items: LineaVenta[];
  clienteNombre?: string;
  notas?: string;
}

export class StockLocalInsuficienteError extends Error {
  constructor(public readonly items: ConflictoItem[]) {
    super('No hay stock suficiente en este dispositivo para completar la venta.');
    this.name = 'StockLocalInsuficienteError';
  }
}

/** Sales that still hold stock on this device: they are not reflected in the server stock yet. */
const RESERVAN: EstadoVentaLocal[] = ['PENDIENTE', 'SINCRONIZANDO', 'CONFLICTO', 'ERROR'];

const clave = (tenantId: string, varianteId: string) => `${tenantId}:${varianteId}`;
const redondear = (n: number) => Number(n.toFixed(2));

function juntarLineas(lineas: LineaVenta[]): Map<string, number> {
  const juntas = new Map<string, number>();
  for (const l of lineas) juntas.set(l.varianteId, (juntas.get(l.varianteId) ?? 0) + l.cantidad);
  return juntas;
}

// ---------------------------------------------------------------------------
// Catalog snapshot
// ---------------------------------------------------------------------------

/** Replaces the snapshot of one store with what the server just listed. */
export async function guardarCatalogo(tenantId: string, productos: ProductoParaCatalogo[]): Promise<void> {
  await transaccion([STORE_CATALOGO, STORE_VENTAS], 'readwrite', async (tx) => {
    const ventas: VentaLocal[] = await pedido(tx.objectStore(STORE_VENTAS).index('tenantId').getAll(tenantId));
    const reservado = new Map<string, number>();
    for (const v of ventas.filter((x) => RESERVAN.includes(x.estado))) {
      for (const item of v.items) reservado.set(item.varianteId, (reservado.get(item.varianteId) ?? 0) + item.cantidad);
    }

    const catalogo = tx.objectStore(STORE_CATALOGO);
    const viejas: string[] = await pedido(catalogo.index('tenantId').getAllKeys(tenantId) as IDBRequest<string[]>);
    for (const k of viejas) catalogo.delete(k);

    for (const p of productos) {
      const principal = p.imagenes?.find((i) => i.principal || i.esPrincipal) ?? p.imagenes?.[0];
      for (const v of p.variantes ?? []) {
        const fila: VarianteCatalogo = {
          clave: clave(tenantId, v.id),
          tenantId,
          varianteId: v.id,
          productoId: p.id,
          sku: v.sku,
          nombre: p.nombre,
          talla: v.talla?.nombre ?? 'Única',
          color: v.color?.nombre ?? 'Original',
          precio: redondear(Number(p.precio) + Number(v.precioExtra ?? 0)),
          stockServidor: v.stock,
          stockLocal: Math.max(0, v.stock - (reservado.get(v.id) ?? 0)),
          categoria: p.categoria?.nombre,
          imagen: principal?.url,
        };
        catalogo.put(fila);
      }
    }
  });
}

export async function leerCatalogo(tenantId: string): Promise<VarianteCatalogo[]> {
  return transaccion([STORE_CATALOGO], 'readonly', (tx) =>
    pedido(tx.objectStore(STORE_CATALOGO).index('tenantId').getAll(tenantId)),
  );
}

// ---------------------------------------------------------------------------
// Sales queue
// ---------------------------------------------------------------------------

/**
 * Takes stock from the device snapshot for the given lines, all or nothing.
 * Returns the item rows (with the data shown to the seller) or throws StockLocalInsuficienteError.
 */
async function reservar(tx: IDBTransaction, tenantId: string, lineas: LineaVenta[]): Promise<ItemVentaLocal[]> {
  const catalogo = tx.objectStore(STORE_CATALOGO);
  const juntas = juntarLineas(lineas);
  const filas = new Map<string, VarianteCatalogo | undefined>();
  const faltas: ConflictoItem[] = [];

  for (const [varianteId, cantidad] of juntas) {
    const fila: VarianteCatalogo | undefined = await pedido(catalogo.get(clave(tenantId, varianteId)));
    filas.set(varianteId, fila);
    if (!fila || fila.stockLocal < cantidad) {
      faltas.push({ varianteId, nombre: fila?.nombre ?? null, solicitado: cantidad, disponible: fila?.stockLocal ?? 0 });
    }
  }
  if (faltas.length) throw new StockLocalInsuficienteError(faltas);

  const items: ItemVentaLocal[] = [];
  for (const [varianteId, cantidad] of juntas) {
    const fila = filas.get(varianteId)!;
    catalogo.put({ ...fila, stockLocal: fila.stockLocal - cantidad });
    items.push({ varianteId, nombre: fila.nombre, talla: fila.talla, color: fila.color, cantidad, precio: fila.precio });
  }
  return items;
}

async function liberar(tx: IDBTransaction, tenantId: string, items: ItemVentaLocal[]): Promise<void> {
  const catalogo = tx.objectStore(STORE_CATALOGO);
  for (const item of items) {
    const fila: VarianteCatalogo | undefined = await pedido(catalogo.get(clave(tenantId, item.varianteId)));
    if (fila) catalogo.put({ ...fila, stockLocal: fila.stockLocal + item.cantidad });
  }
}

const totalDe = (items: ItemVentaLocal[]) => redondear(items.reduce((s, i) => s + i.precio * i.cantidad, 0));

/** Registers a sale on this device: reserves the stock and queues it. Its id is the sale's Idempotency-Key. */
export async function crearVenta(datos: NuevaVentaLocal): Promise<VentaLocal> {
  return transaccion([STORE_CATALOGO, STORE_VENTAS], 'readwrite', async (tx) => {
    const items = await reservar(tx, datos.tenantId, datos.items);
    const todas: VentaLocal[] = await pedido(tx.objectStore(STORE_VENTAS).getAll());
    const venta: VentaLocal = {
      id: uuidV4(),
      tenantId: datos.tenantId,
      usuarioId: datos.usuarioId,
      items,
      clienteNombre: datos.clienteNombre?.trim() || undefined,
      notas: datos.notas?.trim() || undefined,
      total: totalDe(items),
      creadoEn: new Date().toISOString(),
      secuencia: todas.reduce((max, v) => Math.max(max, v.secuencia), 0) + 1,
      estado: 'PENDIENTE',
      intentos: 0,
    };
    tx.objectStore(STORE_VENTAS).put(venta);
    return venta;
  });
}

export async function listarVentas(tenantId: string): Promise<VentaLocal[]> {
  const ventas: VentaLocal[] = await transaccion([STORE_VENTAS], 'readonly', (tx) =>
    pedido(tx.objectStore(STORE_VENTAS).index('tenantId').getAll(tenantId)),
  );
  return ventas.sort((a, b) => a.secuencia - b.secuencia);
}

export async function obtenerVenta(id: string): Promise<VentaLocal | undefined> {
  return transaccion([STORE_VENTAS], 'readonly', (tx) => pedido(tx.objectStore(STORE_VENTAS).get(id)));
}

/** Applies a change to one stored sale. Returns the updated sale. */
async function modificar(id: string, cambio: (v: VentaLocal) => VentaLocal): Promise<VentaLocal> {
  return transaccion([STORE_VENTAS], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_VENTAS);
    const actual: VentaLocal | undefined = await pedido(store.get(id));
    if (!actual) throw new Error('La venta local ya no existe.');
    const nueva = cambio(actual);
    store.put(nueva);
    return nueva;
  });
}

export const marcarSincronizando = (id: string) =>
  modificar(id, (v) => ({ ...v, estado: 'SINCRONIZANDO', intentos: v.intentos + 1, ultimoError: undefined }));

export const marcarSincronizada = (id: string, orden: { ordenId: string; ordenNro: string }) =>
  modificar(id, (v) => ({
    ...v,
    estado: 'SINCRONIZADA',
    ordenId: orden.ordenId,
    ordenNro: orden.ordenNro,
    sincronizadaEn: new Date().toISOString(),
    ultimoError: undefined,
    conflicto: undefined,
  }));

export const marcarConflicto = (id: string, conflicto: ConflictoItem[]) =>
  modificar(id, (v) => ({ ...v, estado: 'CONFLICTO', conflicto, ultimoError: undefined }));

/** The server rejected the sale for a reason that retrying will not fix. */
export const marcarError = (id: string, mensaje: string) =>
  modificar(id, (v) => ({ ...v, estado: 'ERROR', ultimoError: mensaje }));

/** A failure that may pass (no network, server down): back to the queue, remembering why. */
export const volverACola = (id: string, mensaje?: string) =>
  modificar(id, (v) => ({ ...v, estado: 'PENDIENTE', ultimoError: mensaje }));

/** The seller decided to try again (for example after a restock). */
export const reintentarVenta = (id: string) =>
  modificar(id, (v) => ({ ...v, estado: 'PENDIENTE', conflicto: undefined, ultimoError: undefined }));

/** A tab closed in the middle of a sync leaves sales SINCRONIZANDO; the server key makes resending them safe. */
export async function recuperarInterrumpidas(): Promise<void> {
  await transaccion([STORE_VENTAS], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_VENTAS);
    const ventas: VentaLocal[] = await pedido(store.index('estado').getAll('SINCRONIZANDO'));
    for (const v of ventas) store.put({ ...v, estado: 'PENDIENTE' });
  });
}

const MODIFICABLES: EstadoVentaLocal[] = ['PENDIENTE', 'CONFLICTO', 'ERROR'];

/** Drops a sale that was never registered by the server and gives its stock back. */
export async function cancelarVenta(id: string): Promise<void> {
  await transaccion([STORE_CATALOGO, STORE_VENTAS], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_VENTAS);
    const venta: VentaLocal | undefined = await pedido(store.get(id));
    if (!venta) return;
    if (!MODIFICABLES.includes(venta.estado)) {
      throw new Error(`Una venta ${venta.estado.toLowerCase()} no se puede cancelar.`);
    }
    await liberar(tx, venta.tenantId, venta.items);
    store.delete(id);
  });
}

/**
 * Changes what a sale carries (replacement, smaller quantities). It is a different sale from then on, so it
 * gets a new id: reusing the key with another body would be refused by the server. With no items it is cancelled.
 */
export async function reemplazarItems(id: string, lineas: LineaVenta[]): Promise<VentaLocal | null> {
  return transaccion([STORE_CATALOGO, STORE_VENTAS], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_VENTAS);
    const venta: VentaLocal | undefined = await pedido(store.get(id));
    if (!venta) throw new Error('La venta local ya no existe.');
    if (venta.estado !== 'CONFLICTO' && venta.estado !== 'ERROR') {
      throw new Error('Solo se puede modificar una venta en conflicto o con error.');
    }

    await liberar(tx, venta.tenantId, venta.items);
    store.delete(id);
    if (lineas.length === 0) return null;

    const items = await reservar(tx, venta.tenantId, lineas);
    const nueva: VentaLocal = {
      ...venta,
      id: uuidV4(),
      items,
      total: totalDe(items),
      estado: 'PENDIENTE',
      intentos: 0,
      conflicto: undefined,
      ultimoError: undefined,
    };
    store.put(nueva);
    return nueva;
  });
}

export async function resumenCola(tenantId: string): Promise<Record<EstadoVentaLocal, number>> {
  const cuenta: Record<EstadoVentaLocal, number> = { PENDIENTE: 0, SINCRONIZANDO: 0, SINCRONIZADA: 0, CONFLICTO: 0, ERROR: 0 };
  for (const v of await listarVentas(tenantId)) cuenta[v.estado] += 1;
  return cuenta;
}
