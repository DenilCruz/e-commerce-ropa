import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cerrarDb } from '../services/posDb';
import { crearVenta, guardarCatalogo, listarVentas, marcarConflicto, obtenerVenta } from '../services/ventasLocales';
import { esperaReintento, sincronizar } from '../services/sincronizador';

const T = 'tenant-aura';
const U = 'user-1';
const sesion = { tenantId: T, usuarioId: U };

const producto = (id: string, stock: number) => ({
  id: `p-${id}`, nombre: `Prenda ${id}`, precio: 100,
  variantes: [{ id: `v-${id}`, sku: id, stock, talla: { nombre: 'M' }, color: { nombre: 'Rojo' } }],
});
const vender = (varianteId: string, cantidad = 1, extra: object = {}) =>
  crearVenta({ tenantId: T, usuarioId: U, items: [{ varianteId, cantidad }], ...extra });

const ok = (n: number) => ({ ordenId: `o${n}`, nroOrden: `NV-${n}` });
const falla = (status: number, data: unknown = {}) => ({ response: { status, data }, message: `HTTP ${status}` });
const sinRed = () => ({ request: {}, message: 'Network Error' });

beforeEach(async () => {
  await cerrarDb();
  await new Promise<void>((resolve) => {
    const r = indexedDB.deleteDatabase('aura-pos');
    r.onsuccess = () => resolve();
  });
  await guardarCatalogo(T, [producto('a', 20), producto('b', 20)]);
});

describe('sincronizar', () => {
  it('sends the pending sales in the order they were made, each with its own id as key', async () => {
    const primera = await vender('v-a', 2, { clienteNombre: 'Ana' });
    const segunda = await vender('v-b');
    const enviar = vi.fn().mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(2));

    const resultado = await sincronizar(sesion, enviar);

    expect(enviar.mock.calls.map(([v]) => v.id)).toEqual([primera.id, segunda.id]);
    expect(resultado).toMatchObject({ sincronizadas: 2, conflictos: 0, errores: 0, interrumpida: false });
    expect(await obtenerVenta(primera.id)).toMatchObject({ estado: 'SINCRONIZADA', ordenNro: 'NV-1', intentos: 1 });
  });

  it('does not send anything when the queue is empty', async () => {
    const enviar = vi.fn();

    expect(await sincronizar(sesion, enviar)).toMatchObject({ sincronizadas: 0, interrumpida: false });
    expect(enviar).not.toHaveBeenCalled();
  });

  it('keeps the sale and stops the run when there is no network, so the order is not broken', async () => {
    const primera = await vender('v-a');
    const segunda = await vender('v-b');
    const enviar = vi.fn().mockRejectedValue(sinRed());

    const resultado = await sincronizar(sesion, enviar);

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(resultado).toMatchObject({ interrumpida: true, motivo: 'RED', sincronizadas: 0 });
    expect(await obtenerVenta(primera.id)).toMatchObject({ estado: 'PENDIENTE', ultimoError: 'Network Error' });
    expect(await obtenerVenta(segunda.id)).toMatchObject({ estado: 'PENDIENTE', intentos: 0 });
  });

  it('keeps the sale and stops the run on a server error (5xx)', async () => {
    const venta = await vender('v-a');
    await vender('v-b');
    const enviar = vi.fn().mockRejectedValue(falla(503));

    expect(await sincronizar(sesion, enviar)).toMatchObject({ interrumpida: true, motivo: 'SERVIDOR' });
    expect(await obtenerVenta(venta.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('stops the run when the session expired and keeps everything pending', async () => {
    const venta = await vender('v-a');
    const enviar = vi.fn().mockRejectedValue(falla(401));

    expect(await sincronizar(sesion, enviar)).toMatchObject({ interrumpida: true, motivo: 'SESION' });
    expect(await obtenerVenta(venta.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('records a stock conflict as CONFLICTO with the server detail and goes on with the next sale', async () => {
    const sinStock = await vender('v-a', 2);
    const buena = await vender('v-b');
    const items = [{ varianteId: 'v-a', nombre: 'Prenda a', solicitado: 2, disponible: 0 }];
    const enviar = vi.fn().mockRejectedValueOnce(falla(409, { codigo: 'STOCK_CONFLICT', items })).mockResolvedValueOnce(ok(2));

    const resultado = await sincronizar(sesion, enviar);

    expect(resultado).toMatchObject({ conflictos: 1, sincronizadas: 1, interrumpida: false });
    expect(await obtenerVenta(sinStock.id)).toMatchObject({ estado: 'CONFLICTO', conflicto: items });
    expect(await obtenerVenta(buena.id)).toMatchObject({ estado: 'SINCRONIZADA' });
  });

  it('treats "same key still running" (409 without a stock code) as something to retry, not a conflict', async () => {
    const venta = await vender('v-a');
    const enviar = vi.fn().mockRejectedValue(falla(409, { message: 'sigue en proceso' }));

    const resultado = await sincronizar(sesion, enviar);

    expect(resultado).toMatchObject({ conflictos: 0, pendientes: 1 });
    expect(await obtenerVenta(venta.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('marks ERROR a sale the server refuses for good (4xx) and goes on', async () => {
    const mala = await vender('v-a');
    await vender('v-b');
    const enviar = vi.fn().mockRejectedValueOnce(falla(422, { message: 'Esta Idempotency-Key ya se usó' })).mockResolvedValueOnce(ok(2));

    const resultado = await sincronizar(sesion, enviar);

    expect(resultado).toMatchObject({ errores: 1, sincronizadas: 1 });
    expect(await obtenerVenta(mala.id)).toMatchObject({ estado: 'ERROR', ultimoError: 'Esta Idempotency-Key ya se usó' });
  });

  it('leaves conflicted and failed sales alone until the seller retries them', async () => {
    const venta = await vender('v-a');
    await marcarConflicto(venta.id, []);
    const enviar = vi.fn();

    await sincronizar(sesion, enviar);

    expect(enviar).not.toHaveBeenCalled();
  });

  it('only sends the sales of the active store and user', async () => {
    await guardarCatalogo('tenant-luna', [producto('z', 5)]);
    await crearVenta({ tenantId: 'tenant-luna', usuarioId: U, items: [{ varianteId: 'v-z', cantidad: 1 }] });
    const ajena = await crearVenta({ tenantId: T, usuarioId: 'otro-vendedor', items: [{ varianteId: 'v-a', cantidad: 1 }] });
    const propia = await vender('v-b');
    const enviar = vi.fn().mockResolvedValue(ok(1));

    const resultado = await sincronizar(sesion, enviar);

    expect(enviar.mock.calls.map(([v]) => v.id)).toEqual([propia.id]);
    expect(resultado.ajenas).toBe(1);
    expect(await obtenerVenta(ajena.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('never runs two syncs at the same time, so a sale is not sent twice', async () => {
    await vender('v-a');
    let liberar!: () => void;
    const enviar = vi.fn().mockImplementation(() => new Promise((resolve) => (liberar = () => resolve(ok(1)))));

    const primera = sincronizar(sesion, enviar);
    await vi.waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    const segunda = await sincronizar(sesion, enviar);
    liberar();
    await primera;

    expect(segunda.omitida).toBe(true);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('puts back in the queue what a closed tab left syncing, then sends it with the same key', async () => {
    const venta = await vender('v-a');
    const enviar = vi.fn().mockResolvedValue(ok(1));
    await obtenerVenta(venta.id);
    const { marcarSincronizando } = await import('../services/ventasLocales');
    await marcarSincronizando(venta.id); // the tab died here

    await sincronizar(sesion, enviar);

    expect(enviar.mock.calls[0][0].id).toBe(venta.id);
    expect((await listarVentas(T))[0].estado).toBe('SINCRONIZADA');
  });
});

describe('esperaReintento', () => {
  it('waits longer after each consecutive failure up to a cap', () => {
    expect([0, 1, 2, 3, 4, 10].map(esperaReintento)).toEqual([5000, 10000, 20000, 40000, 60000, 60000]);
  });
});
