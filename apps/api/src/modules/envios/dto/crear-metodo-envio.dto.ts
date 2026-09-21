import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CrearMetodoEnvioDto {
  @ApiProperty({ description: 'Nombre del método de envío', example: 'Envío Express 24h' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción o cobertura', example: 'Entrega prioritaria en menos de 24 horas' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ description: 'Costo base en Bolivianos', example: 30 })
  @IsNumber()
  @Min(0)
  costo: number;

  @ApiPropertyOptional({ description: 'Tiempo estimado de entrega', example: '24 horas hábiles' })
  @IsString()
  @IsOptional()
  tiempoEstimado?: string;

  @ApiPropertyOptional({ description: 'Activo o inactivo', default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
