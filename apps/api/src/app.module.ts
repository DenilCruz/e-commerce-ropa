import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from './modules/mail/mail.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProbadorModule } from './modules/probador/probador.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: false,
      }),
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
    ProbadorModule,
  ],
})
export class AppModule {}
