jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from '../../src/modules/pedidos/orders.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

const OWNER = 'u-owner';
const OTHER = 'u-other';

describe('OrdersService order access', () => {
  let service: OrdersService;
  let orderRepo: any;
  let historyRepo: any;
  const entradas = [{ id: 'h1', estado: 'PAGADO' }];

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    orderRepo = {
      findOne: jest.fn(async () => ({
        id: 'o1', usuarioId: OWNER, tenantId: 'tenant-luna', estado: 'PAGADO',
        items: [], historial: [], subtotal: 0, descuento: 0, costoEnvio: 0, total: 0,
      })),
    };
    historyRepo = { find: jest.fn(async () => entradas) };
    const none = {} as any;
    service = new OrdersService(orderRepo, none, historyRepo, none, none);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('history', () => {
    it.each(['ADMIN', 'SUPERADMIN', 'VENDEDOR', 'EMPLEADO', 'CAJERO', 'ADMINISTRADOR'])(
      'lets %s read the history of any order of the store',
      async (rol) => {
        await expect(service.obtenerHistorial('o1', OTHER, rol)).resolves.toBe(entradas);
      },
    );

    it('lets the customer read the history of their own order', async () => {
      await expect(service.obtenerHistorial('o1', OWNER, 'CLIENTE')).resolves.toBe(entradas);
    });

    it('refuses a customer who reads the history of another customer order', async () => {
      await expect(service.obtenerHistorial('o1', OTHER, 'CLIENTE')).rejects.toThrow(ForbiddenException);
      expect(historyRepo.find).not.toHaveBeenCalled();
    });

    it('refuses when the session has no user', async () => {
      await expect(service.obtenerHistorial('o1', undefined as any, 'CLIENTE')).rejects.toThrow(ForbiddenException);
    });

    it('answers not found for an order that is not in the store', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.obtenerHistorial('o1', OWNER, 'CLIENTE')).rejects.toThrow(NotFoundException);
    });
  });

  describe('detail', () => {
    it.each(['VENDEDOR', 'EMPLEADO', 'CAJERO', 'ADMINISTRADOR', 'ADMIN', 'SUPERADMIN'])(
      'lets %s open an order of another customer',
      async (rol) => {
        await expect(service.obtenerDetalle('o1', OTHER, rol)).resolves.toBeDefined();
      },
    );

    it('refuses a customer who opens the order of another customer', async () => {
      await expect(service.obtenerDetalle('o1', OTHER, 'CLIENTE')).rejects.toThrow(ForbiddenException);
    });
  });
});
