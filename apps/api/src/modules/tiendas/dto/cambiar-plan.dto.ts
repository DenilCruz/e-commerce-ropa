import { IsNotEmpty, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EnumTipoPlan {
  FREE_TRIAL = 'FREE_TRIAL',
  ESTANDAR = 'ESTANDAR',
  CORPORATIVO = 'CORPORATIVO',
}

export class CambiarPlanDto {
  @ApiProperty({
    description: 'Nuevo plan para la tienda',
    enum: EnumTipoPlan,
    example: EnumTipoPlan.ESTANDAR,
  })
  @IsNotEmpty({ message: 'El campo plan es requerido' })
  @IsEnum(EnumTipoPlan, {
    message: 'El plan debe ser uno de los siguientes: FREE_TRIAL, ESTANDAR, CORPORATIVO',
  })
  plan: EnumTipoPlan;
}
