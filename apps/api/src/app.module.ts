import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';

// Modules
import { AuthModule } from './modules/autenticacion/auth.module';
import { UsersModule } from './modules/usuarios/users.module';
import { ProductsModule } from './modules/productos/products.module';
import { CategoriesModule } from './modules/categorias/categories.module';
import { InventoryModule } from './modules/inventario/inventory.module';
import { CartModule } from './modules/carrito/cart.module';
import { OrdersModule } from './modules/pedidos/orders.module';
import { PaymentsModule } from './modules/pagos/payments.module';
import { ShippingModule } from './modules/envios/shipping.module';
import { ReviewsModule } from './modules/reseñas/reviews.module';
import { CouponsModule } from './modules/cupones/coupons.module';
import { WishlistModule } from './modules/listadedeseos/wishlist.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { MailModule } from './modules/mail/mail.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    ReviewsModule,
    CouponsModule,
    WishlistModule,
    UploadsModule,
    MailModule,
    AdminModule,
  ],
})
export class AppModule {}
