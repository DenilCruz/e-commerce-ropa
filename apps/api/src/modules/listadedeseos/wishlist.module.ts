import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistEntity } from './entities/wishlist.entity';
import { FavoritosService } from './wishlist.service';
import { FavoritosController } from './wishlist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WishlistEntity])],
  controllers: [FavoritosController],
  providers: [FavoritosService],
  exports: [FavoritosService],
})
export class WishlistModule {}
