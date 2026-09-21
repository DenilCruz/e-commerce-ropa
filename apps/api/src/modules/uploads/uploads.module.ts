import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ArchivoEntity } from './entities/archivo.entity';
import { ProductImageEntity } from '../productos/entities/product-image.entity';
import { CategoriaEntity } from '../categorias/entities/category.entity';
import { UserEntity } from '../usuarios/entities/user.entity';
import { ArchivosService } from './uploads.service';
import { ArchivosController } from './uploads.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ArchivoEntity,
      ProductImageEntity,
      CategoriaEntity,
      UserEntity,
    ]),
    MulterModule.register({
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Solo se permiten archivos de imagen.'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo de entrada antes de compresión
      },
    }),
  ],
  controllers: [ArchivosController],
  providers: [ArchivosService],
  exports: [ArchivosService],
})
export class UploadsModule {}
