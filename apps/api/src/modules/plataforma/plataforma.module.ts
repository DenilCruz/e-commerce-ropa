import { Module } from '@nestjs/common';
import { StoresModule } from '../tiendas/stores.module';
import { PlataformaController } from './plataforma.controller';
import { PlataformaService } from './plataforma.service';

@Module({
  imports: [StoresModule],
  controllers: [PlataformaController],
  providers: [PlataformaService],
})
export class PlataformaModule {}
