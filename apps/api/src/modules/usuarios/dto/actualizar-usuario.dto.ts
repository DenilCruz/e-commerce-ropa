import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ description: 'Nombre del usuario' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Apellido del usuario' })
  @IsString()
  @IsOptional()
  apellido?: string;

  @ApiPropertyOptional({ description: 'Número de celular' })
  @IsString()
  @IsOptional()
  celular?: string;

  @ApiPropertyOptional({ description: 'URL de la foto de perfil' })
  @IsString()
  @IsOptional()
  foto?: string;
}
