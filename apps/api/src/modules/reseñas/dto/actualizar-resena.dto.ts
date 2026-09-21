import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString, IsOptional, IsUUID } from 'class-validator';

export class ActualizarResenaDto {
  @ApiPropertyOptional({ description: 'ID del usuario que edita la reseña para verificar autoría' })
  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Calificación del 1 al 5', minimum: 1, maximum: 5 })
  @IsInt({ message: 'La calificación debe ser un entero entre 1 y 5' })
  @Min(1, { message: 'La calificación mínima es 1 estrella' })
  @Max(5, { message: 'La calificación máxima es 5 estrellas' })
  @IsOptional()
  calificacion?: number;

  @ApiPropertyOptional({ description: 'Comentario opcional sobre el producto' })
  @IsString()
  @IsOptional()
  comentario?: string;
}
