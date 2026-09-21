import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class MoverFavoritoAlCarritoDto {
  @ApiProperty({ description: 'ID del usuario autenticado' })
  @IsUUID('4', { message: 'El usuarioId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El usuarioId es obligatorio' })
  usuarioId: string;

  @ApiProperty({ description: 'ID del producto en favoritos' })
  @IsUUID('4', { message: 'El productoId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El productoId es obligatorio' })
  productoId: string;

  @ApiPropertyOptional({ description: 'ID de la variante específica (talla/color), si se seleccionó' })
  @IsUUID('4', { message: 'El varianteId debe ser un UUID válido' })
  @IsOptional()
  varianteId?: string;

  @ApiPropertyOptional({ description: 'Cantidad a mover al carrito', default: 1 })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  @IsOptional()
  cantidad?: number = 1;

  @ApiPropertyOptional({ description: 'Indica si se debe remover de favoritos al pasar al carrito', default: true })
  @IsBoolean()
  @IsOptional()
  eliminarDeFavoritos?: boolean = true;
}
