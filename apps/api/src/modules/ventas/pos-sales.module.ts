import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethodEntity } from '../pagos/entities/payment-method.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { StoresModule } from '../tiendas/stores.module';
import { PosSalesController } from './pos-sales.controller';
import { PosSalesService } from './pos-sales.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethodEntity]), NotificacionesModule, StoresModule],
  controllers: [PosSalesController],
  providers: [PosSalesService],
})
export class PosSalesModule {}
