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
      const slug = req.headers['x-tenant-slug'] as string | undefined;
      this.resolver
        .resolveSlug(slug)
        .then((tenantId) => {
          TenantContext.set(tenantId);
          next();
        })
        .catch((err) => {
          const status = err instanceof HttpException ? err.getStatus() : 500;
          res.status(status).json({ statusCode: status, message: err?.message || 'Error de tienda.' });
        });
    });
  }
}
