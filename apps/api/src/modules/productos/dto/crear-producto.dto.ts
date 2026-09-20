import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearVarianteDto {
  @ApiPropertyOptional({ description: 'ID de la Talla' })
  @IsUUID()
  @IsOptional()
  tallaId?: string;

  @ApiPropertyOptional({ description: 'ID del Color' })
  @IsUUID()
  @IsOptional()
  colorId?: string;

  @ApiProperty({ description: 'SKU o Código de barras único' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({ description: 'Stock inicial', default: 0 })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ description: 'Precio adicional de esta variante', default: 0 })
  @IsNumber()
  @IsOptional()
  precioExtra?: number;
}

export class CrearImagenDto {
  @ApiProperty({ description: 'URL de la imagen (ej: Cloudinary)' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Indica si es la imagen principal de portada', default: false })
  @IsBoolean()
  @IsOptional()
  principal?: boolean;
}

export class CrearProductoDto {
  @ApiProperty({ description: 'ID de la categoría a la que pertenece' })
  @IsUUID()
  @IsNotEmpty()
  categoriaId: string;

  @ApiPropertyOptional({ description: 'ID de la marca' })
  @IsUUID()
  @IsOptional()
  marcaId?: string;

  @ApiProperty({ description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción larga del producto' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ description: 'Precio base del producto' })
  @IsNumber()
  @IsNotEmpty()
  precio: number;

  @ApiPropertyOptional({ description: 'Indica si el producto está destacado' })
  @IsBoolean()
  @IsOptional()
  destacado?: boolean;

  @ApiPropertyOptional({ type: [CrearVarianteDto], description: 'Variantes del producto (Tallas, colores, stock)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearVarianteDto)
  @IsOptional()
  variantes?: CrearVarianteDto[];

  @ApiPropertyOptional({ type: [CrearImagenDto], description: 'Imágenes del producto' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearImagenDto)
  @IsOptional()
  imagenes?: CrearImagenDto[];
}
