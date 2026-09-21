import { PartialType } from '@nestjs/swagger';
import { CrearMetodoEnvioDto } from './crear-metodo-envio.dto';

export class ActualizarMetodoEnvioDto extends PartialType(CrearMetodoEnvioDto) {}
