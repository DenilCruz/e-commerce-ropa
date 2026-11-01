jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
  InjectDataSource: () => () => {},
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from '../../src/modules/autenticacion/auth.controller';
import { JwtAuthGuard } from '../../src/modules/autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/autenticacion/guards/roles.guard';

const handlers: Array<[string, any]> = [
  ['miConfigPago (GET)', AuthController.prototype.miConfigPago],
  ['actualizarMiConfigPago (PATCH)', (AuthController.prototype as any).actualizarMiConfigPago],
];

function ctx(handler: any, role: string): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => AuthController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('mi-config-pago role protection', () => {
  const guard = new RolesGuard(new Reflector());

  describe.each(handlers)('%s', (_name, handler) => {
    it('handler exists', () => expect(typeof handler).toBe('function'));

    it('declares JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', handler) ?? [];
      expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    });

    it.each(['CLIENTE', 'VENDEDOR'])('rejects %s', (role) => {
      expect(() => guard.canActivate(ctx(handler, role))).toThrow(ForbiddenException);
    });

    it.each(['ADMIN', 'SUPERADMIN'])('accepts %s', (role) => {
      expect(guard.canActivate(ctx(handler, role))).toBe(true);
    });
  });
});
