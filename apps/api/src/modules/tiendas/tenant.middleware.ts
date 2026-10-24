import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from '../../common/tenant/tenant-context';
import { TenantResolverService } from './tenant-resolver.service';

/** Opens the per-request tenant context. A valid session token replaces this value later. */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly resolver: TenantResolverService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    TenantContext.run(() => {
      void this.attachTenant(req, res, next);
    });
  }

  private async attachTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    const slug = req.headers['x-tenant-slug'] as string | undefined;

    let tenantId: string;
    try {
      tenantId = await this.resolver.resolveSlug(slug);
    } catch (err) {
      if (res.headersSent) return;
      const status = err instanceof HttpException ? err.getStatus() : 500;
      res.status(status).json({ statusCode: status, message: (err as Error)?.message || 'Error de tienda.' });
      return;
    }

    // Only the resolution is guarded: whatever next() does is handled by the framework
    TenantContext.set(tenantId);
    next();
  }
}
