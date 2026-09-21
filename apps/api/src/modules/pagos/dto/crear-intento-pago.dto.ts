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
}
