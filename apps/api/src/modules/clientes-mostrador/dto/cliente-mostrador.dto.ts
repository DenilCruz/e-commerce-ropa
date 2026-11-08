import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** An empty optional field means "not given", so a form that sends '' does not fail validation. */
const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class ClienteMostradorDto {
  @ApiProperty({ description: 'UUID v4 generado por el dispositivo (permite crearlo sin conexión).' })
  @IsUUID('4')
  id: string;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(blankToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  apellido?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @Transform(blankToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  celular?: string;

  @ApiPropertyOptional({ maxLength: 20, description: 'Único por tienda cuando viene.' })
  @Transform(blankToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ci?: string;

  @ApiPropertyOptional()
  @Transform(blankToUndefined)
  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  correo?: string;
}
