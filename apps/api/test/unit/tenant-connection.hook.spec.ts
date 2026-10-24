import { installTenantConnectionHook } from '../../src/common/tenant/tenant-connection.hook';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('installTenantConnectionHook', () => {
  const buildDataSource = () => {
    const connection = { query: jest.fn().mockResolvedValue(undefined) };
    const poolRelease = jest.fn();
    const driver: any = {
      obtainMasterConnection: jest.fn().mockResolvedValue([connection, poolRelease]),
    };
    return { dataSource: { driver } as any, driver, connection, poolRelease };
  };

  it('publishes the active tenant and user on every connection it hands out', async () => {
    const { dataSource, driver, connection } = buildDataSource();
    installTenantConnectionHook(dataSource);

    await TenantContext.run(async () => {
      TenantContext.set('tenant-1');
      TenantContext.setUser('user-1');
      await driver.obtainMasterConnection();
    });

    expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('set_config'), ['tenant-1', 'user-1']);
  });

  it('publishes an empty tenant when there is no request context (RLS then shows nothing)', async () => {
    const { dataSource, driver, connection } = buildDataSource();
    installTenantConnectionHook(dataSource);

    await driver.obtainMasterConnection();

    expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('set_config'), ['', '']);
  });

  it('clears the tenant before the connection goes back to the pool', async () => {
    const { dataSource, driver, connection, poolRelease } = buildDataSource();
    installTenantConnectionHook(dataSource);

    const [, release] = await TenantContext.run(async () => {
      TenantContext.set('tenant-1');
      return driver.obtainMasterConnection();
    });
    release();
    await new Promise((resolve) => setImmediate(resolve));

    expect(connection.query).toHaveBeenLastCalledWith(expect.stringContaining("set_config('app.tenant_id', ''"));
    expect(poolRelease).toHaveBeenCalledWith();
  });

  it('destroys the connection when the tenant could not be published', async () => {
    const { dataSource, driver, connection, poolRelease } = buildDataSource();
    const failure = new Error('connection lost');
    connection.query.mockRejectedValueOnce(failure);
    installTenantConnectionHook(dataSource);

    await expect(driver.obtainMasterConnection()).rejects.toThrow('connection lost');
    expect(poolRelease).toHaveBeenCalledWith(failure);
  });

  it('is idempotent: installing twice wraps the driver only once', async () => {
    const { dataSource, driver, connection } = buildDataSource();
    installTenantConnectionHook(dataSource);
    installTenantConnectionHook(dataSource);

    await driver.obtainMasterConnection();

    expect(connection.query).toHaveBeenCalledTimes(1);
  });
});
