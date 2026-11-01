import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ConfirmarPagoTarjetaDto {
  @ApiProperty({ description: 'ID del PaymentIntent generado por Stripe (pi_...)' })
  @IsNotEmpty({ message: 'El paymentIntentId es obligatorio' })
  @IsString()
  paymentIntentId: string;

  @ApiPropertyOptional({ description: 'Dirección completa de entrega' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccionEnvio?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s-]{6,20}$/, { message: 'Ingresa un teléfono de contacto válido.' })
  telefono?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales del pedido' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;

  @ApiPropertyOptional({ description: 'ID del cupón aplicado' })
  @IsOptional()
  @IsUUID('4')
  cuponId?: string;

  @ApiPropertyOptional({ description: 'ID del método de envío seleccionado' })
  @IsOptional()
  @IsUUID()
  metodoEnvioId?: string;

  @ApiPropertyOptional({ description: 'Tipo de envío: ESTANDAR o EXPRESS' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ESTANDAR', 'EXPRESS'])
  tipoEnvio?: string;
}
