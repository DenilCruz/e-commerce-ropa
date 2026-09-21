import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { PaymentEntity } from './entities/payment.entity';
import { PaymentMethodEntity } from './entities/payment-method.entity';
import { OrderEntity } from '../pedidos/entities/order.entity';
import { OrderItemEntity } from '../pedidos/entities/order-item.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { ProductEntity } from '../productos/entities/product.entity';
import { CartEntity } from '../carrito/entities/cart.entity';
import { CartItemEntity } from '../carrito/entities/cart-item.entity';
import { CouponEntity } from '../cupones/entities/coupon.entity';
import { UserEntity } from '../usuarios/entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PaymentEntity,
      PaymentMethodEntity,
      OrderEntity,
      OrderItemEntity,
      ProductVariantEntity,
      ProductEntity,
      CartEntity,
      CartItemEntity,
      CouponEntity,
      UserEntity,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
