import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearIntentoPagoDto {
  @ApiPropertyOptional({ description: 'Dirección completa de entrega' })
  @IsOptional()
  @IsString()
  direccionEnvio?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales del pedido' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'ID del cupón aplicado' })
  @IsOptional()
  @IsUUID('4')
  cuponId?: string;

  @ApiPropertyOptional({ description: 'ID del método de envío seleccionado' })
  @IsOptional()
  @IsString()
  metodoEnvioId?: string;

  @ApiPropertyOptional({ description: 'Tipo de envío: ESTANDAR o EXPRESS' })
  @IsOptional()
  @IsString()
  tipoEnvio?: string;

  @ApiPropertyOptional({ description: 'Coordenada Latitud de entrega' })
  @IsOptional()
  latitud?: number;

  @ApiPropertyOptional({ description: 'Coordenada Longitud de entrega' })
  @IsOptional()
  longitud?: number;
}
