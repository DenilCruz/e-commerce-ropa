import { PartialType } from '@nestjs/swagger';
import { CrearCuponDto } from './crear-cupon.dto';

export class ActualizarCuponDto extends PartialType(CrearCuponDto) {}
