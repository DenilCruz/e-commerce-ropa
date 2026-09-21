import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Param, 
  Query, 
  UseInterceptors, 
  UploadedFile, 
  Req, 
  UseGuards 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { ArchivosService } from './uploads.service';
import { ArchivoRespuestaDto, EstadoCloudinaryDto } from './dto/archivo-respuesta.dto';

@ApiTags('Archivos y Recursos Multimedia')
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly servicioArchivos: ArchivosService) {}

  @Get('estado-cloudinary')
  @ApiOperation({ summary: 'HU-80: Consultar estado de conexión e integración con Cloudinary' })
  @ApiResponse({ status: 200, type: EstadoCloudinaryDto })
  obtenerEstadoCloudinary(): EstadoCloudinaryDto {
    return this.servicioArchivos.obtenerEstadoCloudinary();
  }

  @Post('subir')
  @ApiOperation({ summary: 'HU-80, HU-82, HU-83: Subir, optimizar a WebP y almacenar imagen' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categoria: {
          type: 'string',
          description: 'Carpeta o categoría de la imagen (ej: productos, perfiles, poleras, vestidos)',
          example: 'productos',
        },
        imagen: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPG, PNG, WebP, AVIF). Se comprime automáticamente a WebP.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: ArchivoRespuestaDto })
  @UseInterceptors(FileInterceptor('imagen'))
  subirImagen(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<ArchivoRespuestaDto> {
    return this.servicioArchivos.procesarSubida(file, req);
  }

  @Get()
  @ApiOperation({ summary: 'HU-81: Listar galería multimedia con detección de imágenes en uso u obsoletas' })
  @ApiQuery({ name: 'categoria', required: false, description: 'Filtrar por categoría (ej: productos, perfiles)' })
  @ApiQuery({ name: 'filtroUso', required: false, enum: ['todos', 'en_uso', 'obsoleto'] })
  obtenerArchivos(
    @Query('categoria') categoria?: string,
    @Query('filtroUso') filtroUso?: 'todos' | 'en_uso' | 'obsoleto',
  ) {
    return this.servicioArchivos.obtenerArchivos(categoria, filtroUso);
  }

  @Delete('obsoletas')
  @ApiOperation({ summary: 'HU-81: Limpiar en lote todas las imágenes obsoletas / no vinculadas' })
  limpiarObsoletas() {
    return this.servicioArchivos.limpiarArchivosObsoletos();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'HU-81: Eliminar una imagen de Cloudinary o del almacenamiento local' })
  eliminarArchivo(@Param('id') id: string) {
    return this.servicioArchivos.eliminarArchivo(id);
  }
}
