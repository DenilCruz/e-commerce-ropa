import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AgregarItemCarritoDto {
  @ApiPropertyOptional({
    example: 'd9b2d63d-a342-4752-9477-873b22cfbbde',
    description: 'ID de la variante específica del producto (si ya se conoce)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El varianteId debe ser un UUID válido' })
  varianteId?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID del producto base (usado junto a tallaId y colorId)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El productoId debe ser un UUID válido' })
  productoId?: string;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'ID de la talla seleccionada (HU-40)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El tallaId debe ser un UUID válido' })
  tallaId?: string;

  @ApiPropertyOptional({
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    description: 'ID del color seleccionado (HU-40)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El colorId debe ser un UUID válido' })
  colorId?: string;

  @ApiProperty({
    example: 1,
    default: 1,
    description: 'Cantidad de unidades a agregar al carrito (mínimo 1)',
  })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima a agregar es 1' })
  cantidad: number = 1;
}
