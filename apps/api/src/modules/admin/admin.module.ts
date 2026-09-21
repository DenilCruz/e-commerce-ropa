import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DynamicReportsService } from './dynamic-reports/dynamic-reports.service';
import { OrderEntity } from '../pedidos/entities/order.entity';
import { OrderItemEntity } from '../pedidos/entities/order-item.entity';
import { UserEntity } from '../usuarios/entities/user.entity';
import { ProductEntity } from '../productos/entities/product.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { CouponEntity } from '../cupones/entities/coupon.entity';
import { PaymentEntity } from '../pagos/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      UserEntity,
      ProductEntity,
      ProductVariantEntity,
      CouponEntity,
      PaymentEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, DynamicReportsService],
  exports: [AdminService, DynamicReportsService],
})
export class AdminModule {}
