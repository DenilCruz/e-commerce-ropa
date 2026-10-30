jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  esSlugDuplicado,
  generarSlugBase,
  PLAN_INICIAL,
  StoresService,
} from '../../src/modules/tiendas/stores.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('generarSlugBase', () => {
  it('removes accents, symbols and edge dashes', () => {
    expect(generarSlugBase('  Moda Luna! ')).toBe('moda-luna');
    expect(generarSlugBase('Ñandú & Compañía')).toBe('nandu-compania');
  });

  it('falls back to a default when nothing usable remains', () => {
    expect(generarSlugBase('***')).toBe('tienda');
  });

  it('limits the length without leaving a trailing dash', () => {
    const slug = generarSlugBase('a'.repeat(49) + ' bbbb');
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('esSlugDuplicado', () => {
  it('recognises the unique violation on the slug index only', () => {
    expect(esSlugDuplicado({ code: '23505', constraint: 'uq_tienda_slug' })).toBe(true);
    expect(esSlugDuplicado({ code: '23505', constraint: 'usuario_correo_key' })).toBe(false);
    expect(esSlugDuplicado({ code: '40001' })).toBe(false);
  });
});

describe('StoresService', () => {
  let service: StoresService;
  let storeRepo: any;
  let membershipRepo: any;
  let userRepo: any;
  let roleRepo: any;
  let dataSource: any;
  let runner: any;
  let manager: any;
  let saved: any[];
  let tenantsSeenByRunner: (string | undefined)[];

  const USER_ID = 'user-1';
  const ADMIN_ROLE = { id: 'role-admin', nombre: 'ADMIN' };

  beforeEach(() => {
    saved = [];
    tenantsSeenByRunner = [];
    manager = {
      create: jest.fn((_entity: any, data: any) => ({ ...data })),
      save: jest.fn(async (entity: any) => {
        saved.push(entity);
        return entity;
      }),
    };
    runner = {
      connect: jest.fn(async () => {
        tenantsSeenByRunner.push(TenantContext.get());
      }),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ id: 'new-tenant-id' }]),
      createQueryRunner: jest.fn(() => runner),
    };
    storeRepo = { exist: jest.fn().mockResolvedValue(false) };
    membershipRepo = { find: jest.fn(), findOne: jest.fn() };
    userRepo = { findOne: jest.fn().mockResolvedValue({ id: USER_ID, emailVerificado: true }) };
    roleRepo = { findOne: jest.fn().mockResolvedValue(ADMIN_ROLE) };

    service = new StoresService(storeRepo, membershipRepo, userRepo, roleRepo, dataSource);
  });

  describe('crear', () => {
    it('never grants a paid plan at creation: the store starts in the trial and a paid plan needs a payment', async () => {
      const tienda = await service.crear(USER_ID, { nombre: 'Moda Sol', plan: 'CORPORATIVO' });

      expect(tienda.plan).toBe(PLAN_INICIAL);
    });

    it('provisions the store, makes the user its ADMIN and creates the initial category, in one transaction', async () => {
      const tienda = await service.crear(USER_ID, { nombre: ' Moda Luna ' });

      expect(tienda).toMatchObject({ id: 'new-tenant-id', nombre: 'Moda Luna', slug: 'moda-luna', plan: PLAN_INICIAL });
      expect(tienda.propietarioId).toBe(USER_ID);
      expect(saved).toContainEqual(
        expect.objectContaining({ usuarioId: USER_ID, tiendaId: 'new-tenant-id', rolId: ADMIN_ROLE.id }),
      );
      expect(saved).toContainEqual(expect.objectContaining({ nombre: 'General' }));
      expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(runner.rollbackTransaction).not.toHaveBeenCalled();
      expect(runner.release).toHaveBeenCalled();
    });

    it('runs the provisioning under the new store as tenant, not the caller\'s store', async () => {
      await TenantContext.run(async () => {
        TenantContext.set('callers-tenant');
        await service.crear(USER_ID, { nombre: 'Moda Luna' });
      });

      expect(tenantsSeenByRunner).toEqual(['new-tenant-id']);
    });

    it('rejects a user whose email is not verified, without creating anything', async () => {
      userRepo.findOne.mockResolvedValue({ id: USER_ID, emailVerificado: false });

      await expect(service.crear(USER_ID, { nombre: 'Moda Luna' })).rejects.toThrow(ForbiddenException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('adds a numeric suffix when the slug is already taken', async () => {
      storeRepo.exist.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const tienda = await service.crear(USER_ID, { nombre: 'Moda Luna' });

      expect(tienda.slug).toBe('moda-luna-2');
    });

    it('rolls back and releases the connection when provisioning fails', async () => {
      manager.save.mockRejectedValueOnce(new Error('boom'));

      await expect(service.crear(USER_ID, { nombre: 'Moda Luna' })).rejects.toThrow('boom');
      expect(runner.rollbackTransaction).toHaveBeenCalled();
      expect(runner.commitTransaction).not.toHaveBeenCalled();
      expect(runner.release).toHaveBeenCalled();
    });

    it('retries with a new slug when a concurrent sign-up took it first', async () => {
      manager.save.mockRejectedValueOnce({ code: '23505', constraint: 'uq_tienda_slug' });
      storeRepo.exist.mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValue(false);

      const tienda = await service.crear(USER_ID, { nombre: 'Moda Luna' });

      expect(tienda.slug).toBe('moda-luna-2');
      expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('gives up with a conflict after repeated slug collisions', async () => {
      manager.save.mockRejectedValue({ code: '23505', constraint: 'uq_tienda_slug' });

      await expect(service.crear(USER_ID, { nombre: 'Moda Luna' })).rejects.toThrow(ConflictException);
    });
  });

  describe('obtenerMembresia', () => {
    it('returns the membership of an active store', async () => {
      const membresia = { tienda: { estado: 'ACTIVA' } };
      membershipRepo.findOne.mockResolvedValue(membresia);

      await expect(service.obtenerMembresia(USER_ID, 'store-1')).resolves.toBe(membresia);
    });

    it('answers not found for a store the user does not belong to', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(service.obtenerMembresia(USER_ID, 'store-1')).rejects.toThrow(NotFoundException);
    });

    it('answers not found for a store that is no longer active', async () => {
      membershipRepo.findOne.mockResolvedValue({ tienda: { estado: 'SUSPENDIDA' } });

      await expect(service.obtenerMembresia(USER_ID, 'store-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listarMias', () => {
    it('lists only active stores, with the role in each, and marks the active one', async () => {
      membershipRepo.find.mockResolvedValue([
        { tienda: { id: 's1', nombre: 'AURA', slug: 'aura', plan: 'CORPORATIVO', estado: 'ACTIVA' }, rol: { nombre: 'ADMIN' } },
        { tienda: { id: 's2', nombre: 'Luna', slug: 'luna', plan: 'FREE_TRIAL', estado: 'ACTIVA' }, rol: { nombre: 'CLIENTE' } },
        { tienda: { id: 's3', nombre: 'Vieja', slug: 'vieja', plan: 'FREE_TRIAL', estado: 'SUSPENDIDA' }, rol: { nombre: 'ADMIN' } },
      ]);

      const lista = await TenantContext.run(async () => {
        TenantContext.set('s2');
        return service.listarMias(USER_ID);
      });

      expect(lista).toEqual([
        { id: 's1', nombre: 'AURA', slug: 'aura', plan: 'CORPORATIVO', rol: 'ADMIN', esActiva: false },
        { id: 's2', nombre: 'Luna', slug: 'luna', plan: 'FREE_TRIAL', rol: 'CLIENTE', esActiva: true },
      ]);
    });
  });
});
