jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => {} }));

import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PushController } from '../../src/modules/notificaciones/push.controller';
import { ExpoTokenDto } from '../../src/modules/notificaciones/dto/suscripcion-push.dto';

const roles = (method: string) =>
  Reflect.getMetadata('roles', (PushController.prototype as any)[method]) ??
  Reflect.getMetadata('roles', PushController);

describe('PushController Expo endpoints', () => {
  it('lets sellers register and drop their Expo token; web push stays admin only', () => {
    expect(roles('suscribirExpo')).toEqual(['ADMIN', 'VENDEDOR', 'SUPERADMIN']);
    expect(roles('bajaExpo')).toEqual(['ADMIN', 'VENDEDOR', 'SUPERADMIN']);
    expect(roles('suscribir')).toEqual(['ADMIN', 'SUPERADMIN']);
    expect(roles('baja')).toEqual(['ADMIN', 'SUPERADMIN']);
  });

  it('answers 204 and delegates to the service', async () => {
    const service = { suscribirExpo: jest.fn(), cancelarExpo: jest.fn() };
    const c = new PushController(service as any);

    await expect(c.suscribirExpo('u1', { token: 'ExpoPushToken[a]' })).resolves.toBeUndefined();
    await c.bajaExpo({ token: 'ExpoPushToken[a]' });

    expect(service.suscribirExpo).toHaveBeenCalledWith('u1', 'ExpoPushToken[a]');
    expect(service.cancelarExpo).toHaveBeenCalledWith('ExpoPushToken[a]');
    expect(Reflect.getMetadata('__httpCode__', PushController.prototype.suscribirExpo)).toBe(204);
    expect(Reflect.getMetadata('__httpCode__', PushController.prototype.bajaExpo)).toBe(204);
  });

  it.each([
    ['ExponentPushToken[abc]', 0],
    ['ExpoPushToken[abc]', 0],
    ['https://push.example/1', 1],
    ['ExponentPushToken[]', 1],
    ['', 1],
  ])('validates the token %s', async (token, errores) => {
    expect(await validate(plainToInstance(ExpoTokenDto, { token }))).toHaveLength(errores);
  });
});
