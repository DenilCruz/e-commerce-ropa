import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum PlanComprable {
  ESTANDAR = 'ESTANDAR',
  CORPORATIVO = 'CORPORATIVO',
}

export enum PeriodoFacturacion {
  MENSUAL = 'MENSUAL',
  ANUAL = 'ANUAL',
}

export class CheckoutPlanDto {
  @ApiProperty({ enum: PlanComprable, example: PlanComprable.ESTANDAR, description: 'Plan que se quiere contratar' })
  @IsNotEmpty({ message: 'El plan es requerido' })
  @IsEnum(PlanComprable, { message: 'El plan debe ser ESTANDAR o CORPORATIVO' })
  plan: PlanComprable;

  @ApiProperty({ enum: PeriodoFacturacion, example: PeriodoFacturacion.MENSUAL, description: 'Un mes o 12 meses cobrados juntos' })
  @IsNotEmpty({ message: 'El período es requerido' })
  @IsEnum(PeriodoFacturacion, { message: 'El período debe ser MENSUAL o ANUAL' })
  periodo: PeriodoFacturacion;
}
