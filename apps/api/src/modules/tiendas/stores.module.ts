import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreEntity } from './entities/store.entity';
import { UserStoreEntity } from './entities/user-store.entity';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantIsolationBootstrap } from './tenant-isolation.bootstrap';

@Module({
  imports: [TypeOrmModule.forFeature([StoreEntity, UserStoreEntity])],
  providers: [TenantResolverService, TenantMiddleware, TenantIsolationBootstrap],
  exports: [TypeOrmModule, TenantResolverService, TenantMiddleware],
})
export class StoresModule {}
