jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResenasService } from '../../src/modules/reseñas/reviews.service';

describe('ResenasService (Unit Tests)', () => {
  let service: ResenasService;
  let mockRepositorioResena: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockRepositorioResena = {
      create: jest.fn((dto) => ({ id: 'res-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'res-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(true),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    mockDataSource = {
      query: jest.fn(),
    };

    service = new ResenasService(mockRepositorioResena, mockDataSource);
  });

  describe('HU-66: Dejar reseña solo si compró el producto', () => {
    it('debe rechazar con ForbiddenException si el cliente no ha comprado el producto', async () => {
      mockRepositorioResena.findOne.mockResolvedValue(null); // No tiene reseña previa
      mockDataSource.query.mockResolvedValue([]); // No tiene compras

      await expect(
        service.crear({
          usuarioId: 'usr-1',
          productoId: 'prod-1',
          calificacion: 5,
          comentario: 'Excelente producto',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir crear la reseña si el cliente tiene una compra válida registrada', async () => {
      mockRepositorioResena.findOne.mockResolvedValue(null);
      mockDataSource.query.mockResolvedValue([{ notaventa_id: 'nv-123' }]);

      const resultado = await service.crear({
        usuarioId: 'usr-1',
        productoId: 'prod-1',
        calificacion: 5,
        comentario: 'Muy buena calidad',
      });

      expect(resultado).toBeDefined();
      expect(resultado.calificacion).toBe(5);
      expect(resultado.notaventaId).toBe('nv-123');
      expect(mockRepositorioResena.save).toHaveBeenCalled();
    });

    it('debe rechazar si el usuario ya escribió una reseña previa para el mismo producto', async () => {
      mockRepositorioResena.findOne.mockResolvedValue({ id: 'res-previa', usuarioId: 'usr-1' });

      await expect(
        service.crear({
          usuarioId: 'usr-1',
          productoId: 'prod-1',
          calificacion: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('HU-68: Editar o eliminar mi propia reseña', () => {
    it('debe permitir editar la reseña si el usuarioId coincide con el autor', async () => {
      const resenaExistente = {
        id: 'res-1',
        usuarioId: 'usr-1',
        calificacion: 3,
        comentario: 'Regular',
      };
      mockRepositorioResena.findOne.mockResolvedValue(resenaExistente);

      const actualizada = await service.actualizar(
        'res-1',
        { calificacion: 5, comentario: 'Mejor de lo esperado tras usarlo' },
        'usr-1',
      );

      expect(actualizada.calificacion).toBe(5);
      expect(actualizada.comentario).toBe('Mejor de lo esperado tras usarlo');
    });

    it('debe rechazar la edición con ForbiddenException si un usuario intenta editar la reseña de otro', async () => {
      const resenaExistente = {
        id: 'res-1',
        usuarioId: 'usr-1',
        calificacion: 3,
      };
      mockRepositorioResena.findOne.mockResolvedValue(resenaExistente);

      await expect(
        service.actualizar('res-1', { calificacion: 1 }, 'usr-impostor'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir al autor eliminar su propia reseña', async () => {
      const resenaExistente = { id: 'res-1', usuarioId: 'usr-1' };
      mockRepositorioResena.findOne.mockResolvedValue(resenaExistente);

      await service.eliminar('res-1', 'usr-1', false);

      expect(mockRepositorioResena.remove).toHaveBeenCalledWith(resenaExistente);
    });
  });

  describe('HU-69: Moderación Admin (Eliminar ofensivas o spam)', () => {
    it('debe permitir al administrador eliminar cualquier reseña ofensiva sin importar autor', async () => {
      const resenaSpam = { id: 'res-spam', usuarioId: 'usr-bot' };
      mockRepositorioResena.findOne.mockResolvedValue(resenaSpam);

      await service.eliminar('res-spam', undefined, true);

      expect(mockRepositorioResena.remove).toHaveBeenCalledWith(resenaSpam);
    });

    it('debe alternar el estado aprobada (ocultar de la tienda)', async () => {
      const resena = { id: 'res-1', aprobada: true };
      mockRepositorioResena.findOne.mockResolvedValue(resena);

      const resultado = await service.toggleAprobada('res-1');

      expect(resultado.aprobada).toBe(false);
    });
  });

  describe('HU-70: Promedio de estrellas de un producto', () => {
    it('debe calcular correctamente el promedio y la distribución de estrellas', async () => {
      mockRepositorioResena.find.mockResolvedValue([
        { calificacion: 5 },
        { calificacion: 5 },
        { calificacion: 4 },
        { calificacion: 2 },
      ]);

      const resumen = await service.obtenerResumenProducto('prod-1');

      expect(resumen.total).toBe(4);
      // (5 + 5 + 4 + 2) / 4 = 16 / 4 = 4.0
      expect(resumen.promedio).toBe(4.0);
      expect(resumen.distribucion[5]).toBe(2);
      expect(resumen.distribucion[4]).toBe(1);
      expect(resumen.distribucion[2]).toBe(1);
    });

    it('debe retornar promedio 0 si no hay reseñas', async () => {
      mockRepositorioResena.find.mockResolvedValue([]);

      const resumen = await service.obtenerResumenProducto('prod-sin-resenas');

      expect(resumen.total).toBe(0);
      expect(resumen.promedio).toBe(0);
    });
  });
});
