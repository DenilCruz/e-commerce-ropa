jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ValidationPipe } from '@nestjs/common';
import { ActualizarConfigOfflineDto } from '../../src/modules/tiendas/dto/actualizar-config-offline.dto';
import { StoresService } from '../../src/modules/tiendas/stores.service';
import { AuthController } from '../../src/modules/autenticacion/auth.controller';
import { PlanLimitsService } from '../../src/modules/tiendas/plan-limits.service';

describe('ActualizarConfigOfflineDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const metadata = { type: 'body' as const, metatype: ActualizarConfigOfflineDto };

  it.each([1, 7, 30])('accepts %i days', async (dias) => {
    await expect(pipe.transform({ retencionOfflineDias: dias }, metadata)).resolves.toMatchObject({ retencionOfflineDias: dias });
  });

  it.each([0, 31, -1, 7.5, '7', null, undefined])('rejects %p', async (dias) => {
    await expect(pipe.transform({ retencionOfflineDias: dias }, metadata)).rejects.toThrow();
  });
});

describe('retention endpoint', () => {
  it('is ADMIN only and saves the days on the active store', async () => {
    expect(Reflect.getMetadata('roles', AuthController.prototype.actualizarMiConfigOffline)).toEqual(['ADMIN']);

    const tienda: any = { id: 't1', retencionOfflineDias: 7 };
    const storeRepo = { findOne: jest.fn().mockResolvedValue(tienda), save: jest.fn() };
    const stores = new StoresService(storeRepo as any, {} as any, {} as any, {} as any, {} as any);
    const controller = new AuthController({} as any, {} as any, stores as any);

    await expect(controller.actualizarMiConfigOffline({ tenantId: 't1' }, { retencionOfflineDias: 14 })).resolves.toEqual({ retencionOfflineDias: 14 });
    expect(storeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ retencionOfflineDias: 14 }));
  });
});

describe('plan limits response', () => {
  const build = (tienda: any) => {
    const storeRepo: any = { findOne: jest.fn().mockResolvedValue(tienda), manager: { query: jest.fn().mockResolvedValue([{ total: 1 }]) } };
    const members: any = { count: jest.fn().mockResolvedValue(1) };
    const products: any = { count: jest.fn().mockResolvedValue(1) };
    return new PlanLimitsService(storeRepo, members, products);
  };

  it('returns the retention days of the store', async () => {
    const result = await build({ id: 't1', nombre: 'Luna', slug: 'luna', plan: 'ESTANDAR', retencionOfflineDias: 14 }).obtenerMetricasYLimites('t1');
    expect(result.retencionOfflineDias).toBe(14);
  });

  it('falls back to 7 when the column has no value yet', async () => {
    const result = await build({ id: 't1', nombre: 'Luna', slug: 'luna', plan: 'FREE_TRIAL' }).obtenerMetricasYLimites('t1');
    expect(result.retencionOfflineDias).toBe(7);
  });
});
