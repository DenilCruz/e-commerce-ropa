import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EstadoCompraResenaDto {
  @ApiProperty({ description: 'Indica si el usuario puede calificar este producto' })
  puedeCalificar: boolean;

  @ApiProperty({ description: 'Indica si el usuario ha comprado el producto' })
  comproProducto: boolean;

  @ApiProperty({ description: 'Indica si el usuario ya dejó una reseña para este producto' })
  yaReseno: boolean;

  @ApiPropertyOptional({ description: 'Reseña existente del usuario si ya la escribió' })
  resenaExistente?: any;
}
