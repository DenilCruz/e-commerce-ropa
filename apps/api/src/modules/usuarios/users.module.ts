import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { AddressEntity } from './entities/address.entity';
import { UsuariosService } from './users.service';
import { UsuariosController } from './users.controller';
import { StoresModule } from '../tiendas/stores.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity, AddressEntity]), StoresModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsersModule {}
