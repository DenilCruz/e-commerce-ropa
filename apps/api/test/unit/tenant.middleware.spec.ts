jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { JwtService } from '@nestjs/jwt';
import { TenantContext } from '../../src/common/tenant/tenant-context';
import { TenantMiddleware } from '../../src/modules/tiendas/tenant.middleware';

describe('TenantMiddleware', () => {
  const secret = process.env.JWT_SECRET || 'jwt_secret';
  const jwt = new JwtService({ secret });
  let resolver: { resolveSlug: jest.Mock };
  let middleware: TenantMiddleware;

  const run = (headers: Record<string, string>) =>
    new Promise<{ tenantId?: string; userId?: string; status?: number }>((resolve) => {
      const res: any = {
        headersSent: false,
        status: jest.fn().mockImplementation((status: number) => {
          res.json = () => resolve({ status });
          return res;
        }),
      };
      middleware.use({ headers } as any, res, () =>
        resolve({ tenantId: TenantContext.get(), userId: TenantContext.getUser() }),
      );
    });

  beforeEach(() => {
    resolver = { resolveSlug: jest.fn().mockResolvedValue('tenant-from-slug') };
    middleware = new TenantMiddleware(resolver as any);
  });

  it('uses the store from the header when the visitor has no session', async () => {
    const result = await run({ 'x-tenant-slug': 'luna' });

    expect(resolver.resolveSlug).toHaveBeenCalledWith('luna');
    expect(result.tenantId).toBe('tenant-from-slug');
  });

  it('uses the store inside a valid token, even on public routes, and ignores the header', async () => {
    const token = jwt.sign({ sub: 'user-1', tid: 'tenant-from-token' });

    const result = await run({ authorization: `Bearer ${token}`, 'x-tenant-slug': 'aura' });

    expect(result).toEqual({ tenantId: 'tenant-from-token', userId: 'user-1' });
    expect(resolver.resolveSlug).not.toHaveBeenCalled();
  });

  it('falls back to the header when the token is invalid or has no store', async () => {
    const forged = new JwtService({ secret: 'otra-clave' }).sign({ sub: 'x', tid: 'tenant-ajeno' });

    const result = await run({ authorization: `Bearer ${forged}` });

    expect(result.tenantId).toBe('tenant-from-slug');
    expect(result.userId).toBeUndefined();
  });

  it('answers with the resolver error status when the store does not exist', async () => {
    const { NotFoundException } = await import('@nestjs/common');
    resolver.resolveSlug.mockRejectedValue(new NotFoundException('Tienda no encontrada.'));

    const result = await run({ 'x-tenant-slug': 'nope' });

    expect(result.status).toBe(404);
  });
});
