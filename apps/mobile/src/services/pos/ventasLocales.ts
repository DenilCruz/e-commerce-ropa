import { Db, transaccion, uuidV4 } from './db';
import { RETENCION_DIAS, catalogoVencido } from './retencion';
import { ConflictoItem, EstadoVentaLocal, ItemVentaLocal, VarianteCatalogo, VentaLocal } from './types';

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

export interface OpcionesCrearVenta {
  /** When false the retention limit of the catalog snapshot is enforced. Defaults to true (the snapshot is renewed online). */
  enLinea?: boolean;
  ahora?: Date;
}

export class StockLocalInsuficienteError extends Error {
  constructor(public readonly items: ConflictoItem[]) {
    super('No hay stock suficiente en este dispositivo para completar la venta.');
    this.name = 'StockLocalInsuficienteError';
  }
}

export class CatalogoVencidoError extends Error {
  constructor() {
    super(
      `El catálogo guardado en este dispositivo tiene más de ${RETENCION_DIAS} días. Conéctate a internet para renovarlo antes de vender sin conexión.`,
    );
    this.name = 'CatalogoVencidoError';
  }
}

/** Sales that still hold stock on this device: they are not reflected in the server stock yet. */
const RESERVAN: EstadoVentaLocal[] = ['PENDIENTE', 'SINCRONIZANDO', 'CONFLICTO', 'ERROR'];
const MODIFICABLES: EstadoVentaLocal[] = ['PENDIENTE', 'CONFLICTO', 'ERROR'];

const clave = (tenantId: string, varianteId: string) => `${tenantId}:${varianteId}`;
const claveActualizacion = (tenantId: string) => `catalogo_actualizado:${tenantId}`;
const redondear = (n: number) => Number(n.toFixed(2));
const totalDe = (items: ItemVentaLocal[]) => redondear(items.reduce((s, i) => s + i.precio * i.cantidad, 0));

function juntarLineas(lineas: LineaVenta[]): Map<string, number> {
  const juntas = new Map<string, number>();
  for (const l of lineas) juntas.set(l.varianteId, (juntas.get(l.varianteId) ?? 0) + l.cantidad);
  return juntas;
}

interface FilaDatos {
  datos: string;
}
const leerVenta = (fila: FilaDatos): VentaLocal => JSON.parse(fila.datos);

// ---------------------------------------------------------------------------
// Row helpers (callers hold the transaction)
// ---------------------------------------------------------------------------

async function guardarVenta(db: Db, v: VentaLocal): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO ventas (id, tenant_id, usuario_id, estado, secuencia, datos) VALUES (?, ?, ?, ?, ?, ?)',
    [v.id, v.tenantId, v.usuarioId, v.estado, v.secuencia, JSON.stringify(v)],
  );
}

async function buscarVenta(db: Db, id: string): Promise<VentaLocal | undefined> {
  const fila = await db.getFirstAsync<FilaDatos>('SELECT datos FROM ventas WHERE id = ?', [id]);
  return fila ? leerVenta(fila) : undefined;
}

async function guardarVariante(db: Db, v: VarianteCatalogo): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO catalogo (clave, tenant_id, datos) VALUES (?, ?, ?)', [
    v.clave,
    v.tenantId,
    JSON.stringify(v),
  ]);
}

async function buscarVariante(db: Db, tenantId: string, varianteId: string): Promise<VarianteCatalogo | undefined> {
  const fila = await db.getFirstAsync<FilaDatos>('SELECT datos FROM catalogo WHERE clave = ?', [clave(tenantId, varianteId)]);
  return fila ? JSON.parse(fila.datos) : undefined;
}

/**
 * Takes stock from the device snapshot for the given lines, all or nothing.
 * Returns the item rows (with the data shown to the seller) or throws StockLocalInsuficienteError.
 */
async function reservar(db: Db, tenantId: string, lineas: LineaVenta[]): Promise<ItemVentaLocal[]> {
  const juntas = juntarLineas(lineas);
  const filas = new Map<string, VarianteCatalogo | undefined>();
  const faltas: ConflictoItem[] = [];

  for (const [varianteId, cantidad] of juntas) {
    const fila = await buscarVariante(db, tenantId, varianteId);
    filas.set(varianteId, fila);
    if (!fila || fila.stockLocal < cantidad) {
      faltas.push({ varianteId, nombre: fila?.nombre ?? null, solicitado: cantidad, disponible: fila?.stockLocal ?? 0 });
    }
  }
  if (faltas.length) throw new StockLocalInsuficienteError(faltas);

  const items: ItemVentaLocal[] = [];
  for (const [varianteId, cantidad] of juntas) {
    const fila = filas.get(varianteId)!;
    await guardarVariante(db, { ...fila, stockLocal: fila.stockLocal - cantidad });
    items.push({ varianteId, nombre: fila.nombre, talla: fila.talla, color: fila.color, cantidad, precio: fila.precio });
  }
  return items;
}

async function liberar(db: Db, tenantId: string, items: ItemVentaLocal[]): Promise<void> {
  for (const item of items) {
    const fila = await buscarVariante(db, tenantId, item.varianteId);
    if (fila) await guardarVariante(db, { ...fila, stockLocal: fila.stockLocal + item.cantidad });
  }
}

// ---------------------------------------------------------------------------
// Catalog snapshot
// ---------------------------------------------------------------------------

/** Replaces the snapshot of one store with what the server just listed and stamps when it was taken. */
export async function guardarCatalogo(
  db: Db,
  tenantId: string,
  productos: ProductoParaCatalogo[],
  ahora: Date = new Date(),
): Promise<void> {
  await transaccion(db, async () => {
    const filas = await db.getAllAsync<FilaDatos>('SELECT datos FROM ventas WHERE tenant_id = ?', [tenantId]);
    const reservado = new Map<string, number>();
    for (const v of filas.map(leerVenta).filter((x) => RESERVAN.includes(x.estado))) {
      for (const item of v.items) reservado.set(item.varianteId, (reservado.get(item.varianteId) ?? 0) + item.cantidad);
    }

    await db.runAsync('DELETE FROM catalogo WHERE tenant_id = ?', [tenantId]);
    for (const p of productos) {
      const principal = p.imagenes?.find((i) => i.principal || i.esPrincipal) ?? p.imagenes?.[0];
      for (const v of p.variantes ?? []) {
        await guardarVariante(db, {
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
        });
      }
    }
    await db.runAsync('INSERT OR REPLACE INTO meta (clave, valor) VALUES (?, ?)', [
      claveActualizacion(tenantId),
      ahora.toISOString(),
    ]);
  });
}

export async function leerCatalogo(db: Db, tenantId: string): Promise<VarianteCatalogo[]> {
  const filas = await db.getAllAsync<FilaDatos>('SELECT datos FROM catalogo WHERE tenant_id = ?', [tenantId]);
  return filas.map((f) => JSON.parse(f.datos));
}

/** ISO date of the last catalog snapshot of the store, or null if this device never downloaded one. */
export async function leerActualizacionCatalogo(db: Db, tenantId: string): Promise<string | null> {
  const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM meta WHERE clave = ?', [claveActualizacion(tenantId)]);
  return fila?.valor ?? null;
}

// ---------------------------------------------------------------------------
// Sales queue
// ---------------------------------------------------------------------------

/** Registers a sale on this device: reserves the stock and queues it. Its id is the sale's Idempotency-Key. */
export async function crearVenta(db: Db, datos: NuevaVentaLocal, opciones: OpcionesCrearVenta = {}): Promise<VentaLocal> {
  const ahora = opciones.ahora ?? new Date();
  return transaccion(db, async () => {
    if (opciones.enLinea === false && catalogoVencido(await leerActualizacionCatalogo(db, datos.tenantId), ahora)) {
      throw new CatalogoVencidoError();
    }
    const items = await reservar(db, datos.tenantId, datos.items);
    const ultima = await db.getFirstAsync<{ maxima: number }>('SELECT COALESCE(MAX(secuencia), 0) AS maxima FROM ventas');
    const venta: VentaLocal = {
      id: uuidV4(),
      tenantId: datos.tenantId,
      usuarioId: datos.usuarioId,
      items,
      clienteNombre: datos.clienteNombre?.trim() || undefined,
      notas: datos.notas?.trim() || undefined,
      total: totalDe(items),
      creadoEn: ahora.toISOString(),
      secuencia: (ultima?.maxima ?? 0) + 1,
      estado: 'PENDIENTE',
      intentos: 0,
    };
    await guardarVenta(db, venta);
    return venta;
  });
}

export async function listarVentas(db: Db, tenantId: string): Promise<VentaLocal[]> {
  const filas = await db.getAllAsync<FilaDatos>('SELECT datos FROM ventas WHERE tenant_id = ? ORDER BY secuencia ASC', [tenantId]);
  return filas.map(leerVenta);
}

export async function obtenerVenta(db: Db, id: string): Promise<VentaLocal | undefined> {
  return buscarVenta(db, id);
}

/** Applies a change to one stored sale. Returns the updated sale. */
async function modificar(db: Db, id: string, cambio: (v: VentaLocal) => VentaLocal): Promise<VentaLocal> {
  return transaccion(db, async () => {
    const actual = await buscarVenta(db, id);
    if (!actual) throw new Error('La venta local ya no existe.');
    const nueva = cambio(actual);
    await guardarVenta(db, nueva);
    return nueva;
  });
}

export const marcarSincronizando = (db: Db, id: string) =>
  modificar(db, id, (v) => ({ ...v, estado: 'SINCRONIZANDO', intentos: v.intentos + 1, ultimoError: undefined }));

export const marcarSincronizada = (db: Db, id: string, orden: { ordenId: string; ordenNro: string }) =>
  modificar(db, id, (v) => ({
    ...v,
    estado: 'SINCRONIZADA',
    ordenId: orden.ordenId,
    ordenNro: orden.ordenNro,
    sincronizadaEn: new Date().toISOString(),
    ultimoError: undefined,
    conflicto: undefined,
  }));

export const marcarConflicto = (db: Db, id: string, conflicto: ConflictoItem[]) =>
  modificar(db, id, (v) => ({ ...v, estado: 'CONFLICTO', conflicto, ultimoError: undefined }));

/** The server rejected the sale for a reason that retrying will not fix. */
export const marcarError = (db: Db, id: string, mensaje: string) =>
  modificar(db, id, (v) => ({ ...v, estado: 'ERROR', ultimoError: mensaje }));

/** A failure that may pass (no network, server down): back to the queue, remembering why. */
export const volverACola = (db: Db, id: string, mensaje?: string) =>
  modificar(db, id, (v) => ({ ...v, estado: 'PENDIENTE', ultimoError: mensaje }));

/** The seller decided to try again (for example after a restock). */
export const reintentarVenta = (db: Db, id: string) =>
  modificar(db, id, (v) => ({ ...v, estado: 'PENDIENTE', conflicto: undefined, ultimoError: undefined }));

/** An app closed in the middle of a sync leaves sales SINCRONIZANDO; the server key makes resending them safe. */
export async function recuperarInterrumpidas(db: Db): Promise<void> {
  await transaccion(db, async () => {
    const filas = await db.getAllAsync<FilaDatos>("SELECT datos FROM ventas WHERE estado = 'SINCRONIZANDO'");
    for (const v of filas.map(leerVenta)) await guardarVenta(db, { ...v, estado: 'PENDIENTE' });
  });
}

/** Drops a sale that was never registered by the server and gives its stock back. */
export async function cancelarVenta(db: Db, id: string): Promise<void> {
  await transaccion(db, async () => {
    const venta = await buscarVenta(db, id);
    if (!venta) return;
    if (!MODIFICABLES.includes(venta.estado)) {
      throw new Error(`Una venta ${venta.estado.toLowerCase()} no se puede cancelar.`);
    }
    await liberar(db, venta.tenantId, venta.items);
    await db.runAsync('DELETE FROM ventas WHERE id = ?', [id]);
  });
}

/**
 * Changes what a sale carries (replacement, smaller quantities). It is a different sale from then on, so it
 * gets a new id: reusing the key with another body would be refused by the server. With no items it is cancelled.
 * If the new lines cannot be reserved nothing changes.
 */
export async function reemplazarItems(db: Db, id: string, lineas: LineaVenta[]): Promise<VentaLocal | null> {
  return transaccion(db, async () => {
    const venta = await buscarVenta(db, id);
    if (!venta) throw new Error('La venta local ya no existe.');
    if (venta.estado !== 'CONFLICTO' && venta.estado !== 'ERROR') {
      throw new Error('Solo se puede modificar una venta en conflicto o con error.');
    }

    await liberar(db, venta.tenantId, venta.items);
    await db.runAsync('DELETE FROM ventas WHERE id = ?', [id]);
    if (lineas.length === 0) return null;

    const items = await reservar(db, venta.tenantId, lineas);
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
    await guardarVenta(db, nueva);
    return nueva;
  });
}

export async function resumenCola(db: Db, tenantId: string): Promise<Record<EstadoVentaLocal, number>> {
  const cuenta: Record<EstadoVentaLocal, number> = { PENDIENTE: 0, SINCRONIZANDO: 0, SINCRONIZADA: 0, CONFLICTO: 0, ERROR: 0 };
  for (const v of await listarVentas(db, tenantId)) cuenta[v.estado] += 1;
  return cuenta;
}

/** Clears the list of sales the server already registered; they hold no stock and need no action. */
export async function borrarSincronizadas(db: Db, tenantId: string): Promise<number> {
  return transaccion(db, async () => {
    const r = await db.runAsync("DELETE FROM ventas WHERE tenant_id = ? AND estado = 'SINCRONIZADA'", [tenantId]);
    return r.changes;
  });
}
