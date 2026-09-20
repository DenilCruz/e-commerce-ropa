import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecuperarPasswordDto {
  @ApiProperty({ example: 'juan.perez@example.com', description: 'Correo electrónico de la cuenta a recuperar' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  correo: string;
}
