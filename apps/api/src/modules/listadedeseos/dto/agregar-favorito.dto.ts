import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional } from 'class-validator';

export class AgregarFavoritoDto {
  @ApiPropertyOptional({ description: 'ID del usuario; si se envía debe ser el de la sesión (siempre se usa el del token)' })
  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @ApiProperty({ description: 'ID del producto a guardar en favoritos' })
  @IsUUID()
  @IsNotEmpty()
  productoId: string;
}
