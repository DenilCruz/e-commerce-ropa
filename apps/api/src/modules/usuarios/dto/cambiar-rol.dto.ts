import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CambiarRolDto {
  @ApiProperty({ description: 'ID o Nombre del nuevo rol (ej: ADMIN o CLIENTE)' })
  @IsString()
  @IsNotEmpty()
  rolId: string;
}
