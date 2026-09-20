import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AgregarItemCarritoDto } from './agregar-item-carrito.dto';

export class SincronizarCarritoDto {
  @ApiProperty({
    type: [AgregarItemCarritoDto],
    description: 'Lista de items del carrito temporal acumulados por el visitante antes de iniciar sesión',
  })
  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => AgregarItemCarritoDto)
  items: AgregarItemCarritoDto[];
}
