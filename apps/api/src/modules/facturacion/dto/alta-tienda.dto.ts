import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { PeriodoFacturacion, PlanComprable } from './checkout-plan.dto';

export class AltaTiendaDto {
  @ApiProperty({ example: 'Moda Luna', description: 'Nombre comercial de la tienda que se creará al confirmarse el pago' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la tienda es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  nombre: string;

  @ApiProperty({ enum: PlanComprable, example: PlanComprable.ESTANDAR })
  @IsNotEmpty({ message: 'El plan es requerido' })
  @IsEnum(PlanComprable, { message: 'El plan debe ser ESTANDAR o CORPORATIVO' })
  plan: PlanComprable;

  @ApiProperty({ enum: PeriodoFacturacion, example: PeriodoFacturacion.MENSUAL })
  @IsNotEmpty({ message: 'El período es requerido' })
  @IsEnum(PeriodoFacturacion, { message: 'El período debe ser MENSUAL o ANUAL' })
  periodo: PeriodoFacturacion;
}
