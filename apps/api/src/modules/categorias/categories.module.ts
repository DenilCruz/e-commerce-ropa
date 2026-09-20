import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasService } from './categories.service';
import { CategoriasController } from './categories.controller';
import { CategoriaEntity } from './entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoriaEntity])],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService],
})
export class CategoriesModule {}
