import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  contrasenaActual: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres.' })
  nuevaContrasena: string;
}
