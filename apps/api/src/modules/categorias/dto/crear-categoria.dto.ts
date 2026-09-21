import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsUUID } from 'class-validator';

export class CrearCategoriaDto {
  @ApiProperty({ description: 'Nombre de la categoría' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción de la categoría' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'ID de la categoría padre (para subcategorías)' })
  @IsUUID()
  @IsOptional()
  padre_id?: string;

  @ApiPropertyOptional({ description: 'Indica si la categoría está activa', default: true })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;

  @ApiPropertyOptional({ description: 'Orden de visualización', default: 0 })
  @IsInt()
  @IsOptional()
  orden?: number;

  @ApiPropertyOptional({ description: 'URL o ruta de la imagen de la categoría' })
  @IsString()
  @IsOptional()
  imagen?: string;
}
