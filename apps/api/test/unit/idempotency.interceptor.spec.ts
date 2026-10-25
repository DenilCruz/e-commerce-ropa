import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { TenantContext } from '../../src/common/tenant/tenant-context';
import { IdempotencyInterceptor } from '../../src/common/idempotency/idempotency.interceptor';

const KEY = '3f9c1a52-8d7e-4b6a-9c11-2e5a7d0b4f10';

describe('IdempotencyInterceptor', () => {
  let dataSource: { query: jest.Mock };
  let interceptor: IdempotencyInterceptor;
  let res: any;

  const contextFor = (headers: Record<string, string>, body: unknown = { metodoEnvioId: 'x' }) => {
    res = { statusCode: 201, setHeader: jest.fn(), status: jest.fn().mockImplementation((s) => ((res.statusCode = s), res)) };
    const req = { headers, body, method: 'POST', route: { path: '/payments/cash-on-delivery' }, user: { userId: 'user-1' } };
    return { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as any;
  };

  const run = (headers: Record<string, string>, handle: () => Observable<unknown> = () => of({ ok: true }), body?: unknown) =>
    TenantContext.runAs('tenant-1', 'user-1', () =>
      lastValueFrom(interceptor.intercept(contextFor(headers, body), { handle } as any)),
    );

  beforeEach(() => {
    dataSource = { query: jest.fn() };
    interceptor = new IdempotencyInterceptor(dataSource as any);
  });

  it('runs the handler untouched when the request carries no key', async () => {
    const handle = jest.fn(() => of({ ok: true }));

    await expect(run({}, handle)).resolves.toEqual({ ok: true });
    expect(handle).toHaveBeenCalledTimes(1);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('rejects a key that is not a UUID', async () => {
    await expect(run({ 'idempotency-key': 'abc' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('claims the key, runs the handler once and stores the response', async () => {
    dataSource.query.mockResolvedValueOnce([{ id: 'row-1' }]).mockResolvedValueOnce([]);
    const handle = jest.fn(() => of({ orden: 'A' }));

    await expect(run({ 'idempotency-key': KEY }, handle)).resolves.toEqual({ orden: 'A' });

    expect(handle).toHaveBeenCalledTimes(1);
    const [sql, params] = dataSource.query.mock.calls[1];
    expect(sql).toMatch(/UPDATE idempotencia/);
    expect(params).toEqual(['row-1', 201, JSON.stringify({ orden: 'A' })]);
  });

  it('replays the stored response of a finished key without running the handler', async () => {
    // the fingerprint of the stored row must match the request: capture it from the claim call
    const claimed: string[] = [];
    dataSource.query
      .mockImplementationOnce(async (_sql: string, params: string[]) => {
        claimed.push(params[3]);
        return [];
      })
      .mockImplementationOnce(async () => [
        { huella: claimed[0], estado: 'COMPLETADA', status_code: 201, respuesta: { orden: 'A' } },
      ]);
    const handle = jest.fn(() => of({ orden: 'B' }));

    await expect(run({ 'idempotency-key': KEY }, handle)).resolves.toEqual({ orden: 'A' });

    expect(handle).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Idempotent-Replay', 'true');
    expect(res.statusCode).toBe(201);
  });

  it('answers 409 with Retry-After while the first request is still running', async () => {
    const claimed: string[] = [];
    dataSource.query
      .mockImplementationOnce(async (_sql: string, params: string[]) => {
        claimed.push(params[3]);
        return [];
      })
      .mockImplementationOnce(async () => [{ huella: claimed[0], estado: 'EN_PROCESO', status_code: null, respuesta: null }]);
    const handle = jest.fn(() => of({}));

    await expect(run({ 'idempotency-key': KEY }, handle)).rejects.toBeInstanceOf(ConflictException);

    expect(handle).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '2');
  });

  it('answers 422 when the key was used with a different body', async () => {
    dataSource.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ huella: 'f'.repeat(64), estado: 'COMPLETADA', status_code: 201, respuesta: {} }]);

    await expect(run({ 'idempotency-key': KEY })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('releases the key when the handler fails so the client can retry', async () => {
    dataSource.query.mockResolvedValueOnce([{ id: 'row-1' }]).mockResolvedValueOnce([]);
    const boom = new ConflictException('Stock insuficiente');

    await expect(run({ 'idempotency-key': KEY }, () => throwError(() => boom))).rejects.toBe(boom);

    const [sql, params] = dataSource.query.mock.calls[1];
    expect(sql).toMatch(/DELETE FROM idempotencia/);
    expect(params).toEqual(['row-1']);
  });
});
