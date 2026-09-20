import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ArchivosService } from './uploads.service';
import { ArchivosController } from './uploads.controller';

@Module({
  imports: [
    // Configuramos Multer para guardar en la carpeta local 'uploads'
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const ruta = process.cwd().endsWith('apps/api')
            ? join(process.cwd(), 'uploads')
            : join(process.cwd(), 'apps', 'api', 'uploads');
          cb(null, ruta);
        },
        filename: (req, file, cb) => {
          const nombreArchivo = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, nombreArchivo);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // Limite de 5 MB
      },
    }),
  ],
  controllers: [ArchivosController],
  providers: [ArchivosService],
  exports: [ArchivosService],
})
export class UploadsModule {}
