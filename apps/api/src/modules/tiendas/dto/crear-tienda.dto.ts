import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearTiendaDto {
  @ApiProperty({ example: 'Moda Luna', description: 'Nombre comercial de la nueva tienda' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la tienda es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  nombre: string;

  @ApiPropertyOptional({ example: 'ESTANDAR', enum: ['FREE_TRIAL', 'ESTANDAR', 'CORPORATIVO'], description: 'Plan que el usuario quiere contratar. No se concede al crear: toda tienda nace en FREE_TRIAL y un plan pagado se compra desde el checkout de planes.' })
  @IsOptional()
  @IsString()
  plan?: string;
}
