jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlataformaController } from '../../src/modules/plataforma/plataforma.controller';
import { JwtAuthGuard } from '../../src/modules/autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/autenticacion/guards/roles.guard';

const proto = PlataformaController.prototype as any;
const handlers = ['resumen', 'tiendas', 'suscripciones', 'suspender', 'reactivar'];
const guardsOf = (handler: string) => Reflect.getMetadata('__guards__', proto[handler]) ?? [];

describe('PlataformaController access control', () => {
  it('lives under /plataforma', () => {
    expect(Reflect.getMetadata('path', PlataformaController)).toBe('plataforma');
  });

  it.each(handlers)('%s requires a session and the SUPERADMIN role', (handler) => {
    expect(proto[handler]).toBeDefined();
    expect(guardsOf(handler)).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(Reflect.getMetadata('roles', proto[handler])).toEqual(['SUPERADMIN']);
  });

  const contextFor = (handler: string, role?: string): any => ({
    getHandler: () => proto[handler],
    getClass: () => PlataformaController,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  });

  it.each(handlers.flatMap((h) => ['ADMIN', 'ADMINISTRADOR', 'VENDEDOR', 'EMPLEADO', 'CLIENTE'].map((r) => [h, r])))(
    '%s rejects %s',
    (handler, role) => {
      const guard = new RolesGuard(new Reflector());
      expect(() => guard.canActivate(contextFor(handler, role))).toThrow(ForbiddenException);
    },
  );

  it.each(handlers)('%s accepts SUPERADMIN', (handler) => {
    const guard = new RolesGuard(new Reflector());
    expect(guard.canActivate(contextFor(handler, 'SUPERADMIN'))).toBe(true);
  });

  it('rejects a request with no user', () => {
    const guard = new RolesGuard(new Reflector());
    expect(() => guard.canActivate(contextFor('resumen'))).toThrow(ForbiddenException);
  });
});
