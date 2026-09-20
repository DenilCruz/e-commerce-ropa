import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class ActualizarResenaDto {
  @ApiPropertyOptional({ description: 'Calificación del 1 al 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  calificacion?: number;

  @ApiPropertyOptional({ description: 'Comentario opcional sobre el producto' })
  @IsString()
  @IsOptional()
  comentario?: string;
}
