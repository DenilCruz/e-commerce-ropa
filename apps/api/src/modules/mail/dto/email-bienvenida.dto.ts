import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmailBienvenidaDto {
  @ApiProperty({
    example: 'cliente@ejemplo.com',
    description: 'Correo electrónico del nuevo usuario',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  correo: string;

  @ApiProperty({
    example: 'Carlos Pérez',
    description: 'Nombre o nombre completo del usuario',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiPropertyOptional({
    example: 'http://localhost:5173/catalogo',
    description: 'Enlace directo opcional para explorar la tienda',
  })
  @IsOptional()
  @IsString()
  enlaceCatalogo?: string;
}
