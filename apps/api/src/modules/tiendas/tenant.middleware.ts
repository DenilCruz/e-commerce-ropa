import { ForbiddenException, HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from '../../common/tenant/tenant-context';
import { TenantResolverService } from './tenant-resolver.service';

/**
 * Opens the per-request tenant context.
 * Priority: the store inside a valid session token, then the X-Tenant-Slug header, then the default store.
 * A header that names a different store than a valid token is rejected with 403.
 * Protected routes re-check the membership afterwards (JwtStrategy); this step only decides which
 * store's public data a logged-in user sees on public routes.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'jwt_secret' });

  constructor(private readonly resolver: TenantResolverService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    TenantContext.run(() => {
      void this.attachTenant(req, res, next);
    });
  }

  private async attachTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    const session = this.readSession(req);

    const slug = req.headers['x-tenant-slug'] as string | undefined;
    let tenantId: string;
    try {
      if (session?.tenantId && slug) {
        if ((await this.resolver.resolveSlug(slug)) !== session.tenantId) {
          throw new ForbiddenException('La tienda indicada no coincide con tu sesión.');
        }
        tenantId = session.tenantId;
      } else {
        tenantId = session?.tenantId ?? (await this.resolver.resolveSlug(slug));
      }
    } catch (err) {
      if (res.headersSent) return;
      const status = err instanceof HttpException ? err.getStatus() : 500;
      res.status(status).json({ statusCode: status, message: (err as Error)?.message || 'Error de tienda.' });
      return;
    }

    // Only the resolution is guarded: whatever next() does is handled by the framework
    TenantContext.set(tenantId);
    if (session?.userId) TenantContext.setUser(session.userId);
    next();
  }

  /** Store and user of a valid access token, or undefined when there is none (anonymous visitor). */
  private readSession(req: Request): { tenantId?: string; userId?: string } | undefined {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) return undefined;
    try {
      const payload: any = this.jwtService.verify(authorization.slice(7));
      return payload?.tid ? { tenantId: payload.tid, userId: payload.sub } : undefined;
    } catch {
      return undefined;
    }
  }
}
