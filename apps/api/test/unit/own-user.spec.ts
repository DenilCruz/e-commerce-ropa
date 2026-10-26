jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ForbiddenException } from '@nestjs/common';
import { exigirMismoUsuario } from '../../src/common/auth/solo-propio-usuario';
import { FavoritosController } from '../../src/modules/listadedeseos/wishlist.controller';
import { ResenasController } from '../../src/modules/reseñas/reviews.controller';
import { JwtAuthGuard } from '../../src/modules/autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/autenticacion/guards/roles.guard';
import { ROLES_KEY } from '../../src/modules/autenticacion/decorators/roles.decorator';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PRODUCT = '33333333-3333-4333-8333-333333333333';

describe('exigirMismoUsuario', () => {
  it('uses the user of the token when the request names nobody', () => {
    expect(exigirMismoUsuario(undefined, ME)).toBe(ME);
  });

  it('accepts a request that names the same user as the token', () => {
    expect(exigirMismoUsuario(ME, ME)).toBe(ME);
  });

  it('refuses a request that names another user', () => {
    expect(() => exigirMismoUsuario(OTHER, ME)).toThrow(ForbiddenException);
  });

  it('refuses when there is no user in the token', () => {
    expect(() => exigirMismoUsuario(ME, undefined as any)).toThrow(ForbiddenException);
  });
});

describe('FavoritosController acts only for the logged user', () => {
  let service: Record<string, jest.Mock>;
  let controller: FavoritosController;

  beforeEach(() => {
    service = {
      agregar: jest.fn().mockResolvedValue('ok'),
      obtenerPorUsuario: jest.fn().mockResolvedValue([]),
      eliminar: jest.fn().mockResolvedValue({}),
      limpiarTodos: jest.fn().mockResolvedValue({}),
      moverAlCarrito: jest.fn().mockResolvedValue({}),
    };
    controller = new FavoritosController(service as any);
  });

  it('lists the favorites of the token user', async () => {
    await controller.obtenerPorUsuario(ME, ME);
    expect(service.obtenerPorUsuario).toHaveBeenCalledWith(ME);
  });

  it.each([
    ['list', () => controller.obtenerPorUsuario(OTHER, ME), 'obtenerPorUsuario'],
    ['remove one', () => controller.eliminar(OTHER, PRODUCT, ME), 'eliminar'],
    ['clear all', () => controller.limpiarTodos(OTHER, ME), 'limpiarTodos'],
    ['add', () => controller.agregar({ usuarioId: OTHER, productoId: PRODUCT } as any, ME), 'agregar'],
    ['move to cart', () => controller.moverAlCarrito({ usuarioId: OTHER, productoId: PRODUCT } as any, ME), 'moverAlCarrito'],
  ])('refuses to %s on behalf of another user', (_n, call, method) => {
    expect(() => call()).toThrow(ForbiddenException);
    expect(service[method]).not.toHaveBeenCalled();
  });

  it('adds with the token user when the body does not say who', async () => {
    await controller.agregar({ productoId: PRODUCT } as any, ME);
    expect(service.agregar).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: ME, productoId: PRODUCT }));
  });
});

describe('ResenasController acts only for the logged user', () => {
  let service: Record<string, jest.Mock>;
  let controller: ResenasController;

  beforeEach(() => {
    service = {
      crear: jest.fn().mockResolvedValue({}),
      verificarCompraCliente: jest.fn().mockResolvedValue({}),
      simularCompraParaPruebas: jest.fn().mockResolvedValue({}),
      actualizar: jest.fn().mockResolvedValue({}),
      eliminar: jest.fn().mockResolvedValue(undefined),
    };
    controller = new ResenasController(service as any);
  });

  it('creates the review as the token user, even when the body names nobody', async () => {
    await controller.crear({ productoId: PRODUCT, calificacion: 5 } as any, ME);
    expect(service.crear).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: ME }));
  });

  it('always tells the service who is editing, so the ownership check can never be skipped', async () => {
    await controller.actualizar('rid', { calificacion: 4 } as any, ME);
    expect(service.actualizar).toHaveBeenCalledWith('rid', expect.anything(), ME);
  });

  it('always tells the service who is deleting', async () => {
    await controller.eliminar('rid', undefined, ME);
    expect(service.eliminar).toHaveBeenCalledWith('rid', ME, false);
  });

  it.each([
    ['create', () => controller.crear({ usuarioId: OTHER, productoId: PRODUCT, calificacion: 5 } as any, ME), 'crear'],
    ['check purchase', () => controller.verificarCompra(PRODUCT, OTHER, ME), 'verificarCompraCliente'],
    ['simulate purchase', () => controller.simularCompra({ productoId: PRODUCT, usuarioId: OTHER }, ME), 'simularCompraParaPruebas'],
    ['update', () => controller.actualizar('rid', { usuarioId: OTHER } as any, ME), 'actualizar'],
    ['delete', () => controller.eliminar('rid', OTHER, ME), 'eliminar'],
  ])('refuses to %s on behalf of another user', (_n, call, method) => {
    expect(() => call()).toThrow(ForbiddenException);
    expect(service[method]).not.toHaveBeenCalled();
  });
});

describe('ResenasController guards', () => {
  const proto: any = ResenasController.prototype;
  const guards = (m: string) => Reflect.getMetadata('__guards__', proto[m]) ?? [];
  const roles = (m: string) => Reflect.getMetadata(ROLES_KEY, proto[m]);

  it.each(['crear', 'verificarCompra', 'simularCompra', 'actualizar', 'eliminar'])('%s needs a logged user', (m) => {
    expect(guards(m)).toContain(JwtAuthGuard);
  });

  it.each(['obtenerKpisAdmin', 'obtenerTodasAdmin', 'moderarResena', 'eliminarAdmin'])('%s needs an administrator', (m) => {
    expect(guards(m)).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(roles(m)).toEqual(expect.arrayContaining(['ADMIN']));
  });

  it.each(['obtenerPorProducto', 'obtenerResumenProducto'])('%s stays public so anyone can read the reviews', (m) => {
    expect(guards(m)).toHaveLength(0);
  });
});
