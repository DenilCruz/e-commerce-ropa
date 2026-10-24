import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreEntity } from './entities/store.entity';
import { UserStoreEntity } from './entities/user-store.entity';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantMiddleware } from './tenant.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([StoreEntity, UserStoreEntity])],
  providers: [TenantResolverService, TenantMiddleware],
  exports: [TypeOrmModule, TenantResolverService, TenantMiddleware],
})
export class StoresModule {}
