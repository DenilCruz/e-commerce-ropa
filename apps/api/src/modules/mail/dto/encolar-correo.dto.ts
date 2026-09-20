import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TipoEmailCola {
  BIENVENIDA = 'BIENVENIDA',
  RECUPERACION_PASSWORD = 'RECUPERACION_PASSWORD',
  CONFIRMACION_COMPRA = 'CONFIRMACION_COMPRA',
  GENERICO = 'GENERICO',
}

export class EncolarCorreoDto {
  @ApiProperty({
    enum: TipoEmailCola,
    example: TipoEmailCola.GENERICO,
    description: 'Tipo de correo a despachar en background',
  })
  @IsEnum(TipoEmailCola)
  @IsNotEmpty()
  tipo: TipoEmailCola;

  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Correo electrónico del destinatario',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty()
  para: string;

  @ApiProperty({
    example: 'Notificación importante',
    description: 'Asunto del correo electrónico',
  })
  @IsString()
  @IsNotEmpty()
  asunto: string;

  @ApiProperty({
    example: '<h3>Hola</h3><p>Este es el cuerpo del mensaje en HTML.</p>',
    description: 'Cuerpo en formato HTML',
  })
  @IsString()
  @IsNotEmpty()
  contenidoHtml: string;

  @ApiPropertyOptional({
    example: 'Este es el texto plano de respaldo.',
    description: 'Texto plano opcional',
  })
  @IsOptional()
  @IsString()
  textoPlano?: string;
}
