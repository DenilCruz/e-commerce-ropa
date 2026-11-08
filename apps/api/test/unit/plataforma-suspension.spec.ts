jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../src/modules/autenticacion/strategies/jwt.strategy';
import { TenantResolverService } from '../../src/modules/tiendas/tenant-resolver.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('suspended store enforcement', () => {
  const TID = 'b0000000-0000-4000-8000-000000000001';

  describe('JwtStrategy', () => {
    const build = (membership: any, rol = 'ADMIN') => {
      const memberships: any = { findOne: jest.fn().mockResolvedValue(membership) };
      const users: any = { findOne: jest.fn().mockResolvedValue({ rol: { nombre: rol } }) };
      return new JwtStrategy(memberships, users);
    };
    const validate = (strategy: JwtStrategy) =>
      TenantContext.run(() => strategy.validate({ sub: 'u1', tid: TID, email: 'a@b.c' }));

    it('rejects a token for a store that was suspended after it was issued', async () => {
      const strategy = build({ rol: { nombre: 'ADMIN' }, tienda: { estado: 'SUSPENDIDA' } });
      await expect(validate(strategy)).rejects.toThrow(UnauthorizedException);
    });

    it('accepts the same token while the store is active', async () => {
      const strategy = build({ rol: { nombre: 'ADMIN' }, tienda: { estado: 'ACTIVA' } });
      await expect(validate(strategy)).resolves.toMatchObject({ role: 'ADMIN', tenantId: TID });
    });

    it('does not lock the platform operator out', async () => {
      const strategy = build(null, 'SUPERADMIN');
      await expect(validate(strategy)).resolves.toMatchObject({ role: 'SUPERADMIN' });
    });
  });

  describe('TenantResolverService', () => {
    const config: any = { get: () => 'aura' };

    it('does not resolve a suspended store', async () => {
      const repo: any = { findOne: jest.fn().mockResolvedValue(null) };
      const resolver = new TenantResolverService(repo, config);
      await expect(resolver.resolveSlug('luna')).rejects.toThrow('Tienda no encontrada');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { slug: 'luna', estado: 'ACTIVA' } });
    });

    it('forget() makes a cached slug re-check the database', async () => {
      const repo: any = { findOne: jest.fn().mockResolvedValueOnce({ id: TID }).mockResolvedValueOnce(null) };
      const resolver = new TenantResolverService(repo, config);
      await expect(resolver.resolveSlug('luna')).resolves.toBe(TID);
      await expect(resolver.resolveSlug('luna')).resolves.toBe(TID); // cached
      resolver.forget(TID);
      await expect(resolver.resolveSlug('luna')).rejects.toThrow('Tienda no encontrada');
    });
  });
});
