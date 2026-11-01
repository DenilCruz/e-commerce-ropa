import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
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

export class CrearIntentoPagoDto {
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

  @ApiPropertyOptional({ description: 'Origen de la solicitud: web o mobile' })
  @IsOptional()
  @IsString()
  origen?: 'web' | 'mobile';
}
