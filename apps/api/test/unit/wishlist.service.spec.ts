jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FavoritosService } from '../../src/modules/listadedeseos/wishlist.service';

describe('FavoritosService (Unit Tests)', () => {
  let service: FavoritosService;
  let mockRepositorioFavoritos: any;
  let mockRepositorioVariantes: any;
  let mockCartService: any;

  const dummyUsuarioId = '11111111-1111-1111-1111-111111111111';
  const dummyProductoId = '22222222-2222-2222-2222-222222222222';
  const dummyVarianteId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepositorioFavoritos = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'fav-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'fav-1', ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockRepositorioVariantes = {
      findOne: jest.fn(),
    };

    mockCartService = {
      agregarItem: jest.fn(),
    };

    service = new FavoritosService(
      mockRepositorioFavoritos,
      mockRepositorioVariantes,
      mockCartService,
    );
  });

  describe('HU-76: Guardar productos en favoritos', () => {
    it('debe agregar un producto a favoritos exitosamente si no estaba guardado', async () => {
      mockRepositorioFavoritos.findOne.mockResolvedValue(null);

      const resultado = await service.agregar({
        usuarioId: dummyUsuarioId,
        productoId: dummyProductoId,
      });

      expect(resultado).toBeDefined();
      expect(resultado.usuarioId).toBe(dummyUsuarioId);
      expect(resultado.productoId).toBe(dummyProductoId);
      expect(mockRepositorioFavoritos.create).toHaveBeenCalledWith({
        usuarioId: dummyUsuarioId,
        productoId: dummyProductoId,
      });
      expect(mockRepositorioFavoritos.save).toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si el producto ya está en favoritos', async () => {
      mockRepositorioFavoritos.findOne.mockResolvedValue({ id: 'fav-existente' });

      await expect(
        service.agregar({ usuarioId: dummyUsuarioId, productoId: dummyProductoId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('HU-77: Ver lista de favoritos', () => {
    it('debe retornar todos los favoritos del usuario con imágenes, categorías y variantes', async () => {
      const mockFavoritos = [
        {
          id: 'fav-1',
          usuarioId: dummyUsuarioId,
          productoId: dummyProductoId,
          producto: { nombre: 'Camisa Oversize', variantes: [{ id: dummyVarianteId, stock: 10 }] },
        },
      ];
      mockRepositorioFavoritos.find.mockResolvedValue(mockFavoritos);

      const resultado = await service.obtenerPorUsuario(dummyUsuarioId);

      expect(resultado).toEqual(mockFavoritos);
      expect(mockRepositorioFavoritos.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuarioId: dummyUsuarioId },
          relations: expect.arrayContaining([
            'producto',
            'producto.imagenes',
            'producto.categoria',
            'producto.variantes',
          ]),
        }),
      );
    });
  });

  describe('HU-78: Quitar productos de favoritos', () => {
    it('debe eliminar el producto de favoritos si existe', async () => {
      const mockFav = { id: 'fav-1', usuarioId: dummyUsuarioId, productoId: dummyProductoId };
      mockRepositorioFavoritos.findOne.mockResolvedValue(mockFav);

      const resultado = await service.eliminar(dummyUsuarioId, dummyProductoId);

      expect(resultado.mensaje).toContain('eliminado de favoritos');
      expect(mockRepositorioFavoritos.remove).toHaveBeenCalledWith(mockFav);
    });

    it('debe lanzar NotFoundException si el producto no está en favoritos', async () => {
      mockRepositorioFavoritos.findOne.mockResolvedValue(null);

      await expect(service.eliminar(dummyUsuarioId, dummyProductoId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe permitir vaciar todos los favoritos del usuario', async () => {
      const mockFavs = [
        { id: 'fav-1', usuarioId: dummyUsuarioId },
        { id: 'fav-2', usuarioId: dummyUsuarioId },
      ];
      mockRepositorioFavoritos.find.mockResolvedValue(mockFavs);

      const resultado = await service.limpiarTodos(dummyUsuarioId);

      expect(resultado.eliminados).toBe(2);
      expect(mockRepositorioFavoritos.remove).toHaveBeenCalledWith(mockFavs);
    });
  });

  describe('HU-79: Pasar un favorito directo al carrito', () => {
    it('debe mover al carrito con la variante especificada y remover de favoritos', async () => {
      const mockFav = {
        id: 'fav-1',
        usuarioId: dummyUsuarioId,
        productoId: dummyProductoId,
        producto: { nombre: 'Pantalón Cargo' },
      };
      mockRepositorioFavoritos.findOne.mockResolvedValue(mockFav);
      mockCartService.agregarItem.mockResolvedValue({ id: 'cart-1', total: 150 });

      const resultado = await service.moverAlCarrito({
        usuarioId: dummyUsuarioId,
        productoId: dummyProductoId,
        varianteId: dummyVarianteId,
        cantidad: 2,
        eliminarDeFavoritos: true,
      });

      expect(resultado.exito).toBe(true);
      expect(resultado.varianteId).toBe(dummyVarianteId);
      expect(mockCartService.agregarItem).toHaveBeenCalledWith(dummyUsuarioId, {
        varianteId: dummyVarianteId,
        cantidad: 2,
      });
      expect(mockRepositorioFavoritos.remove).toHaveBeenCalledWith(mockFav);
    });

    it('debe seleccionar automáticamente una variante activa con stock si no se especifica varianteId', async () => {
      const mockFav = {
        id: 'fav-1',
        usuarioId: dummyUsuarioId,
        productoId: dummyProductoId,
      };
      mockRepositorioFavoritos.findOne.mockResolvedValue(mockFav);
      mockRepositorioVariantes.findOne.mockResolvedValue({
        id: 'variante-auto-id',
        stock: 5,
        activa: true,
      });
      mockCartService.agregarItem.mockResolvedValue({ id: 'cart-1' });

      const resultado = await service.moverAlCarrito({
        usuarioId: dummyUsuarioId,
        productoId: dummyProductoId,
      });

      expect(resultado.exito).toBe(true);
      expect(resultado.varianteId).toBe('variante-auto-id');
      expect(mockCartService.agregarItem).toHaveBeenCalledWith(dummyUsuarioId, {
        varianteId: 'variante-auto-id',
        cantidad: 1,
      });
    });

    it('debe lanzar NotFoundException si el producto no está en favoritos', async () => {
      mockRepositorioFavoritos.findOne.mockResolvedValue(null);

      await expect(
        service.moverAlCarrito({ usuarioId: dummyUsuarioId, productoId: dummyProductoId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el producto no tiene variantes con stock', async () => {
      const mockFav = { id: 'fav-1', usuarioId: dummyUsuarioId, productoId: dummyProductoId };
      mockRepositorioFavoritos.findOne.mockResolvedValue(mockFav);
      mockRepositorioVariantes.findOne.mockResolvedValue(null);

      await expect(
        service.moverAlCarrito({ usuarioId: dummyUsuarioId, productoId: dummyProductoId }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
