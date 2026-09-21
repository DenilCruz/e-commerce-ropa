import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearProductoDto } from './crear-producto.dto';

export class ActualizarProductoDto extends PartialType(CrearProductoDto) {
  @ApiPropertyOptional({ description: 'Estado activo o inactivo del producto' })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
