import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, IsIn } from 'class-validator';

export class AjustarStockDto {
  @ApiProperty({ 
    description: 'Tipo de operación a realizar', 
    enum: ['AGREGAR', 'REDUCIR', 'ESTABLECER'],
    example: 'AGREGAR'
  })
  @IsString()
  @IsIn(['AGREGAR', 'REDUCIR', 'ESTABLECER'], { 
    message: 'La operación debe ser AGREGAR (ingreso de mercadería), REDUCIR (salida/merma) o ESTABLECER (ajuste directo)' 
  })
  operacion: 'AGREGAR' | 'REDUCIR' | 'ESTABLECER';

  @ApiProperty({ description: 'Cantidad exacta a modificar en el inventario', minimum: 0 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad: number;

  @ApiProperty({ description: 'Motivo o justificación del ajuste (Ej: Llegada de mercadería lote #101)' })
  @IsString()
  @IsNotEmpty({ message: 'Debe especificar un motivo para el ajuste' })
  motivo: string;
}
