import { IdempotenciaLimpiezaService } from '../../src/common/idempotency/idempotencia-limpieza.service';

describe('IdempotenciaLimpiezaService', () => {
  const env = { ...process.env };
  let query: jest.Mock;
  let service: IdempotenciaLimpiezaService;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'production';
    delete process.env.IDEMPOTENCIA_PURGA;
    query = jest.fn().mockResolvedValue([{ borradas: 3 }]);
    service = new IdempotenciaLimpiezaService({ query } as any);
    warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it('purges keys older than 45 days at start and then every 6 hours', async () => {
    service.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('SELECT idempotencia_purgar($1) AS borradas', [45]);

    await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(query).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('does not keep the process alive and stops on destroy', async () => {
    const unref = jest.fn();
    const spy = jest.spyOn(global, 'setInterval').mockReturnValue({ unref } as any);
    service.onModuleInit();
    expect(unref).toHaveBeenCalled();
    spy.mockRestore();

    service.onModuleInit();
    service.onModuleDestroy();
    query.mockClear();
    await jest.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);
    expect(query).not.toHaveBeenCalled();
  });

  it('does nothing when IDEMPOTENCIA_PURGA=off', async () => {
    process.env.IDEMPOTENCIA_PURGA = 'off';
    service.onModuleInit();
    await jest.advanceTimersByTimeAsync(7 * 60 * 60 * 1000);
    expect(query).not.toHaveBeenCalled();
  });

  it('does nothing under tests', async () => {
    process.env.NODE_ENV = 'test';
    service.onModuleInit();
    await jest.advanceTimersByTimeAsync(7 * 60 * 60 * 1000);
    expect(query).not.toHaveBeenCalled();
  });

  it('returns the deleted count', async () => {
    await expect(service.purgar()).resolves.toBe(3);
  });

  it('survives a database without the function and warns only once', async () => {
    const missing: any = new Error('function idempotencia_purgar(integer) does not exist');
    missing.code = '42883';
    query.mockRejectedValue(missing);

    await expect(service.purgar()).resolves.toBe(0);
    await expect(service.purgar()).resolves.toBe(0);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/database\/18/);
  });

  it('never throws on other failures either', async () => {
    query.mockRejectedValue(new Error('connection lost'));

    await expect(service.purgar()).resolves.toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('connection lost'));
  });
});
