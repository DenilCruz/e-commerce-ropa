import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistEntity } from './entities/wishlist.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { CartModule } from '../carrito/cart.module';
import { FavoritosService } from './wishlist.service';
import { FavoritosController } from './wishlist.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WishlistEntity, ProductVariantEntity]),
    CartModule,
  ],
  controllers: [FavoritosController],
  providers: [FavoritosService],
  exports: [FavoritosService],
})
export class WishlistModule {}
