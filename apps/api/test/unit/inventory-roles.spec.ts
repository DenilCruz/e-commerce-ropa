jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
  InjectDataSource: () => () => {},
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InventarioController } from '../../src/modules/inventario/inventory.controller';
import { JwtAuthGuard } from '../../src/modules/autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/autenticacion/guards/roles.guard';

const proto: any = InventarioController.prototype;
const handlers: Array<[string, any]> = [
  ['obtenerVariantes', proto.obtenerVariantes],
  ['ajustarStock', proto.ajustarStock],
  ['descontarStock', proto.descontarStock],
  ['devolverStock', proto.devolverStock],
];

function ctx(handler: any, role: string): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => InventarioController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('InventarioController role protection', () => {
  const guard = new RolesGuard(new Reflector());

  it('declares JwtAuthGuard and RolesGuard at class level', () => {
    const guards = Reflect.getMetadata('__guards__', InventarioController) ?? [];
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
  });

  describe.each(handlers)('%s', (_name, handler) => {
    it('handler exists', () => expect(typeof handler).toBe('function'));

    it('rejects CLIENTE', () => {
      expect(() => guard.canActivate(ctx(handler, 'CLIENTE'))).toThrow(ForbiddenException);
    });

    it.each(['ADMIN', 'VENDEDOR', 'SUPERADMIN'])('accepts %s', (role) => {
      expect(guard.canActivate(ctx(handler, role))).toBe(true);
    });
  });
});
