import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarConfigPagoDto {
  @ApiPropertyOptional({ description: 'URL de la imagen del código QR propio de la tienda' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  qrUrl?: string;

  @ApiPropertyOptional({ description: 'Nombre del titular de la cuenta bancaria de la tienda' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titularCuenta?: string;

  @ApiPropertyOptional({ description: 'Nombre del banco (ej. Banco Unión, BNB, BCP)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  banco?: string;

  @ApiPropertyOptional({ description: 'Número de cuenta bancaria de la tienda' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroCuenta?: string;

  @ApiPropertyOptional({ description: 'Modalidad de pago activa (MODELO_A_CUSTODIA | MODELO_B_DIRECTO)' })
  @IsOptional()
  @IsString()
  modalidadPagoActiva?: string;
}
