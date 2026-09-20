import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class CambiarEstadoCuponDto {
  @ApiProperty({
    example: false,
    description: 'Nuevo estado activo (true para activar, false para desactivar)',
  })
  @IsBoolean({ message: 'El estado debe ser booleano (true o false)' })
  @IsNotEmpty({ message: 'El estado es requerido' })
  activo: boolean;
}
