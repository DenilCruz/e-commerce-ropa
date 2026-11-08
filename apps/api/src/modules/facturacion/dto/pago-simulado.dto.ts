import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PagoSimuladoDto {
  @ApiProperty({ example: 'sim_cs_0b6f1c1e-...', description: 'Sesión de pago simulada que devolvió la compra' })
  @IsString()
  @IsNotEmpty({ message: 'Falta la sesión de pago' })
  @MaxLength(100)
  sessionId: string;

  @ApiProperty({ enum: ['TARJETA', 'QR'] })
  @IsIn(['TARJETA', 'QR'], { message: 'El método debe ser TARJETA o QR' })
  metodo: 'TARJETA' | 'QR';

  @ApiPropertyOptional({ example: '4242 4242 4242 4242', description: 'Solo se inspecciona; nunca se guarda' })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  numero?: string;

  @ApiPropertyOptional({ example: '12/30' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  expiracion?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  cvc?: string;

  @ApiPropertyOptional({ example: 'Ana Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  titular?: string;
}
