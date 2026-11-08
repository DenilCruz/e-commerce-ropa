import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Db, migrar } from '../db';
import { crearClienteLocal, crearProductoLocal, listarClientesLocales, listarProductosLocales, reintentarRegistro } from '../colasLocales';
import { crearEnviarVenta } from '../enviarVenta';
import { esperaReintento, sincronizar } from '../sincronizador';
import {
  crearVenta,
  guardarCatalogo,
  listarVentas,
  marcarConflicto,
  marcarSincronizando,
  leerCatalogo,
  obtenerVenta,
} from '../ventasLocales';
import { crearDbNode } from './dbNode';

const T = 'tenant-aura';
const U = 'user-1';
const sesion = { tenantId: T, usuarioId: U };

const producto = (id: string, stock: number) => ({
  id: `p-${id}`, nombre: `Prenda ${id}`, precio: 100,
  variantes: [{ id: `v-${id}`, sku: id, stock, talla: { nombre: 'M' }, color: { nombre: 'Rojo' } }],
});

const ok = (n: number) => ({ ordenId: `o${n}`, nroOrden: `NV-${n}` });
const falla = (status: number, data: unknown = {}) => ({ response: { status, data }, message: `HTTP ${status}` });
const sinRed = () => ({ request: {}, message: 'Network Error' });

let db: Db;
const vender = (varianteId: string, cantidad = 1, extra: object = {}) =>
  crearVenta(db, { tenantId: T, usuarioId: U, items: [{ varianteId, cantidad }], ...extra });

beforeEach(async () => {
  db = crearDbNode();
  await migrar(db);
  await guardarCatalogo(db, T, [producto('a', 20), producto('b', 20)]);
});

describe('sincronizar', () => {
  it('sends the pending sales in the order they were made, each with its own id as key', async () => {
    const primera = await vender('v-a', 2, { clienteNombre: 'Ana' });
    const segunda = await vender('v-b');
    const enviar = vi.fn().mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(2));

    const resultado = await sincronizar(db, sesion, enviar);

    expect(enviar.mock.calls.map(([v]) => v.id)).toEqual([primera.id, segunda.id]);
    expect(resultado).toMatchObject({ sincronizadas: 2, conflictos: 0, errores: 0, pendientes: 0, interrumpida: false });
    expect(await obtenerVenta(db, primera.id)).toMatchObject({ estado: 'SINCRONIZADA', ordenNro: 'NV-1', intentos: 1 });
  });

  it('does not send anything when the queue is empty', async () => {
    const enviar = vi.fn();

    expect(await sincronizar(db, sesion, enviar)).toMatchObject({ sincronizadas: 0, interrumpida: false });
    expect(enviar).not.toHaveBeenCalled();
  });

  it('keeps the sale and stops the run when there is no network, so the order is not broken', async () => {
    const primera = await vender('v-a');
    const segunda = await vender('v-b');
    const enviar = vi.fn().mockRejectedValue(sinRed());

    const resultado = await sincronizar(db, sesion, enviar);

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(resultado).toMatchObject({ interrumpida: true, motivo: 'RED', sincronizadas: 0, pendientes: 2 });
    expect(await obtenerVenta(db, primera.id)).toMatchObject({ estado: 'PENDIENTE', ultimoError: 'Network Error' });
    expect(await obtenerVenta(db, segunda.id)).toMatchObject({ estado: 'PENDIENTE', intentos: 0 });
  });

  it('keeps the sale and stops the run on a server error (5xx)', async () => {
    const venta = await vender('v-a');
    await vender('v-b');
    const enviar = vi.fn().mockRejectedValue(falla(503));

    expect(await sincronizar(db, sesion, enviar)).toMatchObject({ interrumpida: true, motivo: 'SERVIDOR' });
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(await obtenerVenta(db, venta.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('stops the run when the session expired and keeps everything pending', async () => {
    const venta = await vender('v-a');
    const enviar = vi.fn().mockRejectedValue(falla(401));

    expect(await sincronizar(db, sesion, enviar)).toMatchObject({ interrumpida: true, motivo: 'SESION' });
    expect(await obtenerVenta(db, venta.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('records a stock conflict as CONFLICTO with the server detail and goes on with the next sale', async () => {
    const sinStock = await vender('v-a', 2);
    const buena = await vender('v-b');
    const items = [{ varianteId: 'v-a', nombre: 'Prenda a', solicitado: 2, disponible: 0 }];
    const enviar = vi.fn().mockRejectedValueOnce(falla(409, { codigo: 'STOCK_CONFLICT', items })).mockResolvedValueOnce(ok(2));

    const resultado = await sincronizar(db, sesion, enviar);

    expect(resultado).toMatchObject({ conflictos: 1, sincronizadas: 1, interrumpida: false });
    expect(await obtenerVenta(db, sinStock.id)).toMatchObject({ estado: 'CONFLICTO', conflicto: items });
    expect(await obtenerVenta(db, buena.id)).toMatchObject({ estado: 'SINCRONIZADA' });
  });

  it('treats "same key still running" (409 without a stock code) as something to retry, not a conflict', async () => {
    const venta = await vender('v-a');
    const enviar = vi.fn().mockRejectedValue(falla(409, { message: 'sigue en proceso' }));

    const resultado = await sincronizar(db, sesion, enviar);

    expect(resultado).toMatchObject({ conflictos: 0, pendientes: 1, interrumpida: false });
    expect(await obtenerVenta(db, venta.id)).toMatchObject({ estado: 'PENDIENTE', ultimoError: 'sigue en proceso' });
  });

  it.each([408, 429])('retries on %i without stopping the run', async (status) => {
    const venta = await vender('v-a');
    const enviar = vi.fn().mockRejectedValue(falla(status));

    expect(await sincronizar(db, sesion, enviar)).toMatchObject({ pendientes: 1, interrumpida: false, errores: 0 });
    expect(await obtenerVenta(db, venta.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('marks ERROR a sale the server refuses for good (4xx) and goes on', async () => {
    const mala = await vender('v-a');
    await vender('v-b');
    const enviar = vi.fn().mockRejectedValueOnce(falla(422, { message: 'Esta Idempotency-Key ya se usó' })).mockResolvedValueOnce(ok(2));

    const resultado = await sincronizar(db, sesion, enviar);

    expect(resultado).toMatchObject({ errores: 1, sincronizadas: 1 });
    expect(await obtenerVenta(db, mala.id)).toMatchObject({ estado: 'ERROR', ultimoError: 'Esta Idempotency-Key ya se usó' });
  });

  it('leaves conflicted and failed sales alone until the seller retries them', async () => {
    const venta = await vender('v-a');
    await marcarConflicto(db, venta.id, []);
    const enviar = vi.fn();

    await sincronizar(db, sesion, enviar);

    expect(enviar).not.toHaveBeenCalled();
  });

  it('only sends the sales of the active store and user', async () => {
    await guardarCatalogo(db, 'tenant-luna', [producto('z', 5)]);
    await crearVenta(db, { tenantId: 'tenant-luna', usuarioId: U, items: [{ varianteId: 'v-z', cantidad: 1 }] });
    const ajena = await crearVenta(db, { tenantId: T, usuarioId: 'otro-vendedor', items: [{ varianteId: 'v-a', cantidad: 1 }] });
    const propia = await vender('v-b');
    const enviar = vi.fn().mockResolvedValue(ok(1));

    const resultado = await sincronizar(db, sesion, enviar);

    expect(enviar.mock.calls.map(([v]) => v.id)).toEqual([propia.id]);
    expect(resultado.ajenas).toBe(1);
    expect(await obtenerVenta(db, ajena.id)).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('never runs two syncs at the same time, so a sale is not sent twice', async () => {
    await vender('v-a');
    let liberar!: () => void;
    const enviar = vi.fn().mockImplementation(() => new Promise((resolve) => (liberar = () => resolve(ok(1)))));

    const primera = sincronizar(db, sesion, enviar);
    await vi.waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    const segunda = await sincronizar(db, sesion, enviar);
    liberar();
    await primera;

    expect(segunda.omitida).toBe(true);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('releases the lock after a run so the next one can start', async () => {
    await vender('v-a');
    await sincronizar(db, sesion, vi.fn().mockRejectedValue(sinRed()));

    const enviar = vi.fn().mockResolvedValue(ok(1));
    const r = await sincronizar(db, sesion, enviar);

    expect(r.omitida).toBe(false);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('puts back in the queue what an interrupted run left syncing, then sends it with the same key', async () => {
    const venta = await vender('v-a');
    const enviar = vi.fn().mockResolvedValue(ok(1));
    await marcarSincronizando(db, venta.id); // the app died here

    await sincronizar(db, sesion, enviar);

    expect(enviar.mock.calls[0][0].id).toBe(venta.id);
    expect((await listarVentas(db, T))[0].estado).toBe('SINCRONIZADA');
  });

  it('still sends a sale older than the retention limit instead of dropping it', async () => {
    const vieja = await vender('v-a');
    await db.runAsync(
      'UPDATE ventas SET datos = ? WHERE id = ?',
      [JSON.stringify({ ...vieja, creadoEn: '2020-01-01T00:00:00.000Z' }), vieja.id],
    );
    const enviar = vi.fn().mockResolvedValue(ok(1));

    await sincronizar(db, sesion, enviar);

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(await obtenerVenta(db, vieja.id)).toMatchObject({ estado: 'SINCRONIZADA' });
  });
});

describe('customer and product queues', () => {
  const altaProducto = () =>
    crearProductoLocal(db, {
      tenantId: T, usuarioId: U, nombre: 'Polo', precio: 40,
      categoriaId: '11111111-1111-4111-8111-111111111111', sku: 'POLO-1', stockInicial: 4,
    });

  it('shows the product in the local catalog at once, then sends customers, products and sales in that order', async () => {
    const clienteLocal = await crearClienteLocal(db, { tenantId: T, usuarioId: U, nombre: 'Ana' });
    const producto = await altaProducto();
    expect((await leerCatalogo(db, T)).find((v) => v.varianteId === producto.varianteId)?.stockLocal).toBe(4);
    const venta = await vender(producto.varianteId, 1);
    const orden: string[] = [];
    const cliente = vi.fn(async () => { orden.push('cliente'); });
    const productoEnv = vi.fn(async () => { orden.push('producto'); });
    const enviar = vi.fn(async () => { orden.push('venta'); return ok(1); });

    const resultado = await sincronizar(db, sesion, enviar, { cliente, producto: productoEnv });

    expect(orden).toEqual(['cliente', 'producto', 'venta']);
    expect(resultado).toMatchObject({ sincronizadas: 3, interrumpida: false });
    expect(await obtenerVenta(db, venta.id)).toMatchObject({ estado: 'SINCRONIZADA' });
    expect(clienteLocal.id).toBe((await listarClientesLocales(db, T))[0].id);
  });

  it('stops products and sales when the customer request fails for the network, a 5xx or a 401', async () => {
    await crearClienteLocal(db, { tenantId: T, usuarioId: U, nombre: 'Ana' });
    await altaProducto();
    await vender('v-a');
    const producto = vi.fn();
    const enviar = vi.fn().mockResolvedValue(ok(1));

    const red = await sincronizar(db, sesion, enviar, {
      cliente: vi.fn().mockRejectedValue(sinRed()),
      producto,
    });
    const servidor = await sincronizar(db, sesion, enviar, {
      cliente: vi.fn().mockRejectedValue(falla(503, { message: 'no disponible' })),
      producto,
    });
    const sesionCaida = await sincronizar(db, sesion, enviar, {
      cliente: vi.fn().mockRejectedValue(falla(401, { message: 'unauthorized' })),
      producto,
    });

    expect(red).toMatchObject({ interrumpida: true, motivo: 'RED' });
    expect(servidor).toMatchObject({ interrumpida: true, motivo: 'SERVIDOR' });
    expect(sesionCaida).toMatchObject({ interrumpida: true, motivo: 'SESION' });
    expect(producto).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
    expect((await listarClientesLocales(db, T))[0]).toMatchObject({ estado: 'PENDIENTE' });
  });

  it('records CLIENTE_DUPLICADO and SKU_DUPLICADO as CONFLICTO, and 422 or LIMITE_PLAN as ERROR, then continues', async () => {
    const clienteLocal = await crearClienteLocal(db, { tenantId: T, usuarioId: U, nombre: 'Ana', ci: '123' });
    const producto = await altaProducto();
    const venta = await vender('v-a');
    await sincronizar(db, sesion, vi.fn().mockResolvedValue(ok(1)), {
      cliente: vi.fn().mockRejectedValue(falla(422, { message: 'El CI no es válido' })),
      producto: vi.fn().mockRejectedValue(falla(403, { codigo: 'LIMITE_PLAN', message: 'Tu plan alcanzó el límite de productos.' })),
    });
    expect(await listarClientesLocales(db, T)).toMatchObject([{ id: clienteLocal.id, estado: 'ERROR', ultimoError: 'El CI no es válido' }]);
    expect(await listarProductosLocales(db, T)).toMatchObject([{ id: producto.id, estado: 'ERROR', ultimoError: 'Tu plan alcanzó el límite de productos.' }]);
    expect(await obtenerVenta(db, venta.id)).toMatchObject({ estado: 'SINCRONIZADA' });

    await reintentarRegistro(db, 'clientes', clienteLocal.id);
    await reintentarRegistro(db, 'productos', producto.id);
    await sincronizar(db, sesion, vi.fn(), {
      cliente: vi.fn().mockRejectedValue(falla(409, { codigo: 'CLIENTE_DUPLICADO', existente: { id: 'existente', nombre: 'Ana Ruiz', ci: '123' } })),
      producto: vi.fn().mockRejectedValue(falla(409, { codigo: 'SKU_DUPLICADO', items: [{ sku: 'POLO-1', varianteId: 'v-srv', productoId: 'p-srv' }] })),
    });
    expect((await listarClientesLocales(db, T))[0]).toMatchObject({
      estado: 'CONFLICTO',
      conflicto: { existente: { id: 'existente', nombre: 'Ana Ruiz' } },
    });
    expect((await listarProductosLocales(db, T))[0]).toMatchObject({
      estado: 'CONFLICTO',
      conflicto: { items: [{ sku: 'POLO-1' }] },
    });
  });
});

describe('esperaReintento', () => {
  it('waits longer after each consecutive failure up to a cap', () => {
    expect([0, 1, 2, 3, 4, 10].map(esperaReintento)).toEqual([5000, 10000, 20000, 40000, 60000, 60000]);
  });
});

describe('crearEnviarVenta', () => {
  it('posts the items, device date and optional fields with the sale id as Idempotency-Key', async () => {
    const venta = await vender('v-a', 2, { clienteNombre: 'Ana', notas: 'regalo' });
    const post = vi.fn().mockResolvedValue({ data: { ordenId: 'o9', nroOrden: 'NV-9', total: 200 } });

    const orden = await crearEnviarVenta({ post })(venta);

    expect(post).toHaveBeenCalledWith(
      '/sales/pos',
      { items: [{ varianteId: 'v-a', cantidad: 2 }], clienteNombre: 'Ana', notas: 'regalo', vendidoEn: venta.creadoEn },
      { headers: { 'Idempotency-Key': venta.id } },
    );
    expect(orden).toEqual({ ordenId: 'o9', nroOrden: 'NV-9' });
  });

  it('reads the order from a wrapped { data } body too', async () => {
    const venta = await vender('v-a');
    const post = vi.fn().mockResolvedValue({ data: { data: { ordenId: 'o1', nroOrden: 'NV-1' } } });

    expect(await crearEnviarVenta({ post })(venta)).toEqual({ ordenId: 'o1', nroOrden: 'NV-1' });
  });
});
