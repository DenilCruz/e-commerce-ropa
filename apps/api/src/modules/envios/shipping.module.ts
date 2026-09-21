import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShippingEntity } from './entities/shipping.entity';
import { ShippingMethodEntity } from './entities/shipping-method.entity';
import { OrderEntity } from '../pedidos/entities/order.entity';
import { OrderHistoryEntity } from '../pedidos/entities/order-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShippingEntity,
      ShippingMethodEntity,
      OrderEntity,
      OrderHistoryEntity,
    ]),
  ],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService, TypeOrmModule],
})
export class ShippingModule {}
