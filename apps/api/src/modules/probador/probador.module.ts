import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProbadorService } from './probador.service';
import { ProbadorController } from './probador.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ProbadorController],
  providers: [ProbadorService],
  exports: [ProbadorService],
})
export class ProbadorModule {}
