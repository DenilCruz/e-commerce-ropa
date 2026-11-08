import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClienteMostradorEntity } from './entities/cliente-mostrador.entity';
import { ClientesMostradorController } from './clientes-mostrador.controller';
import { ClientesMostradorService } from './clientes-mostrador.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClienteMostradorEntity])],
  controllers: [ClientesMostradorController],
  providers: [ClientesMostradorService],
  exports: [ClientesMostradorService],
})
export class ClientesMostradorModule {}
