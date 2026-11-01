import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PagoQrDto {
  @ApiProperty({ description: 'Dirección completa de entrega' })
  @IsString()
  @IsNotEmpty({ message: 'Indica la dirección de entrega.' })
  @MaxLength(255)
  direccionEnvio: string;

  @ApiProperty({ description: 'Teléfono de contacto' })
  @IsString()
  @Matches(/^\+?[\d\s-]{6,20}$/, { message: 'Ingresa un teléfono de contacto válido.' })
  telefono: string;

  @ApiPropertyOptional({ description: 'Notas adicionales del pedido' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;

  @ApiProperty({ description: 'Número de comprobante de la transferencia que la tienda verificará' })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{3,39}$/, {
    message: 'El número de comprobante debe tener entre 4 y 40 caracteres: letras, números, puntos o guiones.',
  })
  nroComprobante: string;

  @ApiPropertyOptional({ description: 'ID del cupón aplicado' })
  @IsOptional()
  @IsUUID('4')
  cuponId?: string;

  @ApiPropertyOptional({ description: 'ID del método de envío seleccionado' })
  @IsOptional()
  @IsUUID()
  metodoEnvioId?: string;

  @ApiPropertyOptional({ description: 'Tipo de envío: ESTANDAR o EXPRESS', enum: ['ESTANDAR', 'EXPRESS'] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ESTANDAR', 'EXPRESS'])
  tipoEnvio?: string;

  @ApiPropertyOptional({ description: 'Coordenada Latitud de entrega' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ description: 'Coordenada Longitud de entrega' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;
}
