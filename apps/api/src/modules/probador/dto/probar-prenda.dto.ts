import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum CategoriaPrendaVTON {
  TOPS = 'tops',
  BOTTOMS = 'bottoms',
  DRESSES = 'dresses',
}

export class ProbarPrendaDto {
  @ApiProperty({
    description: 'URL o Data URI (base64) de la foto de la persona',
    example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
  })
  @IsNotEmpty({ message: 'La foto de la persona es obligatoria.' })
  @IsString()
  fotoPersona: string;

  @ApiProperty({
    description: 'URL de la foto de la prenda del catálogo',
    example: 'http://localhost:3000/uploads/casual_tshirt_1789943819927.jpg',
  })
  @IsNotEmpty({ message: 'La foto de la prenda es obligatoria.' })
  @IsString()
  fotoPrenda: string;

  @ApiProperty({
    description: 'Categoría de la prenda para el modelo IDM-VTON',
    enum: CategoriaPrendaVTON,
    default: CategoriaPrendaVTON.TOPS,
  })
  @IsOptional()
  @IsEnum(CategoriaPrendaVTON, { message: 'La categoría debe ser tops, bottoms o dresses.' })
  categoria?: CategoriaPrendaVTON = CategoriaPrendaVTON.TOPS;

  @ApiProperty({
    description: 'Nombre de la prenda para el asesor de estilo de Groq',
    example: 'Polera Básica de Algodón',
    required: false,
  })
  @IsOptional()
  @IsString()
  nombrePrenda?: string;

  @ApiProperty({
    description: 'Talla consultada',
    example: 'M',
    required: false,
  })
  @IsOptional()
  @IsString()
  talla?: string;

  @ApiProperty({
    description: 'Color de la prenda consultada',
    example: 'Gris Jaspeado',
    required: false,
  })
  @IsOptional()
  @IsString()
  color?: string;
}
