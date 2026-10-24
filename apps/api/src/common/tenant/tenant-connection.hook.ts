import { DataSource } from 'typeorm';
import { TenantContext } from './tenant-context';

/**
 * Publishes the active tenant and user to Postgres on every connection taken from the pool,
 * so the row-level security policies know who is asking. With no value they see nothing.
 */
export function installTenantConnectionHook(dataSource: DataSource): void {
  const driver: any = dataSource.driver;
  if (driver.tenantHookInstalled) return;

  const obtainOriginal = driver.obtainMasterConnection.bind(driver);
  driver.obtainMasterConnection = async () => {
    const [connection, release] = await obtainOriginal();
    try {
      await connection.query("SELECT set_config('app.tenant_id', $1, false), set_config('app.user_id', $2, false)", [
        TenantContext.get() ?? '',
        TenantContext.getUser() ?? '',
      ]);
    } catch (err) {
      release(err);
      throw err;
    }
    return [connection, release];
  };
  driver.tenantHookInstalled = true;
}
