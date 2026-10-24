import { AsyncLocalStorage } from 'async_hooks';
import { UnauthorizedException } from '@nestjs/common';

interface TenantStore {
  tenantId?: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

/** Per-request holder of the active tenant (store). */
export const TenantContext = {
  run<T>(fn: () => T): T {
    return storage.run({}, fn);
  },

  set(tenantId: string): void {
    const store = storage.getStore();
    if (store) store.tenantId = tenantId;
  },

  get(): string | undefined {
    return storage.getStore()?.tenantId;
  },

  require(): string {
    const tenantId = storage.getStore()?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('No se pudo determinar la tienda de la solicitud.');
    }
    return tenantId;
  },
};
