import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReembolsarPagoDto {
  @ApiPropertyOptional({ description: 'Motivo del reclamo o reembolso' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
