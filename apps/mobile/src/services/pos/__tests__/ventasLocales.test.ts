import { beforeEach, describe, expect, it } from 'vitest';
import { migrar, VERSION_ESQUEMA, uuidV4, Db } from '../db';
import { RETENCION_DIAS } from '../retencion';
import {
  CatalogoVencidoError,
  StockLocalInsuficienteError,
  borrarSincronizadas,
  cancelarVenta,
  crearVenta,
  guardarCatalogo,
  leerActualizacionCatalogo,
  leerCatalogo,
  listarVentas,
  marcarConflicto,
  marcarError,
  marcarSincronizada,
  marcarSincronizando,
  obtenerVenta,
  recuperarInterrumpidas,
  reemplazarItems,
  reintentarVenta,
  resumenCola,
  volverACola,
} from '../ventasLocales';
import { crearDbNode } from './dbNode';

const T1 = 'tenant-aura';
const T2 = 'tenant-luna';
const U = 'user-1';
const DIA = 24 * 60 * 60 * 1000;

const producto = (id: string, stock: number, extra = 0) => ({
  id: `p-${id}`,
  nombre: `Prenda ${id}`,
  precio: 100,
  categoria: { nombre: 'Vestidos' },
  imagenes: [{ url: `/img/${id}.png`, principal: true }],
  variantes: [{ id: `v-${id}`, sku: `SKU-${id}`, precioExtra: extra, stock, talla: { nombre: 'M' }, color: { nombre: 'Rojo' } }],
});

const venta = (varianteId: string, cantidad: number, tenantId = T1) => ({
  tenantId,
  usuarioId: U,
  items: [{ varianteId, cantidad }],
});

let db: Db & { cerrar: () => void };

const stockLocal = async (varianteId: string, tenantId = T1) =>
  (await leerCatalogo(db, tenantId)).find((v) => v.varianteId === varianteId)?.stockLocal;

beforeEach(async () => {
  db = crearDbNode();
  await migrar(db);
});

describe('migration', () => {
  it('creates the schema, records the version and can run again without losing data', async () => {
    expect((await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(VERSION_ESQUEMA);
    await guardarCatalogo(db, T1, [producto('a', 5)]);

    await migrar(db);

    expect((await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(VERSION_ESQUEMA);
    expect(await leerCatalogo(db, T1)).toHaveLength(1);
    const tablas = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tablas.map((t) => t.name)).toEqual(expect.arrayContaining(['catalogo', 'meta', 'ventas']));
  });
});

describe('catalog snapshot', () => {
  it('keeps name, size, color and the current price (base + extra) of every variant', async () => {
    await guardarCatalogo(db, T1, [producto('a', 5, 15)]);

    expect(await leerCatalogo(db, T1)).toEqual([
      expect.objectContaining({
        varianteId: 'v-a', nombre: 'Prenda a', talla: 'M', color: 'Rojo', precio: 115, stockServidor: 5, stockLocal: 5,
        categoria: 'Vestidos', imagen: '/img/a.png', sku: 'SKU-a',
      }),
    ]);
  });

  it('keeps each store apart', async () => {
    await guardarCatalogo(db, T1, [producto('a', 5)]);
    await guardarCatalogo(db, T2, [producto('b', 2)]);

    expect((await leerCatalogo(db, T1)).map((v) => v.varianteId)).toEqual(['v-a']);
    expect((await leerCatalogo(db, T2)).map((v) => v.varianteId)).toEqual(['v-b']);
  });

  it('drops variants the server no longer lists when the snapshot is renewed', async () => {
    await guardarCatalogo(db, T1, [producto('a', 5), producto('b', 5)]);
    await guardarCatalogo(db, T1, [producto('a', 5)]);

    expect((await leerCatalogo(db, T1)).map((v) => v.varianteId)).toEqual(['v-a']);
  });

  it('subtracts the sales not synced yet from the fresh server stock, but not the synced ones', async () => {
    await guardarCatalogo(db, T1, [producto('a', 10)]);
    await crearVenta(db, venta('v-a', 2));
    const hecha = await crearVenta(db, venta('v-a', 3));
    await marcarSincronizada(db, hecha.id, { ordenId: 'o1', ordenNro: 'NV-1' });

    await guardarCatalogo(db, T1, [producto('a', 7)]); // server already counts the synced sale: 10 - 3

    expect(await stockLocal('v-a')).toBe(5); // 7 - the pending 2
  });

  it('stamps the time of the snapshot per store', async () => {
    expect(await leerActualizacionCatalogo(db, T1)).toBeNull();
    const ahora = new Date('2026-10-01T10:00:00.000Z');

    await guardarCatalogo(db, T1, [producto('a', 5)], ahora);

    expect(await leerActualizacionCatalogo(db, T1)).toBe('2026-10-01T10:00:00.000Z');
    expect(await leerActualizacionCatalogo(db, T2)).toBeNull();
  });
});

describe('creating a sale offline', () => {
  beforeEach(async () => {
    await guardarCatalogo(db, T1, [producto('a', 3, 5), producto('b', 1)]);
  });

  it('queues it as PENDIENTE with a UUID v4, the shown prices and the total, and reserves the stock', async () => {
    const creada = await crearVenta(db, { ...venta('v-a', 2), clienteNombre: ' Ana ', notas: '  ' });

    expect(creada).toMatchObject({
      estado: 'PENDIENTE', intentos: 0, total: 210, clienteNombre: 'Ana', tenantId: T1, usuarioId: U, secuencia: 1,
      items: [{ varianteId: 'v-a', nombre: 'Prenda a', talla: 'M', color: 'Rojo', cantidad: 2, precio: 105 }],
    });
    expect(creada.notas).toBeUndefined();
    expect(creada.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await obtenerVenta(db, creada.id)).toEqual(creada);
    expect(await listarVentas(db, T1)).toHaveLength(1);
    expect(await stockLocal('v-a')).toBe(1);
  });

  it('numbers sales in creation order', async () => {
    const a = await crearVenta(db, venta('v-a', 1));
    const b = await crearVenta(db, venta('v-a', 1));

    expect([a.secuencia, b.secuencia]).toEqual([1, 2]);
  });

  it('refuses a sale the device stock cannot cover and writes nothing', async () => {
    const error = await crearVenta(db, venta('v-a', 4)).catch((e) => e);

    expect(error).toBeInstanceOf(StockLocalInsuficienteError);
    expect(error.items).toEqual([expect.objectContaining({ varianteId: 'v-a', solicitado: 4, disponible: 3 })]);
    expect(await listarVentas(db, T1)).toHaveLength(0);
    expect(await stockLocal('v-a')).toBe(3);
  });

  it('does not let two sales on the same device take the last unit, even when started together', async () => {
    const resultados = await Promise.allSettled([crearVenta(db, venta('v-b', 1)), crearVenta(db, venta('v-b', 1))]);

    expect(resultados.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await listarVentas(db, T1)).toHaveLength(1);
    expect(await stockLocal('v-b')).toBe(0);
  });

  it('is all or nothing when only one of two items is short', async () => {
    const dosItems = { tenantId: T1, usuarioId: U, items: [{ varianteId: 'v-a', cantidad: 1 }, { varianteId: 'v-b', cantidad: 5 }] };

    await expect(crearVenta(db, dosItems)).rejects.toBeInstanceOf(StockLocalInsuficienteError);
    expect(await stockLocal('v-a')).toBe(3);
    expect(await listarVentas(db, T1)).toHaveLength(0);
  });

  it('refuses an item that is not in the snapshot', async () => {
    await expect(crearVenta(db, venta('v-zzz', 1))).rejects.toBeInstanceOf(StockLocalInsuficienteError);
  });
});

describe('retention of the catalog snapshot (S13)', () => {
  const snapshot = new Date('2026-10-01T10:00:00.000Z');

  beforeEach(async () => {
    await guardarCatalogo(db, T1, [producto('a', 5)], snapshot);
  });

  it('refuses a new offline sale when the snapshot is older than the retention limit, writing nothing', async () => {
    const ahora = new Date(snapshot.getTime() + (RETENCION_DIAS + 1) * DIA);

    const error = await crearVenta(db, venta('v-a', 1), { enLinea: false, ahora }).catch((e) => e);

    expect(error).toBeInstanceOf(CatalogoVencidoError);
    expect(error.message).toContain(`${RETENCION_DIAS} días`);
    expect(await listarVentas(db, T1)).toHaveLength(0);
    expect(await stockLocal('v-a')).toBe(5);
  });

  it('accepts an offline sale while the snapshot is still within the limit', async () => {
    const ahora = new Date(snapshot.getTime() + (RETENCION_DIAS - 1) * DIA);

    const creada = await crearVenta(db, venta('v-a', 1), { enLinea: false, ahora });

    expect(creada.creadoEn).toBe(ahora.toISOString());
  });

  it('still sells when online, because the snapshot is renewed by the connection', async () => {
    const ahora = new Date(snapshot.getTime() + (RETENCION_DIAS + 3) * DIA);

    await expect(crearVenta(db, venta('v-a', 1), { enLinea: true, ahora })).resolves.toMatchObject({ estado: 'PENDIENTE' });
  });

  it('refuses an offline sale on a device that never downloaded the snapshot of that store', async () => {
    await expect(crearVenta(db, venta('v-a', 1, T2), { enLinea: false })).rejects.toBeInstanceOf(CatalogoVencidoError);
  });
});

describe('life of a queued sale', () => {
  beforeEach(async () => {
    await guardarCatalogo(db, T1, [producto('a', 5)]);
  });

  it('lists the sales of one store, oldest first', async () => {
    const primera = await crearVenta(db, venta('v-a', 1));
    await guardarCatalogo(db, T2, [producto('b', 5)]);
    await crearVenta(db, venta('v-b', 1, T2));
    const segunda = await crearVenta(db, venta('v-a', 1));

    expect((await listarVentas(db, T1)).map((v) => v.id)).toEqual([primera.id, segunda.id]);
  });

  it('marks it syncing (counting the attempt), then synced with the order number', async () => {
    const creada = await crearVenta(db, venta('v-a', 1));

    expect(await marcarSincronizando(db, creada.id)).toMatchObject({ estado: 'SINCRONIZANDO', intentos: 1 });
    expect(await marcarSincronizada(db, creada.id, { ordenId: 'o1', ordenNro: 'NV-2026-00009' })).toMatchObject({
      estado: 'SINCRONIZADA', ordenNro: 'NV-2026-00009', ordenId: 'o1', sincronizadaEn: expect.any(String),
    });
    expect(await obtenerVenta(db, creada.id)).toMatchObject({ estado: 'SINCRONIZADA', ordenNro: 'NV-2026-00009' });
  });

  it('records a stock conflict with what the server said, and returns it to the queue on retry', async () => {
    const creada = await crearVenta(db, venta('v-a', 2));
    const conflicto = [{ varianteId: 'v-a', nombre: 'Prenda a', solicitado: 2, disponible: 0 }];

    expect(await marcarConflicto(db, creada.id, conflicto)).toMatchObject({ estado: 'CONFLICTO', conflicto });
    expect((await listarVentas(db, T1))[0]).toMatchObject({ estado: 'CONFLICTO', conflicto });
    expect(await reintentarVenta(db, creada.id)).toMatchObject({ estado: 'PENDIENTE', conflicto: undefined });
    expect(await stockLocal('v-a')).toBe(3);
  });

  it('records a definitive error with its message and a transient failure back in the queue', async () => {
    const creada = await crearVenta(db, venta('v-a', 1));

    expect(await marcarError(db, creada.id, 'rechazada')).toMatchObject({ estado: 'ERROR', ultimoError: 'rechazada' });
    expect(await volverACola(db, creada.id, 'sin red')).toMatchObject({ estado: 'PENDIENTE', ultimoError: 'sin red' });
  });

  it('puts the sales an interrupted sync left syncing back in the queue', async () => {
    const creada = await crearVenta(db, venta('v-a', 1));
    await marcarSincronizando(db, creada.id);

    await recuperarInterrumpidas(db);

    expect((await listarVentas(db, T1))[0]).toMatchObject({ id: creada.id, estado: 'PENDIENTE' });
  });

  it('cancelling releases the reserved stock', async () => {
    const creada = await crearVenta(db, venta('v-a', 2));
    await cancelarVenta(db, creada.id);

    expect(await listarVentas(db, T1)).toHaveLength(0);
    expect(await stockLocal('v-a')).toBe(5);
  });

  it('does not cancel a sale that is syncing or already synced', async () => {
    const enCurso = await crearVenta(db, venta('v-a', 1));
    await marcarSincronizando(db, enCurso.id);
    await expect(cancelarVenta(db, enCurso.id)).rejects.toThrow();

    await marcarSincronizada(db, enCurso.id, { ordenId: 'o', ordenNro: 'NV' });
    await expect(cancelarVenta(db, enCurso.id)).rejects.toThrow();
    expect(await listarVentas(db, T1)).toHaveLength(1);
    expect(await stockLocal('v-a')).toBe(4);
  });

  it('changing the items of a conflicted sale recalculates total and stock, gives it a new id and queues it', async () => {
    const creada = await crearVenta(db, venta('v-a', 4));
    await marcarConflicto(db, creada.id, [{ varianteId: 'v-a', nombre: 'Prenda a', solicitado: 4, disponible: 1 }]);

    const ajustada = await reemplazarItems(db, creada.id, [{ varianteId: 'v-a', cantidad: 1 }]);

    expect(ajustada).toMatchObject({ estado: 'PENDIENTE', total: 100, conflicto: undefined, intentos: 0 });
    expect(ajustada!.id).not.toBe(creada.id);
    expect(ajustada!.items).toEqual([expect.objectContaining({ varianteId: 'v-a', cantidad: 1 })]);
    expect(await obtenerVenta(db, creada.id)).toBeUndefined();
    expect(await listarVentas(db, T1)).toHaveLength(1);
    expect(await stockLocal('v-a')).toBe(4);
  });

  it('keeps the original sale untouched when the replacement cannot be reserved', async () => {
    const creada = await crearVenta(db, venta('v-a', 4));
    await marcarConflicto(db, creada.id, []);

    await expect(reemplazarItems(db, creada.id, [{ varianteId: 'v-a', cantidad: 9 }])).rejects.toBeInstanceOf(
      StockLocalInsuficienteError,
    );

    expect(await obtenerVenta(db, creada.id)).toMatchObject({ estado: 'CONFLICTO' });
    expect(await stockLocal('v-a')).toBe(1);
  });

  it('refuses to modify a sale that is not in conflict or error', async () => {
    const creada = await crearVenta(db, venta('v-a', 1));

    await expect(reemplazarItems(db, creada.id, [])).rejects.toThrow();
    expect(await obtenerVenta(db, creada.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('removes the sale when every item is taken out of it', async () => {
    const creada = await crearVenta(db, venta('v-a', 2));
    await marcarConflicto(db, creada.id, []);

    expect(await reemplazarItems(db, creada.id, [])).toBeNull();
    expect(await listarVentas(db, T1)).toHaveLength(0);
    expect(await stockLocal('v-a')).toBe(5);
  });

  it('counts the queue by state', async () => {
    const a = await crearVenta(db, venta('v-a', 1));
    await crearVenta(db, venta('v-a', 1));
    await marcarConflicto(db, a.id, []);

    expect(await resumenCola(db, T1)).toEqual({ PENDIENTE: 1, SINCRONIZANDO: 0, SINCRONIZADA: 0, CONFLICTO: 1, ERROR: 0 });
  });
});

describe('clearing synced sales', () => {
  it('removes only the synced ones of the store and keeps the rest', async () => {
    await guardarCatalogo(db, T1, [producto('a', 9)]);
    const hecha = await crearVenta(db, venta('v-a', 1));
    const pendiente = await crearVenta(db, venta('v-a', 1));
    await marcarSincronizada(db, hecha.id, { ordenId: 'o', ordenNro: 'NV-1' });

    expect(await borrarSincronizadas(db, T1)).toBe(1);
    expect((await listarVentas(db, T1)).map((v) => v.id)).toEqual([pendiente.id]);
  });
});

describe('uuidV4', () => {
  it('produces version 4 identifiers that do not repeat', () => {
    const ids = new Set(Array.from({ length: 50 }, uuidV4));

    expect(ids.size).toBe(50);
    expect([...ids][0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
