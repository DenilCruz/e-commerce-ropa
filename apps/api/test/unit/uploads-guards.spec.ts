jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ArchivosController } from '../../src/modules/uploads/uploads.controller';
import { JwtAuthGuard } from '../../src/modules/autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/autenticacion/guards/roles.guard';

const proto = ArchivosController.prototype as any;
const guardsOf = (handler: string) => Reflect.getMetadata('__guards__', proto[handler]) ?? [];

describe('ArchivosController access control', () => {
  const adminOnly = ['obtenerEstadoCloudinary', 'obtenerArchivos', 'limpiarObsoletas', 'eliminarArchivo'];

  it.each([...adminOnly, 'subirImagen'])('%s requires a signed-in user', (handler) => {
    expect(proto[handler]).toBeDefined();
    expect(guardsOf(handler)).toContain(JwtAuthGuard);
  });

  it.each(adminOnly)('%s is limited to the store owner', (handler) => {
    expect(guardsOf(handler)).toContain(RolesGuard);
    expect(Reflect.getMetadata('roles', proto[handler])).toEqual(['ADMIN']);
  });

  it('upload stays open to any signed-in role (customers upload a profile photo)', () => {
    expect(guardsOf('subirImagen')).not.toContain(RolesGuard);
  });

  it.each(['CLIENTE', 'VENDEDOR'])('RolesGuard rejects %s on the gallery listing', (role) => {
    const guard = new RolesGuard(new Reflector());
    const context: any = {
      getHandler: () => proto.obtenerArchivos,
      getClass: () => ArchivosController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    };
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
