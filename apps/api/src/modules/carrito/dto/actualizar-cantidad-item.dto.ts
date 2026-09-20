import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarCantidadItemDto {
  @ApiProperty({
    example: 3,
    description: 'Nueva cantidad para el item (0 para eliminarlo)',
  })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad: number;
}
