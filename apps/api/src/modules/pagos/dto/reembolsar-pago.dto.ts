import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReembolsarPagoDto {
  @ApiPropertyOptional({ description: 'Motivo del reclamo o reembolso' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
