import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const PLANES_FILTRO = ['FREE_TRIAL', 'ESTANDAR', 'CORPORATIVO'] as const;
export const ESTADOS_TIENDA = ['ACTIVA', 'SUSPENDIDA'] as const;
export const ESTADOS_SUSCRIPCION = ['PENDIENTE_PAGO', 'ACTIVA', 'FALLIDA', 'EXPIRADA'] as const;

export class PaginacionDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}

export class ListarTiendasQueryDto extends PaginacionDto {
  @ApiPropertyOptional({ description: 'Texto en nombre, slug o correo del propietario' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  busqueda?: string;

  @ApiPropertyOptional({ enum: PLANES_FILTRO })
  @IsOptional()
  @IsIn(PLANES_FILTRO)
  plan?: (typeof PLANES_FILTRO)[number];

  @ApiPropertyOptional({ enum: ESTADOS_TIENDA })
  @IsOptional()
  @IsIn(ESTADOS_TIENDA)
  estado?: (typeof ESTADOS_TIENDA)[number];
}

export class ListarSuscripcionesQueryDto extends PaginacionDto {
  @ApiPropertyOptional({ enum: ESTADOS_SUSCRIPCION })
  @IsOptional()
  @IsIn(ESTADOS_SUSCRIPCION)
  estado?: (typeof ESTADOS_SUSCRIPCION)[number];
}
