import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './entities/product.entity';
import { ProductVariantEntity } from './entities/product-variant.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { BrandEntity } from './entities/brand.entity';
import { SizeEntity } from './entities/size.entity';
import { ColorEntity } from './entities/color.entity';
import { CategoriaEntity } from '../categorias/entities/category.entity';
import { StoresModule } from '../tiendas/stores.module';
import { ProductosService } from './products.service';
import { ProductosController } from './products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      ProductVariantEntity,
      ProductImageEntity,
      BrandEntity,
      SizeEntity,
      ColorEntity,
      CategoriaEntity,
    ]),
    StoresModule,
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductsModule {}
