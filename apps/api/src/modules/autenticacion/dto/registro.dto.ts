import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegistroDto {
  @ApiProperty({ example: 'juan.perez@example.com', description: 'Correo electrónico del usuario' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  correo: string;

  @ApiProperty({ example: 'Password123!', description: 'Contraseña segura (mínimo 6 caracteres)' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  contrasena: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre(s) del usuario' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido(s) del usuario' })
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  apellido: string;

  @ApiPropertyOptional({ example: '77123456', description: 'Número de celular o teléfono' })
  @IsOptional()
  @IsString({ message: 'El celular debe ser una cadena de texto' })
  celular?: string;

  @ApiPropertyOptional({ example: '12345678', description: 'Cédula de identidad (CI)' })
  @IsOptional()
  @IsString({ message: 'El CI debe ser una cadena de texto' })
  ci?: string;
}
