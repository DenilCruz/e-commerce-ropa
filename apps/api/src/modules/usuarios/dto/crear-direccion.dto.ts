import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CrearDireccionDto {
  @ApiPropertyOptional({ description: 'Alias de la dirección (Ej: Casa, Trabajo)' })
  @IsString()
  @IsOptional()
  alias?: string;

  @ApiProperty({ description: 'Nombre de la calle o avenida' })
  @IsString()
  @IsNotEmpty()
  calle: string;

  @ApiProperty({ description: 'Número de casa o apartamento' })
  @IsString()
  @IsNotEmpty()
  nrocasa: string;

  @ApiPropertyOptional({ description: 'Referencia para encontrar el lugar' })
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiPropertyOptional({ description: 'Establecer como dirección principal de envío', default: false })
  @IsBoolean()
  @IsOptional()
  predeterminada?: boolean;
}
