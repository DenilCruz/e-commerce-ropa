jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ForbiddenException } from '@nestjs/common';
import { UsuariosController } from '../../src/modules/usuarios/users.controller';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ADDRESS = '33333333-3333-4333-8333-333333333333';

describe('UsuariosController profile routes act only for the logged user', () => {
  let service: Record<string, jest.Mock>;
  let controller: UsuariosController;

  beforeEach(() => {
    service = {
      obtenerPerfil: jest.fn().mockResolvedValue({}),
      actualizarPerfil: jest.fn().mockResolvedValue({}),
      cambiarContrasena: jest.fn().mockResolvedValue({}),
      obtenerDirecciones: jest.fn().mockResolvedValue([]),
      agregarDireccion: jest.fn().mockResolvedValue({}),
      marcarPredeterminada: jest.fn().mockResolvedValue({}),
      eliminarDireccion: jest.fn().mockResolvedValue(undefined),
    };
    controller = new UsuariosController(service as any);
  });

  it.each([
    ['read the profile', () => controller.obtenerPerfil(ME, ME), 'obtenerPerfil'],
    ['update the profile', () => controller.actualizarPerfil(ME, {} as any, ME), 'actualizarPerfil'],
    ['change the password', () => controller.cambiarContrasena(ME, {} as any, ME), 'cambiarContrasena'],
    ['list addresses', () => controller.obtenerDirecciones(ME, ME), 'obtenerDirecciones'],
    ['add an address', () => controller.agregarDireccion(ME, {} as any, ME), 'agregarDireccion'],
    ['set a default address', () => controller.marcarPredeterminada(ME, ADDRESS, ME), 'marcarPredeterminada'],
    ['delete an address', () => controller.eliminarDireccion(ME, ADDRESS, ME), 'eliminarDireccion'],
  ])('lets the user %s of their own account', async (_n, call, method) => {
    await call();
    expect(service[method]).toHaveBeenCalled();
  });

  it.each([
    ['read the profile', () => controller.obtenerPerfil(OTHER, ME), 'obtenerPerfil'],
    ['update the profile', () => controller.actualizarPerfil(OTHER, {} as any, ME), 'actualizarPerfil'],
    ['change the password', () => controller.cambiarContrasena(OTHER, {} as any, ME), 'cambiarContrasena'],
    ['list addresses', () => controller.obtenerDirecciones(OTHER, ME), 'obtenerDirecciones'],
    ['add an address', () => controller.agregarDireccion(OTHER, {} as any, ME), 'agregarDireccion'],
    ['set a default address', () => controller.marcarPredeterminada(OTHER, ADDRESS, ME), 'marcarPredeterminada'],
    ['delete an address', () => controller.eliminarDireccion(OTHER, ADDRESS, ME), 'eliminarDireccion'],
  ])('refuses to %s of another user', (_n, call, method) => {
    expect(() => call()).toThrow(ForbiddenException);
    expect(service[method]).not.toHaveBeenCalled();
  });
});
