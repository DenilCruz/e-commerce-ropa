import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class Generar3DDto {
  @ApiProperty({
    description: 'URL o Data URI (base64) de la foto de la prenda para reconstrucción 3D',
    example: 'http://localhost:3000/uploads/jacket_1789943819927.jpg',
  })
  @IsNotEmpty({ message: 'La foto de la prenda es obligatoria.' })
  @IsString()
  fotoPrenda: string;

  @ApiProperty({
    description: 'Nombre o título descriptivo de la prenda',
    example: 'Chaqueta de Cuero Estilo Moto',
    required: false,
  })
  @IsOptional()
  @IsString()
  nombrePrenda?: string;

  @ApiProperty({
    description: 'ID del producto en la base de datos para clave de caché',
    example: 'prod-12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  productoId?: string;

  @ApiProperty({
    description: 'Categoría de la prenda (tops, bottoms, dresses, jackets, shoes)',
    example: 'tops',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoria?: string;
}
