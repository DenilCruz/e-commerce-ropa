import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemStockDto {
  @ApiProperty({ description: 'ID UUID de la variante de producto' })
  @IsUUID('4', { message: 'El ID de la variante debe ser un UUID válido' })
  varianteId: string;

  @ApiProperty({ description: 'Cantidad a descontar o devolver', minimum: 1 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  cantidad: number;
}

export class ProcesarStockPedidoDto {
  @ApiProperty({ description: 'Lista de ítems con variante y cantidad', type: [ItemStockDto] })
  @IsArray({ message: 'Debe proporcionar una lista de ítems' })
  @ValidateNested({ each: true })
  @Type(() => ItemStockDto)
  items: ItemStockDto[];
}
