import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, IsIn } from 'class-validator';

export class AjustarStockDto {
  @ApiProperty({ description: 'Tipo de operación a realizar', enum: ['AGREGAR', 'REDUCIR'] })
  @IsString()
  @IsIn(['AGREGAR', 'REDUCIR'], { message: 'La operación debe ser AGREGAR o REDUCIR' })
  operacion: 'AGREGAR' | 'REDUCIR';

  @ApiProperty({ description: 'Cantidad exacta a modificar en el inventario', minimum: 1 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  cantidad: number;

  @ApiProperty({ description: 'Motivo del ajuste (Ej: Mercadería dañada, Ingreso de lote)' })
  @IsString()
  @IsNotEmpty({ message: 'Debe especificar un motivo para el ajuste' })
  motivo: string;
}
