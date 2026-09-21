import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CotizarEnvioDto {
  @ApiProperty({ description: 'Subtotal del carrito para evaluar envío gratis', example: 250 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'ID del método de envío seleccionado', example: 'uuid' })
  @IsString()
  @IsOptional()
  metodoEnvioId?: string;

  @ApiPropertyOptional({ description: 'Departamento de entrega', example: 'Santa Cruz' })
  @IsString()
  @IsOptional()
  departamento?: string;

  @ApiPropertyOptional({ description: 'Ciudad o municipio', example: 'Santa Cruz de la Sierra' })
  @IsString()
  @IsOptional()
  ciudad?: string;
}
