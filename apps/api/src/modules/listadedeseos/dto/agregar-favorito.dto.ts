import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AgregarFavoritoDto {
  @ApiProperty({ description: 'ID del usuario (Temporal hasta integrar JWT)' })
  @IsUUID()
  @IsNotEmpty()
  usuarioId: string;

  @ApiProperty({ description: 'ID del producto a guardar en favoritos' })
  @IsUUID()
  @IsNotEmpty()
  productoId: string;
}
