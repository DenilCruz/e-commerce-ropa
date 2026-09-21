import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ConfirmarPagoTarjetaDto {
  @ApiProperty({ description: 'ID del PaymentIntent generado por Stripe (pi_...)' })
  @IsNotEmpty({ message: 'El paymentIntentId es obligatorio' })
  @IsString()
  paymentIntentId: string;

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
}
