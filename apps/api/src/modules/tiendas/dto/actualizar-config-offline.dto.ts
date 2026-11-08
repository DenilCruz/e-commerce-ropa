import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class ActualizarConfigOfflineDto {
  @ApiProperty({ minimum: 1, maximum: 30, description: 'Días que un dispositivo conserva sus datos sin conexión.' })
  @IsInt()
  @Min(1)
  @Max(30)
  retencionOfflineDias: number;
}
