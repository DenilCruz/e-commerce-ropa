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
import { MailModule } from '../mail/mail.module';
import { ShippingEntity } from '../envios/entities/shipping.entity';
import { ShippingMethodEntity } from '../envios/entities/shipping-method.entity';
import { OrderHistoryEntity } from '../pedidos/entities/order-history.entity';

@Module({
  imports: [
    ConfigModule,
    MailModule,
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
      ShippingEntity,
      ShippingMethodEntity,
      OrderHistoryEntity,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
