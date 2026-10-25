import { beforeEach, describe, expect, it } from 'vitest';
import { cerrarDb, uuidV4 } from '../services/posDb';
import {
  StockLocalInsuficienteError,
  cancelarVenta,
  crearVenta,
  guardarCatalogo,
  leerCatalogo,
  listarVentas,
  marcarConflicto,
  marcarSincronizada,
  marcarSincronizando,
  recuperarInterrumpidas,
  reemplazarItems,
  reintentarVenta,
} from '../services/ventasLocales';

const T1 = 'tenant-aura';
const T2 = 'tenant-luna';
const U = 'user-1';

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

const stockLocal = async (varianteId: string, tenantId = T1) =>
  (await leerCatalogo(tenantId)).find((v) => v.varianteId === varianteId)?.stockLocal;

beforeEach(async () => {
  await cerrarDb();
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase('aura-pos');
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});

describe('catalog snapshot', () => {
  it('keeps name, size, color and the current price (base + extra) of every variant', async () => {
    await guardarCatalogo(T1, [producto('a', 5, 15)]);

    expect(await leerCatalogo(T1)).toEqual([
      expect.objectContaining({
        varianteId: 'v-a', nombre: 'Prenda a', talla: 'M', color: 'Rojo', precio: 115, stockServidor: 5, stockLocal: 5,
        categoria: 'Vestidos', imagen: '/img/a.png',
      }),
    ]);
  });

  it('keeps each store apart', async () => {
    await guardarCatalogo(T1, [producto('a', 5)]);
    await guardarCatalogo(T2, [producto('b', 2)]);

    expect((await leerCatalogo(T1)).map((v) => v.varianteId)).toEqual(['v-a']);
    expect((await leerCatalogo(T2)).map((v) => v.varianteId)).toEqual(['v-b']);
  });

  it('drops variants the server no longer lists when the snapshot is renewed', async () => {
    await guardarCatalogo(T1, [producto('a', 5), producto('b', 5)]);
    await guardarCatalogo(T1, [producto('a', 5)]);

    expect((await leerCatalogo(T1)).map((v) => v.varianteId)).toEqual(['v-a']);
  });

  it('subtracts the sales not synced yet from the fresh server stock, but not the synced ones', async () => {
    await guardarCatalogo(T1, [producto('a', 10)]);
    const pendiente = await crearVenta(venta('v-a', 2));
    const hecha = await crearVenta(venta('v-a', 3));
    await marcarSincronizada(hecha.id, { ordenId: 'o1', ordenNro: 'NV-1' });

    await guardarCatalogo(T1, [producto('a', 7)]); // server already counts the synced sale: 10 - 3

    expect(await stockLocal('v-a')).toBe(5); // 7 - the pending 2
    expect(pendiente.estado).toBe('PENDIENTE');
  });
});

describe('creating a sale offline', () => {
  beforeEach(async () => {
    await guardarCatalogo(T1, [producto('a', 3, 5), producto('b', 1)]);
  });

  it('queues it as PENDIENTE with a UUID v4, the shown prices and the total, and reserves the stock', async () => {
    const creada = await crearVenta({ ...venta('v-a', 2), clienteNombre: 'Ana' });

    expect(creada).toMatchObject({
      estado: 'PENDIENTE', intentos: 0, total: 210, clienteNombre: 'Ana', tenantId: T1, usuarioId: U,
      items: [{ varianteId: 'v-a', nombre: 'Prenda a', talla: 'M', color: 'Rojo', cantidad: 2, precio: 105 }],
    });
    expect(creada.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await listarVentas(T1)).toHaveLength(1);
    expect(await stockLocal('v-a')).toBe(1);
  });

  it('refuses a sale the device stock cannot cover and writes nothing', async () => {
    const error = await crearVenta(venta('v-a', 4)).catch((e) => e);

    expect(error).toBeInstanceOf(StockLocalInsuficienteError);
    expect(error.items).toEqual([expect.objectContaining({ varianteId: 'v-a', solicitado: 4, disponible: 3 })]);
    expect(await listarVentas(T1)).toHaveLength(0);
    expect(await stockLocal('v-a')).toBe(3);
  });

  it('does not let two sales on the same device take the last unit', async () => {
    await crearVenta(venta('v-b', 1));

    await expect(crearVenta(venta('v-b', 1))).rejects.toBeInstanceOf(StockLocalInsuficienteError);
    expect(await stockLocal('v-b')).toBe(0);
  });

  it('is all or nothing when only one of two items is short', async () => {
    const dosItems = { tenantId: T1, usuarioId: U, items: [{ varianteId: 'v-a', cantidad: 1 }, { varianteId: 'v-b', cantidad: 5 }] };

    await expect(crearVenta(dosItems)).rejects.toBeInstanceOf(StockLocalInsuficienteError);
    expect(await stockLocal('v-a')).toBe(3);
  });

  it('refuses an item that is not in the snapshot', async () => {
    await expect(crearVenta(venta('v-zzz', 1))).rejects.toBeInstanceOf(StockLocalInsuficienteError);
  });
});

describe('life of a queued sale', () => {
  beforeEach(async () => {
    await guardarCatalogo(T1, [producto('a', 5)]);
  });

  it('lists the sales of one store, oldest first', async () => {
    const primera = await crearVenta(venta('v-a', 1));
    await guardarCatalogo(T2, [producto('b', 5)]);
    await crearVenta(venta('v-b', 1, T2));
    const segunda = await crearVenta(venta('v-a', 1));

    expect((await listarVentas(T1)).map((v) => v.id)).toEqual([primera.id, segunda.id]);
  });

  it('marks it syncing (counting the attempt), then synced with the order number', async () => {
    const creada = await crearVenta(venta('v-a', 1));

    expect(await marcarSincronizando(creada.id)).toMatchObject({ estado: 'SINCRONIZANDO', intentos: 1 });
    expect(await marcarSincronizada(creada.id, { ordenId: 'o1', ordenNro: 'NV-2026-00009' })).toMatchObject({
      estado: 'SINCRONIZADA', ordenNro: 'NV-2026-00009', ordenId: 'o1', sincronizadaEn: expect.any(String),
    });
  });

  it('records a stock conflict with what the server said, and returns it to the queue on retry', async () => {
    const creada = await crearVenta(venta('v-a', 2));
    const conflicto = [{ varianteId: 'v-a', nombre: 'Prenda a', solicitado: 2, disponible: 0 }];

    expect(await marcarConflicto(creada.id, conflicto)).toMatchObject({ estado: 'CONFLICTO', conflicto });
    expect(await reintentarVenta(creada.id)).toMatchObject({ estado: 'PENDIENTE', conflicto: undefined });
  });

  it('puts the sales a closed tab left syncing back in the queue', async () => {
    const creada = await crearVenta(venta('v-a', 1));
    await marcarSincronizando(creada.id);

    await recuperarInterrumpidas();

    expect((await listarVentas(T1))[0]).toMatchObject({ id: creada.id, estado: 'PENDIENTE' });
  });

  it('cancelling releases the reserved stock', async () => {
    const creada = await crearVenta(venta('v-a', 2));
    await cancelarVenta(creada.id);

    expect(await listarVentas(T1)).toHaveLength(0);
    expect(await stockLocal('v-a')).toBe(5);
  });

  it('does not cancel a sale that is syncing or already synced', async () => {
    const enCurso = await crearVenta(venta('v-a', 1));
    await marcarSincronizando(enCurso.id);
    await expect(cancelarVenta(enCurso.id)).rejects.toThrow();

    await marcarSincronizada(enCurso.id, { ordenId: 'o', ordenNro: 'NV' });
    await expect(cancelarVenta(enCurso.id)).rejects.toThrow();
    expect(await listarVentas(T1)).toHaveLength(1);
  });

  it('changing the items of a conflicted sale recalculates total and stock and sends it back to the queue', async () => {
    const creada = await crearVenta(venta('v-a', 4));
    await marcarConflicto(creada.id, [{ varianteId: 'v-a', nombre: 'Prenda a', solicitado: 4, disponible: 1 }]);

    const ajustada = await reemplazarItems(creada.id, [{ varianteId: 'v-a', cantidad: 1 }]);

    expect(ajustada).toMatchObject({ estado: 'PENDIENTE', total: 100, conflicto: undefined });
    expect(ajustada!.items).toEqual([expect.objectContaining({ varianteId: 'v-a', cantidad: 1 })]);
    expect(await stockLocal('v-a')).toBe(4);
  });

  it('removes the sale when every item is taken out of it', async () => {
    const creada = await crearVenta(venta('v-a', 2));
    await marcarConflicto(creada.id, []);

    expect(await reemplazarItems(creada.id, [])).toBeNull();
    expect(await listarVentas(T1)).toHaveLength(0);
    expect(await stockLocal('v-a')).toBe(5);
  });
});

describe('uuidV4', () => {
  it('produces version 4 identifiers that do not repeat', () => {
    const ids = new Set(Array.from({ length: 50 }, uuidV4));

    expect(ids.size).toBe(50);
    expect([...ids][0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
