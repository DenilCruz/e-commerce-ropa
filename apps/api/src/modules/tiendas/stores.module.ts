import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreEntity } from './entities/store.entity';
import { UserStoreEntity } from './entities/user-store.entity';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantIsolationBootstrap } from './tenant-isolation.bootstrap';
import { StoresService } from './stores.service';
import { PlanLimitsService } from './plan-limits.service';
import { UserEntity } from '../usuarios/entities/user.entity';
import { RoleEntity } from '../usuarios/entities/role.entity';
import { ProductEntity } from '../productos/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreEntity,
      UserStoreEntity,
      UserEntity,
      RoleEntity,
      ProductEntity,
    ]),
  ],
  providers: [
    TenantResolverService,
    TenantMiddleware,
    TenantIsolationBootstrap,
    StoresService,
    PlanLimitsService,
  ],
  exports: [
    TypeOrmModule,
    TenantResolverService,
    TenantMiddleware,
    StoresService,
    PlanLimitsService,
  ],
})
export class StoresModule {}

