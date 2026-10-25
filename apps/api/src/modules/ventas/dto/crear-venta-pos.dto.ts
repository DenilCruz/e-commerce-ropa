import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemVentaPosDto {
  @ApiProperty({ description: 'Variante vendida (talla y color).' })
  @IsUUID('4')
  varianteId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  cantidad: number;
}

export class CrearVentaPosDto {
  @ApiProperty({ type: [ItemVentaPosDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ItemVentaPosDto)
  items: ItemVentaPosDto[];

  @ApiPropertyOptional({ description: 'Nombre del cliente que compra en el mostrador.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  clienteNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;

  @ApiPropertyOptional({ description: 'Momento en que el vendedor registró la venta en su dispositivo (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  vendidoEn?: string;
}
