jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventarioService } from '../../src/modules/inventario/inventory.service';

describe('InventarioService (Unit Tests)', () => {
  let service: InventarioService;
  let mockVariantRepository: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockVariantRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn((cb) => cb({
        getRepository: () => mockVariantRepository,
      })),
    };

    service = new InventarioService(mockVariantRepository, mockDataSource);
  });

  describe('HU-36: ajustarStock', () => {
    it('debe aumentar el stock cuando la operación es AGREGAR (llegada de mercadería)', async () => {
      const variante = { id: 'var-1', sku: 'SKU-1', stock: 10, stockMinimo: 5 } as any;
      mockVariantRepository.findOne.mockResolvedValue(variante);
      mockVariantRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      const resultado = await service.ajustarStock('var-1', {
        operacion: 'AGREGAR',
        cantidad: 20,
        motivo: 'Llegada de pedido proveedor #542',
      });

      expect(resultado.stock).toBe(30);
      expect(mockVariantRepository.save).toHaveBeenCalledWith(expect.objectContaining({ stock: 30 }));
    });

    it('debe reducir el stock cuando la operación es REDUCIR y hay suficiente stock', async () => {
      const variante = { id: 'var-1', sku: 'SKU-1', stock: 15, stockMinimo: 5 } as any;
      mockVariantRepository.findOne.mockResolvedValue(variante);
      mockVariantRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      const resultado = await service.ajustarStock('var-1', {
        operacion: 'REDUCIR',
        cantidad: 5,
        motivo: 'Merma por falla de fábrica',
      });

      expect(resultado.stock).toBe(10);
    });

    it('debe rechazar la operación si se intenta reducir más stock del disponible (sin stock negativo)', async () => {
      const variante = { id: 'var-1', sku: 'SKU-1', stock: 3, stockMinimo: 5 } as any;
      mockVariantRepository.findOne.mockResolvedValue(variante);

      await expect(
        service.ajustarStock('var-1', {
          operacion: 'REDUCIR',
          cantidad: 10,
          motivo: 'Intento de retiro excesivo',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('debe establecer el stock exactamente cuando la operación es ESTABLECER', async () => {
      const variante = { id: 'var-1', sku: 'SKU-1', stock: 12, stockMinimo: 5 } as any;
      mockVariantRepository.findOne.mockResolvedValue(variante);
      mockVariantRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      const resultado = await service.ajustarStock('var-1', {
        operacion: 'ESTABLECER',
        cantidad: 40,
        motivo: 'Conteo físico mensual',
      });

      expect(resultado.stock).toBe(40);
    });

    it('debe lanzar NotFoundException si la variante no existe', async () => {
      mockVariantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.ajustarStock('inexistente', {
          operacion: 'AGREGAR',
          cantidad: 5,
          motivo: 'Llegada de mercadería',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('HU-38: descontarStock (Rol Sistema)', () => {
    it('debe descontar stock transaccionalmente cuando hay suficiente disponibilidad', async () => {
      const v1 = { id: 'v-1', sku: 'SKU-1', stock: 10, producto: { nombre: 'Polo' } };
      const v2 = { id: 'v-2', sku: 'SKU-2', stock: 5, producto: { nombre: 'Short' } };

      mockVariantRepository.findOne
        .mockResolvedValueOnce(v1)
        .mockResolvedValueOnce(v2)
        .mockResolvedValueOnce(v1)
        .mockResolvedValueOnce(v2);

      mockVariantRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      const items = [
        { varianteId: 'v-1', cantidad: 2 },
        { varianteId: 'v-2', cantidad: 1 },
      ];

      const resultado = await service.descontarStock(items);

      expect(resultado.exito).toBe(true);
      expect(resultado.variantesActualizadas).toHaveLength(2);
      expect(v1.stock).toBe(8);
      expect(v2.stock).toBe(4);
    });

    it('debe abortar y lanzar BadRequestException si una de las variantes no tiene stock suficiente', async () => {
      const v1 = { id: 'v-1', sku: 'SKU-1', stock: 10, producto: { nombre: 'Polo' } };
      const v2 = { id: 'v-2', sku: 'SKU-2', stock: 1, producto: { nombre: 'Short' } };

      mockVariantRepository.findOne
        .mockResolvedValueOnce(v1)
        .mockResolvedValueOnce(v2);

      const items = [
        { varianteId: 'v-1', cantidad: 2 },
        { varianteId: 'v-2', cantidad: 5 }, // Supera el disponible
      ];

      await expect(service.descontarStock(items)).rejects.toThrow(BadRequestException);
    });
  });

  describe('HU-39: devolverStock (Rol Sistema)', () => {
    it('debe restituir las unidades al cancelar un pedido', async () => {
      const v1 = { id: 'v-1', sku: 'SKU-1', stock: 8 };
      mockVariantRepository.findOne.mockResolvedValue(v1);
      mockVariantRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      const items = [{ varianteId: 'v-1', cantidad: 3 }];
      const resultado = await service.devolverStock(items);

      expect(resultado.exito).toBe(true);
      expect(v1.stock).toBe(11);
      expect(resultado.variantesActualizadas[0].nuevoStock).toBe(11);
    });
  });

  describe('HU-35 & HU-37: KPIs y Alertas', () => {
    it('debe calcular KPIs correctamente identificando stock bajo y agotados', async () => {
      mockVariantRepository.find.mockResolvedValue([
        { stock: 0, stockMinimo: 5 },
        { stock: 3, stockMinimo: 5 },
        { stock: 12, stockMinimo: 5 },
        { stock: 20, stockMinimo: 5 },
      ]);

      const kpis = await service.obtenerKpis();

      expect(kpis.totalVariantes).toBe(4);
      expect(kpis.totalStock).toBe(35);
      expect(kpis.agotados).toBe(1);
      expect(kpis.stockBajo).toBe(1);
      expect(kpis.stockOptimo).toBe(2);
    });
  });
});
