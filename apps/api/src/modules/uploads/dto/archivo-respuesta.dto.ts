import { ApiProperty } from '@nestjs/swagger';

export class ArchivoRespuestaDto {
  @ApiProperty({ description: 'ID único del registro de archivo' })
  id?: string;

  @ApiProperty({ description: 'URL pública de la imagen (Cloudinary HTTPS o local)' })
  url: string;

  @ApiProperty({ description: 'Nombre del archivo generado' })
  nombre: string;

  @ApiProperty({ description: 'Nombre original del archivo cargado' })
  nombreOriginal?: string;

  @ApiProperty({ description: 'Identificador público en Cloudinary (si aplica)' })
  publicId?: string;

  @ApiProperty({ description: 'Formato final de la imagen', example: 'webp' })
  formato: string;

  @ApiProperty({ description: 'Peso final en bytes tras compresión' })
  tamanio: number;

  @ApiProperty({ description: 'Peso original antes de compresión en bytes' })
  tamanioOriginal?: number;

  @ApiProperty({ description: 'Porcentaje de reducción de peso logrado', example: 65 })
  porcentajeAhorro?: number;

  @ApiProperty({ description: 'Medio de almacenamiento utilizado', enum: ['cloudinary', 'local'] })
  almacenamiento: 'cloudinary' | 'local';

  @ApiProperty({ description: 'Categoría o carpeta asignada a la imagen' })
  categoria: string;
}

export class EstadoCloudinaryDto {
  @ApiProperty({ description: 'Indica si Cloudinary está configurado correctamente con credenciales válidas' })
  configurado: boolean;

  @ApiProperty({ description: 'Nombre de la nube (cloud name) configurada' })
  cloudName?: string;

  @ApiProperty({ description: 'Modo de almacenamiento por defecto', enum: ['cloudinary', 'local'] })
  modoPorDefecto: 'cloudinary' | 'local';
}
