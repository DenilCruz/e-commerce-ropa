import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class ActualizarEstadoEnvioDto {
  @ApiProperty({
    description: 'Nuevo estado del envío',
    enum: ['PREPARANDO', 'EN_CAMINO', 'EN_REPARTO', 'ENTREGADO', 'FALLIDO'],
    example: 'EN_CAMINO',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['PREPARANDO', 'EN_CAMINO', 'EN_REPARTO', 'ENTREGADO', 'FALLIDO'])
  estadoEnvio: string;

  @ApiPropertyOptional({ description: 'Empresa o courier transportadora', example: 'Courier Local Express' })
  @IsString()
  @IsOptional()
  transportadora?: string;

  @ApiPropertyOptional({ description: 'Número de guía del transportista', example: 'FEDEX-987654' })
  @IsString()
  @IsOptional()
  numeroGuia?: string;

  @ApiPropertyOptional({ description: 'Ubicación actual del paquete', example: 'Centro de Distribución Central, Santa Cruz' })
  @IsString()
  @IsOptional()
  ubicacionActual?: string;

  @ApiPropertyOptional({ description: 'Notas u observaciones del envío', example: 'Entregado en recepción a cargo de Juan Perez' })
  @IsString()
  @IsOptional()
  notas?: string;
}
