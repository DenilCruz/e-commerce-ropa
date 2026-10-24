import { ForbiddenException } from '@nestjs/common';
import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { TenantContext } from './tenant-context';

/** Stamps tenantId on every new row of a tenant-scoped entity and blocks cross-tenant inserts. */
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>): void {
    if (!event.entity || !event.metadata.findColumnWithPropertyName('tenantId')) return;

    const activeTenant = TenantContext.require();
    if (event.entity.tenantId && event.entity.tenantId !== activeTenant) {
      throw new ForbiddenException('No se puede escribir datos en otra tienda.');
    }
    event.entity.tenantId = activeTenant;
  }
}
