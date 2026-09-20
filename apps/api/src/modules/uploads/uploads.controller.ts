import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ArchivosService } from './uploads.service';

@ApiTags('Archivos y Recursos (Uploads)')
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly servicioArchivos: ArchivosService) {}

  @Post('subir')
  @ApiOperation({ summary: 'Subir una imagen al servidor (ej. foto de producto o perfil)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imagen: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPG, PNG, WEBP. Max 5MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('imagen'))
  subirImagen(@UploadedFile() file: Express.Multer.File) {
    return this.servicioArchivos.procesarSubida(file);
  }
}
