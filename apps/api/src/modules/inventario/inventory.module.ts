import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { InventarioService } from './inventory.service';
import { InventarioController } from './inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductVariantEntity])],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventoryModule {}
