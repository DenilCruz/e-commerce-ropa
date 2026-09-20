import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoCupon } from '../entities/coupon.entity';

export class CrearCuponDto {
  @ApiProperty({
    example: 'VERANO2026',
    description: 'Código único del cupón (se guardará en mayúsculas)',
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código es requerido' })
  codigo: string;

  @ApiPropertyOptional({
    example: '15% de descuento en toda la tienda para temporada de verano',
    description: 'Descripción informativa del cupón',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  descripcion?: string;

  @ApiProperty({
    enum: TipoCupon,
    example: TipoCupon.PORCENTAJE,
    description: 'Tipo de descuento: PORCENTAJE o MONTO_FIJO (HU-71)',
  })
  @IsEnum(TipoCupon, { message: 'El tipo debe ser PORCENTAJE o MONTO_FIJO' })
  @IsNotEmpty({ message: 'El tipo de cupón es requerido' })
  tipo: TipoCupon;

  @ApiProperty({
    example: 15,
    description: 'Valor del descuento (ej. 15 para 15% o 50 para Bs. 50)',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor debe ser un número' })
  @IsPositive({ message: 'El valor debe ser positivo' })
  valor: number;

  @ApiPropertyOptional({
    example: 100,
    default: 0,
    description: 'Monto mínimo de compra requerido para aplicar el cupón (HU-72)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El monto mínimo debe ser un número' })
  @Min(0, { message: 'El monto mínimo no puede ser negativo' })
  montoMinimo: number = 0;

  @ApiPropertyOptional({
    example: 100,
    description: 'Límite global de usos máximos permitidos (null para ilimitado) (HU-72)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los usos máximos deben ser un número entero' })
  @Min(1, { message: 'Los usos máximos deben ser al menos 1' })
  usosMaximos?: number;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Límite de usos permitidos por cada usuario individual (HU-72)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los usos por usuario deben ser un número entero' })
  @Min(1, { message: 'Los usos por usuario deben ser al menos 1' })
  usosPorUsuario: number = 1;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    description: 'Fecha y hora de inicio de vigencia del cupón (HU-72)',
  })
  @IsDateString({}, { message: 'La fecha de inicio debe tener formato ISO válido' })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  fechaInicio: string;

  @ApiProperty({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Fecha y hora de fin de vigencia del cupón (HU-72)',
  })
  @IsDateString({}, { message: 'La fecha de fin debe tener formato ISO válido' })
  @IsNotEmpty({ message: 'La fecha de fin es requerida' })
  fechaFin: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Estado activo o inactivo del cupón (HU-75)',
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser booleano' })
  activo?: boolean = true;
}
