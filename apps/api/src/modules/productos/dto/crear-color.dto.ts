import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CrearColorDto {
  @ApiProperty({ description: 'Nombre del color' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ description: 'Hexadecimal' })
  @IsString()
  @IsOptional()
  hex?: string;
}
