import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AplicarCuponDto {
  @ApiProperty({
    example: 'VERANO2026',
    description: 'Código del cupón a aplicar',
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código del cupón es requerido' })
  codigo: string;

  @ApiProperty({
    example: 250.5,
    description: 'Monto subtotal actual del carrito sobre el cual se calculará el descuento',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'El subtotal debe ser un número' })
  @IsPositive({ message: 'El subtotal debe ser mayor a 0' })
  subtotal: number;
}
