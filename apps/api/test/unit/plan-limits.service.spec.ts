jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ForbiddenException, NotFoundException, BadRequestException, HttpException } from '@nestjs/common';
import { PlanLimitsService, PLANES_CONFIG } from '../../src/modules/tiendas/plan-limits.service';

describe('PlanLimitsService (Pilar 1: Multi-Tenant SaaS)', () => {
  let service: PlanLimitsService;
  let storeRepo: any;
  let membershipRepo: any;
  let productRepo: any;

  const STORE_ID = 'store-uuid-1';
  const USER_ID = 'user-uuid-1';

  beforeEach(() => {
    storeRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: STORE_ID,
        nombre: 'Tienda Test',
        slug: 'tienda-test',
        plan: 'FREE_TRIAL',
        propietarioId: USER_ID,
      }),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    membershipRepo = {
      count: jest.fn().mockResolvedValue(1),
      findOne: jest.fn().mockResolvedValue({
        usuarioId: USER_ID,
        tiendaId: STORE_ID,
        rol: { nombre: 'ADMIN' },
      }),
    };

    productRepo = {
      count: jest.fn().mockResolvedValue(5),
    };

    service = new PlanLimitsService(storeRepo, membershipRepo, productRepo);
  });

  it('retrieves the public catalog with all 3 plans', () => {
    const catalog = service.obtenerCatalogoPlanes();
    expect(catalog).toHaveLength(3);
    const ids = catalog.map((p) => p.id);
    expect(ids).toContain('FREE_TRIAL');
    expect(ids).toContain('ESTANDAR');
    expect(ids).toContain('CORPORATIVO');
  });

  it('calculates current usage and quotas for FREE_TRIAL correctly', async () => {
    const res = await service.obtenerMetricasYLimites(STORE_ID);
    expect(res.plan.id).toBe('FREE_TRIAL');
    expect(res.consumo.usuarios.actual).toBe(1);
    expect(res.consumo.usuarios.limite).toBe(PLANES_CONFIG.FREE_TRIAL.maxUsuarios);
    expect(res.consumo.usuarios.superado).toBe(false);

    expect(res.consumo.productos.actual).toBe(5);
    expect(res.consumo.productos.limite).toBe(PLANES_CONFIG.FREE_TRIAL.maxProductos);
    expect(res.consumo.productos.superado).toBe(false);
  });

  it('blocks creating a product when the plan quota is reached (HTTP 403)', async () => {
    productRepo.count.mockResolvedValue(PLANES_CONFIG.FREE_TRIAL.maxProductos);

    await expect(service.validarLimiteProductos(STORE_ID)).rejects.toThrow(ForbiddenException);
  });

  it('blocks adding a user when the user quota is reached (HTTP 403)', async () => {
    membershipRepo.count.mockResolvedValue(PLANES_CONFIG.FREE_TRIAL.maxUsuarios);

    await expect(service.validarLimiteUsuarios(STORE_ID)).rejects.toThrow(ForbiddenException);
  });

  it('refuses to upgrade to a paid plan without paying (402) and leaves the plan untouched', async () => {
    await expect(service.cambiarPlan(STORE_ID, 'ESTANDAR', USER_ID)).rejects.toMatchObject({ status: 402 });
    await expect(service.cambiarPlan(STORE_ID, 'CORPORATIVO', USER_ID)).rejects.toMatchObject({ status: 402 });

    expect(storeRepo.save).not.toHaveBeenCalled();
  });

  it('refuses the upgrade even for the owner or an ADMIN', async () => {
    storeRepo.findOne.mockResolvedValue({ id: STORE_ID, plan: 'FREE_TRIAL', propietarioId: USER_ID });

    await expect(service.cambiarPlan(STORE_ID, 'CORPORATIVO', USER_ID)).rejects.toBeInstanceOf(HttpException);
  });

  it('lets an ADMIN downgrade to a cheaper plan without any charge', async () => {
    const guardados: string[] = [];
    storeRepo.findOne.mockImplementation(() => Promise.resolve({ id: STORE_ID, plan: 'CORPORATIVO', propietarioId: USER_ID }));
    storeRepo.save.mockImplementation((tienda: { plan: string }) => {
      guardados.push(tienda.plan);
      return Promise.resolve(tienda);
    });

    await service.cambiarPlan(STORE_ID, 'ESTANDAR', USER_ID);
    await service.cambiarPlan(STORE_ID, 'FREE_TRIAL', USER_ID);

    expect(guardados).toEqual(['ESTANDAR', 'FREE_TRIAL']);
  });

  it('answers 403 before 402: a user without permission learns nothing about billing', async () => {
    storeRepo.findOne.mockResolvedValue({ id: STORE_ID, plan: 'FREE_TRIAL', propietarioId: 'other-user' });
    membershipRepo.findOne.mockResolvedValue({ usuarioId: USER_ID, rol: { nombre: 'CLIENTE' } });

    await expect(service.cambiarPlan(STORE_ID, 'CORPORATIVO', USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invalid plan name with BadRequestException', async () => {
    await expect(service.cambiarPlan(STORE_ID, 'PLAN_INVALIDO', USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects changing plan if the user is neither owner nor ADMIN', async () => {
    storeRepo.findOne.mockResolvedValue({
      id: STORE_ID,
      propietarioId: 'other-user',
    });
    membershipRepo.findOne.mockResolvedValue({
      usuarioId: USER_ID,
      rol: { nombre: 'CLIENTE' },
    });

    await expect(service.cambiarPlan(STORE_ID, 'ESTANDAR', USER_ID)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
