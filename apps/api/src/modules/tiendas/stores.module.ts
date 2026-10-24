import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreEntity } from './entities/store.entity';
import { UserStoreEntity } from './entities/user-store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StoreEntity, UserStoreEntity])],
  exports: [TypeOrmModule],
})
export class StoresModule {}
