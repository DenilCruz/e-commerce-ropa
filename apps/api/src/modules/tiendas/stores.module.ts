import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreEntity } from './entities/store.entity';
import { UserStoreEntity } from './entities/user-store.entity';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantIsolationBootstrap } from './tenant-isolation.bootstrap';
import { StoresService } from './stores.service';
import { UserEntity } from '../usuarios/entities/user.entity';
import { RoleEntity } from '../usuarios/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StoreEntity, UserStoreEntity, UserEntity, RoleEntity])],
  providers: [TenantResolverService, TenantMiddleware, TenantIsolationBootstrap, StoresService],
  exports: [TypeOrmModule, TenantResolverService, TenantMiddleware, StoresService],
})
export class StoresModule {}
