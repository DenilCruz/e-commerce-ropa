jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from '../../src/modules/pedidos/orders.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

/** What the service writes when an order changes state: the order, its shipment, its payment, the stock and the audit entry. */
describe('OrdersService state changes', () => {
  let service: OrdersService;
  let manager: any;
  let queryRunner: any;
  let orden: any;

  const nuevaOrden = (extra: any = {}) => ({
    id: 'o1',
    nro: 'NV-2026-00001',
    usuarioId: 'u1',
    estado: 'PENDIENTE',
    items: [{ varianteId: 'v1', cantidad: 2 }, { varianteId: 'v2', cantidad: 1 }],
    envio: { estado: 'PREPARANDO' },
    pago: { estado: 'PENDIENTE', metodoPago: { nombre: 'QR Simple / Transferencia' } },
    ...extra,
  });

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    orden = nuevaOrden();
    manager = {
      findOne: jest.fn(async (_e: any, opts: any) => (opts.lock ? { id: 'o1' } : orden)),
      save: jest.fn(async (_e: any, v: any) => v ?? _e),
      increment: jest.fn(),
      create: jest.fn((_e: any, v: any) => v),
    };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    };
    const none = {} as any;
    service = new OrdersService(none, none, none, none, { createQueryRunner: () => queryRunner } as any);
    jest.spyOn(service, 'obtenerDetalle').mockResolvedValue({ ok: true } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  const stockDevuelto = () => manager.increment.mock.calls.map((c: any[]) => `${c[1].id}:${c[3]}`);

  it('locks the order row before reading it with its relations', async () => {
    await service.actualizarEstadoAdmin('o1', 'PAGADO', 'Verificado', 'admin');
    expect(manager.findOne.mock.calls[0][1].lock).toEqual({ mode: 'pessimistic_write' });
    expect(manager.findOne.mock.calls[1][1].relations).toEqual(expect.arrayContaining(['pago', 'pago.metodoPago', 'items', 'envio']));
  });

  it('confirming a QR order approves its payment, writes the audit entry and gives no stock back', async () => {
    await service.actualizarEstadoAdmin('o1', 'PAGADO', 'Transferencia verificada', 'admin');

    expect(orden.estado).toBe('PAGADO');
    expect(orden.pago.estado).toBe('APROBADO');
    expect(orden.pago.fechaPago).toBeInstanceOf(Date);
    expect(stockDevuelto()).toEqual([]);
    expect(manager.create.mock.calls.find((c: any[]) => c[1].estadoNuevo === 'PAGADO')[1]).toMatchObject({
      estadoAnterior: 'PENDIENTE',
      comentario: 'Transferencia verificada',
      usuarioId: 'admin',
    });
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejecting a QR order cancels it, rejects the payment and gives every unit back once', async () => {
    await service.actualizarEstadoAdmin('o1', 'CANCELADO', 'No llegó la transferencia', 'admin');

    expect(orden.estado).toBe('CANCELADO');
    expect(orden.pago.estado).toBe('RECHAZADO');
    expect(orden.envio.estado).toBe('CANCELADO');
    expect(stockDevuelto()).toEqual(['v1:2', 'v2:1']);
  });

  it('refuses to ship a QR order whose payment is still unverified and changes nothing', async () => {
    await expect(service.actualizarEstadoAdmin('o1', 'ENVIADO', undefined, 'admin')).rejects.toThrow(/Confirma el pago/);

    expect(orden.estado).toBe('PENDIENTE');
    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('does not revive a cancelled order, so its stock cannot be given back twice', async () => {
    orden = nuevaOrden({ estado: 'CANCELADO', pago: { estado: 'RECHAZADO', metodoPago: { nombre: 'QR Simple / Transferencia' } } });
    await expect(service.actualizarEstadoAdmin('o1', 'PAGADO', undefined, 'admin')).rejects.toThrow(/ya no admite cambios/);
    expect(stockDevuelto()).toEqual([]);
  });

  it('does not mark a card payment as refunded from the status selector', async () => {
    orden = nuevaOrden({ estado: 'PAGADO', pago: { estado: 'APROBADO', metodoPago: { nombre: 'Tarjeta de Débito/Crédito' } } });
    await expect(service.actualizarEstadoAdmin('o1', 'REEMBOLSADO', undefined, 'admin')).rejects.toThrow(/Reembolsar/);
    expect(orden.pago.estado).toBe('APROBADO');
  });

  it('cash on delivery is collected when the parcel is delivered', async () => {
    orden = nuevaOrden({ estado: 'ENVIADO', envio: { estado: 'EN_CAMINO' }, pago: { estado: 'PENDIENTE', metodoPago: { nombre: 'Efectivo contra entrega' } } });
    await service.actualizarEstadoAdmin('o1', 'ENTREGADO', undefined, 'admin');

    expect(orden.pago.estado).toBe('APROBADO');
    expect(orden.envio.estado).toBe('ENTREGADO');
    expect(orden.envio.fechaEntregaReal).toBeInstanceOf(Date);
  });

  it('a request for the state the order already has is a quiet no-op', async () => {
    await service.actualizarEstadoAdmin('o1', 'PENDIENTE', undefined, 'admin');
    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
  });

  it('an unknown state is refused before any transaction opens', async () => {
    await expect(service.actualizarEstadoAdmin('o1', 'REGALADO', undefined, 'admin')).rejects.toThrow(BadRequestException);
    expect(queryRunner.connect).not.toHaveBeenCalled();
  });

  describe('customer cancellation', () => {
    it('refuses another customer', async () => {
      await expect(service.cancelarPedidoCliente('otro', 'o1')).rejects.toThrow(ForbiddenException);
      expect(stockDevuelto()).toEqual([]);
    });

    it('cancels a pending order once: stock back, payment rejected', async () => {
      await service.cancelarPedidoCliente('u1', 'o1', 'Me equivoqué de talla');
      expect(orden.estado).toBe('CANCELADO');
      expect(orden.pago.estado).toBe('RECHAZADO');
      expect(stockDevuelto()).toEqual(['v1:2', 'v2:1']);
    });

    it.each(['ENVIADO', 'ENTREGADO', 'REEMBOLSADO'])('refuses an order that is already %s', async (estado) => {
      orden = nuevaOrden({ estado });
      await expect(service.cancelarPedidoCliente('u1', 'o1')).rejects.toThrow(BadRequestException);
      expect(stockDevuelto()).toEqual([]);
    });

    it('refuses a parcel already travelling with the courier', async () => {
      orden = nuevaOrden({ estado: 'PAGADO', envio: { estado: 'EN_REPARTO' } });
      await expect(service.cancelarPedidoCliente('u1', 'o1')).rejects.toThrow(/en tránsito/);
    });

    it('leaves a card payment approved so the store can still refund it through the gateway', async () => {
      orden = nuevaOrden({ estado: 'PAGADO', pago: { estado: 'APROBADO', metodoPago: { nombre: 'Tarjeta de Débito/Crédito' } } });
      await service.cancelarPedidoCliente('u1', 'o1');
      expect(orden.estado).toBe('CANCELADO');
      expect(orden.pago.estado).toBe('APROBADO');
    });
  });
});
