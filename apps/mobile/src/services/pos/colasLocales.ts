import { Db, transaccion, uuidV4 } from './db';
import {
  ClienteLocal,
  ClienteVenta,
  ExistenteCliente,
  ProductoLocal,
  RegistroCola,
  SkuDuplicado,
  VarianteCatalogo,
  VentaLocal,
} from './types';
import { buscarVariante, guardarVariante, guardarVenta, leerVenta } from './ventasLocales';

/** The queues that share the sales' state machine (PENDIENTE -> SINCRONIZANDO -> SINCRONIZADA | CONFLICTO | ERROR). */
export type TablaCola = 'clientes' | 'productos';

interface FilaDatos {
  datos: string;
}

const NO_CAMBIAN_STOCK = ['SINCRONIZADA'];
const MODIFICABLES = ['PENDIENTE', 'CONFLICTO', 'ERROR'];

// ---------------------------------------------------------------------------
// Generic queue helpers
// ---------------------------------------------------------------------------

export async function guardarRegistro<T extends RegistroCola>(db: Db, tabla: TablaCola, r: T): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${tabla} (id, tenant_id, usuario_id, estado, secuencia, datos) VALUES (?, ?, ?, ?, ?, ?)`,
    [r.id, r.tenantId, r.usuarioId, r.estado, r.secuencia, JSON.stringify(r)],
  );
}

export async function buscarRegistro<T extends RegistroCola>(db: Db, tabla: TablaCola, id: string): Promise<T | undefined> {
  const fila = await db.getFirstAsync<FilaDatos>(`SELECT datos FROM ${tabla} WHERE id = ?`, [id]);
  return fila ? (JSON.parse(fila.datos) as T) : undefined;
}

export async function listarRegistros<T extends RegistroCola>(db: Db, tabla: TablaCola, tenantId: string): Promise<T[]> {
  const filas = await db.getAllAsync<FilaDatos>(`SELECT datos FROM ${tabla} WHERE tenant_id = ? ORDER BY secuencia ASC`, [tenantId]);
  return filas.map((f) => JSON.parse(f.datos) as T);
}

async function siguienteSecuencia(db: Db, tabla: TablaCola): Promise<number> {
  const ultima = await db.getFirstAsync<{ maxima: number }>(`SELECT COALESCE(MAX(secuencia), 0) AS maxima FROM ${tabla}`);
  return (ultima?.maxima ?? 0) + 1;
}

async function modificar<T extends RegistroCola>(db: Db, tabla: TablaCola, id: string, cambio: (r: T) => T): Promise<T> {
  return transaccion(db, async () => {
    const actual = await buscarRegistro<T>(db, tabla, id);
    if (!actual) throw new Error('El registro local ya no existe.');
    const nuevo = cambio(actual);
    await guardarRegistro(db, tabla, nuevo);
    return nuevo;
  });
}

export const marcarSincronizandoRegistro = (db: Db, tabla: TablaCola, id: string) =>
  modificar<RegistroCola>(db, tabla, id, (r) => ({ ...r, estado: 'SINCRONIZANDO', intentos: r.intentos + 1, ultimoError: undefined }));

export const marcarSincronizadoRegistro = (db: Db, tabla: TablaCola, id: string) =>
  modificar<RegistroCola>(db, tabla, id, (r) => ({
    ...r,
    estado: 'SINCRONIZADA',
    sincronizadaEn: new Date().toISOString(),
    ultimoError: undefined,
    conflicto: undefined,
  } as RegistroCola));

export const marcarConflictoRegistro = (db: Db, tabla: TablaCola, id: string, conflicto: unknown) =>
  modificar<RegistroCola>(db, tabla, id, (r) => ({ ...r, estado: 'CONFLICTO', conflicto, ultimoError: undefined } as RegistroCola));

export const marcarErrorRegistro = (db: Db, tabla: TablaCola, id: string, mensaje: string) =>
  modificar<RegistroCola>(db, tabla, id, (r) => ({ ...r, estado: 'ERROR', ultimoError: mensaje }));

export const volverAColaRegistro = (db: Db, tabla: TablaCola, id: string, mensaje?: string) =>
  modificar<RegistroCola>(db, tabla, id, (r) => ({ ...r, estado: 'PENDIENTE', ultimoError: mensaje }));

export const reintentarRegistro = (db: Db, tabla: TablaCola, id: string) =>
  modificar<RegistroCola>(db, tabla, id, (r) => ({ ...r, estado: 'PENDIENTE', conflicto: undefined, ultimoError: undefined } as RegistroCola));

/** An app closed mid-sync leaves records SINCRONIZANDO; the server's idempotency makes resending them safe. */
export async function recuperarInterrumpidosRegistros(db: Db, tabla: TablaCola): Promise<void> {
  await transaccion(db, async () => {
    const filas = await db.getAllAsync<FilaDatos>(`SELECT datos FROM ${tabla} WHERE estado = 'SINCRONIZANDO'`);
    for (const f of filas) await guardarRegistro(db, tabla, { ...JSON.parse(f.datos), estado: 'PENDIENTE' });
  });
}

/** Clears the records the server already confirmed. */
export async function borrarSincronizadosRegistros(db: Db, tabla: TablaCola, tenantId: string): Promise<number> {
  return transaccion(db, async () => {
    const r = await db.runAsync(`DELETE FROM ${tabla} WHERE tenant_id = ? AND estado = 'SINCRONIZADA'`, [tenantId]);
    return r.changes;
  });
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export interface NuevoClienteLocal {
  tenantId: string;
  usuarioId: string;
  nombre: string;
  apellido?: string;
  celular?: string;
  ci?: string;
  correo?: string;
}

export class ValidacionLocalError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ValidacionLocalError';
  }
}

const limpio = (v?: string) => v?.trim() || undefined;

/** Registers a customer on this device (works offline). Its id is generated here and is what the server stores. */
export async function crearClienteLocal(db: Db, datos: NuevoClienteLocal, ahora: Date = new Date()): Promise<ClienteLocal> {
  const nombre = datos.nombre.trim();
  if (!nombre) throw new ValidacionLocalError('Escribe el nombre del cliente.');
  if (nombre.length > 80) throw new ValidacionLocalError('El nombre admite hasta 80 caracteres.');
  const ci = limpio(datos.ci);
  return transaccion(db, async () => {
    if (ci) {
      const mismo = (await listarRegistros<ClienteLocal>(db, 'clientes', datos.tenantId)).find(
        (c) => c.ci === ci && c.estado !== 'SINCRONIZADA' && !c.fusionadoCon,
      );
      if (mismo) throw new ValidacionLocalError(`Ya registraste a ${mismo.nombre} con ese CI en este equipo.`);
    }
    const cliente: ClienteLocal = {
      id: uuidV4(),
      tenantId: datos.tenantId,
      usuarioId: datos.usuarioId,
      nombre,
      apellido: limpio(datos.apellido),
      celular: limpio(datos.celular),
      ci,
      correo: limpio(datos.correo),
      creadoEn: ahora.toISOString(),
      secuencia: await siguienteSecuencia(db, 'clientes'),
      estado: 'PENDIENTE',
      intentos: 0,
    };
    await guardarRegistro(db, 'clientes', cliente);
    return cliente;
  });
}

export const listarClientesLocales = (db: Db, tenantId: string) => listarRegistros<ClienteLocal>(db, 'clientes', tenantId);

/** The part of a customer a sale carries. */
export const aClienteVenta = (c: ClienteVenta): ClienteVenta => ({
  id: c.id,
  nombre: c.nombre,
  apellido: c.apellido,
  celular: c.celular,
  ci: c.ci,
  correo: c.correo,
});

/** Sales that still have to reach the server and mention this customer. */
async function ventasSinEnviarDe(db: Db, clienteId: string, tenantId: string): Promise<VentaLocal[]> {
  const filas = await db.getAllAsync<FilaDatos>('SELECT datos FROM ventas WHERE tenant_id = ?', [tenantId]);
  return filas.map(leerVenta).filter((v) => v.estado !== 'SINCRONIZADA' && v.cliente?.id === clienteId);
}

/**
 * The customer `de` is the same person as `a` (the server merged them by ci, or the user chose the existing one):
 * pending sales point to `a` and the local record stops being sent.
 */
export async function fusionarCliente(db: Db, tenantId: string, de: string, a: ExistenteCliente): Promise<void> {
  await transaccion(db, async () => {
    for (const v of await ventasSinEnviarDe(db, de, tenantId)) {
      const base = v.cliente!;
      await guardarVenta(db, {
        ...v,
        cliente: { ...base, id: a.id, nombre: a.nombre || base.nombre, ci: a.ci ?? base.ci },
        clienteNombre: v.clienteNombre ?? a.nombre,
      });
    }
    const local = await buscarRegistro<ClienteLocal>(db, 'clientes', de);
    if (local && local.estado !== 'SINCRONIZADA') {
      await guardarRegistro(db, 'clientes', {
        ...local,
        estado: 'SINCRONIZADA',
        fusionadoCon: a.id,
        conflicto: undefined,
        ultimoError: undefined,
        sincronizadaEn: new Date().toISOString(),
      });
    }
  });
}

/** Conflict resolution "use the existing customer": drops the local duplicate in favour of the server's one. */
export async function usarClienteExistente(db: Db, id: string): Promise<void> {
  const local = await buscarRegistro<ClienteLocal>(db, 'clientes', id);
  if (!local?.conflicto) throw new Error('Este cliente no tiene un conflicto por resolver.');
  await fusionarCliente(db, local.tenantId, id, local.conflicto.existente);
}

/** Conflict resolution "cancel": removes the customer unless a sale still waiting to sync uses it. */
export async function cancelarClienteLocal(db: Db, id: string): Promise<void> {
  await transaccion(db, async () => {
    const local = await buscarRegistro<ClienteLocal>(db, 'clientes', id);
    if (!local) return;
    if (!MODIFICABLES.includes(local.estado)) throw new Error('Un cliente ya enviado no se puede cancelar.');
    if ((await ventasSinEnviarDe(db, id, local.tenantId)).length) {
      throw new Error('Hay ventas sin enviar que usan a este cliente. Cancélalas o espera a que se envíen.');
    }
    await db.runAsync('DELETE FROM clientes WHERE id = ?', [id]);
  });
}

// --- Customer cache (what the server listed, for the picker when offline) ---

const claveCacheClientes = (tenantId: string) => `clientes_cache:${tenantId}`;

export interface ClienteCache extends ClienteVenta {}

export async function guardarClientesCache(db: Db, tenantId: string, clientes: ClienteCache[]): Promise<void> {
  const lista = clientes.map(aClienteVenta).slice(0, 200);
  await db.runAsync('INSERT OR REPLACE INTO meta (clave, valor) VALUES (?, ?)', [claveCacheClientes(tenantId), JSON.stringify(lista)]);
}

export async function leerClientesCache(db: Db, tenantId: string): Promise<ClienteCache[]> {
  const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM meta WHERE clave = ?', [claveCacheClientes(tenantId)]);
  if (!fila) return [];
  try {
    const lista = JSON.parse(fila.valor);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/** Customers a seller can pick: the cached server list plus the ones registered here (merged ones are hidden). */
export function clientesElegibles(cache: ClienteCache[], locales: ClienteLocal[], busqueda = ''): ClienteVenta[] {
  const vistos = new Map<string, ClienteVenta>();
  for (const c of cache) vistos.set(c.id, c);
  for (const c of locales) if (!c.fusionadoCon) vistos.set(c.id, aClienteVenta(c));
  const q = busqueda.trim().toLowerCase();
  return [...vistos.values()]
    .filter((c) => !q || `${c.nombre} ${c.apellido ?? ''} ${c.ci ?? ''} ${c.celular ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface NuevoProductoLocal {
  tenantId: string;
  usuarioId: string;
  nombre: string;
  precio: number;
  categoriaId: string;
  categoriaNombre?: string;
  sku: string;
  stockInicial: number;
}

/** Registers a product with one variant on this device. It shows up in the local catalog at once and can be sold offline. */
export async function crearProductoLocal(db: Db, datos: NuevoProductoLocal, ahora: Date = new Date()): Promise<ProductoLocal> {
  const nombre = datos.nombre.trim();
  const sku = datos.sku.trim();
  if (!nombre) throw new ValidacionLocalError('Escribe el nombre del producto.');
  if (!sku) throw new ValidacionLocalError('Escribe el SKU.');
  if (!datos.categoriaId) throw new ValidacionLocalError('Elige una categoría.');
  if (!Number.isFinite(datos.precio) || datos.precio < 0) throw new ValidacionLocalError('El precio no es válido.');
  if (!Number.isInteger(datos.stockInicial) || datos.stockInicial < 0) throw new ValidacionLocalError('El stock inicial debe ser un entero desde 0.');

  return transaccion(db, async () => {
    const enCatalogo = await db.getAllAsync<FilaDatos>('SELECT datos FROM catalogo WHERE tenant_id = ?', [datos.tenantId]);
    const repetido = enCatalogo.map((f) => JSON.parse(f.datos) as VarianteCatalogo).some((v) => v.sku.toLowerCase() === sku.toLowerCase());
    if (repetido) throw new ValidacionLocalError(`El SKU ${sku} ya existe en el catálogo de este equipo.`);

    const producto: ProductoLocal = {
      id: uuidV4(),
      tenantId: datos.tenantId,
      usuarioId: datos.usuarioId,
      nombre,
      precio: Number(datos.precio.toFixed(2)),
      categoriaId: datos.categoriaId,
      categoriaNombre: datos.categoriaNombre,
      sku,
      varianteId: uuidV4(),
      stockInicial: datos.stockInicial,
      creadoEn: ahora.toISOString(),
      secuencia: await siguienteSecuencia(db, 'productos'),
      estado: 'PENDIENTE',
      intentos: 0,
    };
    await guardarRegistro(db, 'productos', producto);
    await guardarVariante(db, varianteDe(producto));
    return producto;
  });
}

const varianteDe = (p: ProductoLocal, stockLocal = p.stockInicial): VarianteCatalogo => ({
  clave: `${p.tenantId}:${p.varianteId}`,
  tenantId: p.tenantId,
  varianteId: p.varianteId,
  productoId: p.id,
  sku: p.sku,
  nombre: p.nombre,
  talla: 'Única',
  color: 'Original',
  precio: p.precio,
  stockServidor: p.stockInicial,
  stockLocal,
  categoria: p.categoriaNombre,
  categoriaId: p.categoriaId,
});

export const listarProductosLocales = (db: Db, tenantId: string) => listarRegistros<ProductoLocal>(db, 'productos', tenantId);

/** Conflict resolution "edit SKU and retry": the product keeps its ids, so sales already queued for it stay valid. */
export async function cambiarSkuProducto(db: Db, id: string, nuevoSku: string): Promise<ProductoLocal> {
  const sku = nuevoSku.trim();
  if (!sku) throw new ValidacionLocalError('Escribe el SKU.');
  return transaccion(db, async () => {
    const actual = await buscarRegistro<ProductoLocal>(db, 'productos', id);
    if (!actual) throw new Error('El producto local ya no existe.');
    if (!MODIFICABLES.includes(actual.estado)) throw new Error('Solo se puede cambiar el SKU de un producto en conflicto o con error.');
    const enCatalogo = (await db.getAllAsync<FilaDatos>('SELECT datos FROM catalogo WHERE tenant_id = ?', [actual.tenantId]))
      .map((f) => JSON.parse(f.datos) as VarianteCatalogo);
    if (enCatalogo.some((v) => v.varianteId !== actual.varianteId && v.sku.toLowerCase() === sku.toLowerCase())) {
      throw new ValidacionLocalError(`El SKU ${sku} ya existe en el catálogo de este equipo.`);
    }
    const nuevo: ProductoLocal = { ...actual, sku, estado: 'PENDIENTE', conflicto: undefined, ultimoError: undefined };
    await guardarRegistro(db, 'productos', nuevo);
    const variante = await buscarVariante(db, actual.tenantId, actual.varianteId);
    if (variante) await guardarVariante(db, { ...variante, sku });
    return nuevo;
  });
}

/** Cancels a product the server never registered, unless a queued sale still contains it. */
export async function cancelarProductoLocal(db: Db, id: string): Promise<void> {
  await transaccion(db, async () => {
    const actual = await buscarRegistro<ProductoLocal>(db, 'productos', id);
    if (!actual) return;
    if (!MODIFICABLES.includes(actual.estado)) throw new Error('Un producto ya enviado no se puede cancelar.');
    const filas = await db.getAllAsync<FilaDatos>('SELECT datos FROM ventas WHERE tenant_id = ?', [actual.tenantId]);
    const usado = filas
      .map(leerVenta)
      .some((v) => !NO_CAMBIAN_STOCK.includes(v.estado) && v.items.some((i) => i.varianteId === actual.varianteId));
    if (usado) throw new Error('Hay ventas sin enviar que incluyen este producto. Cancélalas primero.');
    await db.runAsync('DELETE FROM productos WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM catalogo WHERE clave = ?', [`${actual.tenantId}:${actual.varianteId}`]);
  });
}

export type { SkuDuplicado };
