import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemCompraEmailDto {
  @ApiProperty({ example: 'Polera Oversize Minimalist', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'L', description: 'Talla seleccionada' })
  @IsOptional()
  @IsString()
  talla?: string;

  @ApiPropertyOptional({ example: 'Negro', description: 'Color seleccionado' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 2, description: 'Cantidad comprada' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 120.0, description: 'Precio unitario' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precioUnitario: number;

  @ApiProperty({ example: 240.0, description: 'Subtotal del item' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal: number;
}

export class ConfirmacionCompraEmailDto {
  @ApiProperty({
    example: 'cliente@ejemplo.com',
    description: 'Correo electrónico del comprador',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  correo: string;

  @ApiProperty({
    example: 'Carlos Pérez',
    description: 'Nombre del cliente',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es requerido' })
  nombreCliente: string;

  @ApiProperty({
    example: 'NV-2026-00042',
    description: 'Número de pedido / nota de venta',
  })
  @IsString()
  @IsNotEmpty({ message: 'El número de pedido es requerido' })
  nroPedido: string;

  @ApiPropertyOptional({
    example: '2026-09-20T20:30:00.000Z',
    description: 'Fecha de la compra (ISO string)',
  })
  @IsOptional()
  @IsString()
  fecha?: string;

  @ApiProperty({
    type: [ItemCompraEmailDto],
    description: 'Lista de productos incluidos en la compra',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemCompraEmailDto)
  items: ItemCompraEmailDto[];

  @ApiProperty({
    example: 240.0,
    description: 'Monto subtotal de la compra sin descuentos ni envíos',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({
    example: 24.0,
    description: 'Monto de descuento aplicado (por cupón o promoción)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  descuento?: number;

  @ApiPropertyOptional({
    example: 'BIENVENIDO10',
    description: 'Código del cupón aplicado si corresponde',
  })
  @IsOptional()
  @IsString()
  cuponCodigo?: string;

  @ApiPropertyOptional({
    example: 15.0,
    description: 'Costo del servicio de envío',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costoEnvio?: number;

  @ApiProperty({
    example: 231.0,
    description: 'Monto total pagado',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total: number;

  @ApiPropertyOptional({
    example: 'Av. Las Américas #450, Santa Cruz de la Sierra',
    description: 'Dirección física de entrega',
  })
  @IsOptional()
  @IsString()
  direccionEntrega?: string;

  @ApiPropertyOptional({
    example: 'QR Simple / Tarjeta de Débito',
    description: 'Método de pago utilizado',
  })
  @IsOptional()
  @IsString()
  metodoPago?: string;
}
