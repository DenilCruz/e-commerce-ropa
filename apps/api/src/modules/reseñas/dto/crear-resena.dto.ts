import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class CrearResenaDto {
  @ApiProperty({ description: 'ID del usuario que escribe la reseña' })
  @IsUUID()
  @IsNotEmpty()
  usuarioId: string;

  @ApiProperty({ description: 'ID del producto calificado' })
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @ApiProperty({ description: 'Calificación del 1 al 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1, { message: 'La calificación mínima es 1 estrella.' })
  @Max(5, { message: 'La calificación máxima es 5 estrellas.' })
  calificacion: number;

  @ApiPropertyOptional({ description: 'Comentario opcional sobre el producto' })
  @IsString()
  @IsOptional()
  comentario?: string;
}
