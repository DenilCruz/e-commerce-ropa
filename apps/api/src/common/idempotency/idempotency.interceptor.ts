import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { Observable, catchError, from, of, switchMap, tap, throwError } from 'rxjs';
import { TenantContext } from '../tenant/tenant-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StoredKey {
  huella: string;
  estado: 'EN_PROCESO' | 'COMPLETADA';
  status_code: number | null;
  respuesta: unknown;
}

/**
 * Makes a charge safe to repeat. A request with an Idempotency-Key header runs once per
 * (store, user, key): the first call stores its response, later calls with the same key and
 * body get that response back (header Idempotent-Replay) and charge nothing again.
 * A request without the header runs as before. A failed first call releases the key so the
 * client can retry; a key still running answers 409 and a key reused with another body 422.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  /** A key left EN_PROCESO longer than this belongs to a crashed request and can be taken over. */
  private static readonly STALE_AFTER = '2 minutes';

  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const key = req.headers['idempotency-key'] as string | undefined;
    if (key === undefined) return next.handle();
    if (!UUID.test(key)) {
      return throwError(() => new BadRequestException('Idempotency-Key debe ser un UUID.'));
    }

    const tenantId = TenantContext.require();
    const userId = req.user?.userId as string;
    const huella = createHash('sha256')
      .update(`${req.method} ${req.route?.path ?? ''} ${JSON.stringify(req.body ?? {})}`)
      .digest('hex');

    return from(this.claim(tenantId, userId, key.toLowerCase(), huella)).pipe(
      switchMap((claim) => {
        if (claim.owned) return this.execute(claim.id, next, res);
        return this.replay(claim.stored, huella, res);
      }),
    );
  }

  /** Takes the key for this request, or returns what is already stored under it. */
  private async claim(tenantId: string, userId: string, key: string, huella: string) {
    const inserted = await this.dataSource.query(
      `INSERT INTO idempotencia (tenant_id, usuario_id, clave, huella)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, usuario_id, clave) DO UPDATE SET creado_en = now()
         WHERE idempotencia.estado = 'EN_PROCESO'
           AND idempotencia.huella = EXCLUDED.huella
           AND idempotencia.creado_en < now() - interval '${IdempotencyInterceptor.STALE_AFTER}'
       RETURNING id`,
      [tenantId, userId, key, huella],
    );
    if (inserted.length) return { owned: true as const, id: inserted[0].id as string };

    const [stored] = await this.dataSource.query(
      `SELECT huella, estado, status_code, respuesta FROM idempotencia
       WHERE tenant_id = $1 AND usuario_id = $2 AND clave = $3`,
      [tenantId, userId, key],
    );
    return { owned: false as const, stored: stored as StoredKey };
  }

  private execute(id: string, next: CallHandler, res: any): Observable<unknown> {
    return next.handle().pipe(
      switchMap((body) =>
        from(
          this.dataSource.query(
            `UPDATE idempotencia SET estado = 'COMPLETADA', status_code = $2, respuesta = $3::jsonb WHERE id = $1`,
            [id, res.statusCode, JSON.stringify(body ?? null)],
          ),
        ).pipe(switchMap(() => of(body))),
      ),
      catchError((err) =>
        from(this.dataSource.query(`DELETE FROM idempotencia WHERE id = $1`, [id])).pipe(
          switchMap(() => throwError(() => err)),
        ),
      ),
    );
  }

  private replay(stored: StoredKey | undefined, huella: string, res: any): Observable<unknown> {
    // The row vanished between the claim and the read (its owner failed): ask the client to retry
    if (!stored) {
      res.setHeader('Retry-After', '1');
      throw new ConflictException('La solicitud anterior con esta clave terminó con error; reintenta.');
    }
    if (stored.huella !== huella) {
      throw new UnprocessableEntityException('Esta Idempotency-Key ya se usó con una solicitud distinta.');
    }
    if (stored.estado === 'EN_PROCESO') {
      res.setHeader('Retry-After', '2');
      throw new ConflictException('Una solicitud con esta Idempotency-Key sigue en proceso.');
    }
    res.setHeader('Idempotent-Replay', 'true');
    res.status(stored.status_code ?? 200);
    return of(stored.respuesta);
  }
}
