import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AgregarItemCarritoDto } from './agregar-item-carrito.dto';

export class CalcularCarritoTemporalDto {
  @ApiProperty({
    type: [AgregarItemCarritoDto],
    description: 'Items del carrito temporal de visitante para calcular subtotales, total y validar stock',
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => AgregarItemCarritoDto)
  items: AgregarItemCarritoDto[];
}
