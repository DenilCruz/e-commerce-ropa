import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProveedorIA {
  GROQ = 'GROQ',
  OLLAMA = 'OLLAMA',
}

export class GenerarReporteDinamicoDto {
  @ApiProperty({
    description: 'Instrucción o requerimiento en lenguaje natural (dictado por voz o escrito)',
    example: 'Quiero ver los 5 productos más vendidos y cuánto dinero han generado',
  })
  @IsNotEmpty({ message: 'El prompt o consulta es requerido' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Proveedor de IA a utilizar (GROQ u OLLAMA)',
    enum: ProveedorIA,
    default: ProveedorIA.GROQ,
  })
  @IsOptional()
  @IsEnum(ProveedorIA)
  proveedor?: ProveedorIA = ProveedorIA.GROQ;
}

export class EjecutarSqlDinamicoDto {
  @ApiProperty({
    description: 'Consulta SQL SELECT para ejecutar de forma segura',
    example: 'SELECT p.nombre, SUM(d.cantidad) as total FROM producto p JOIN detalle_nota_venta d ON p.id = d.producto_id GROUP BY p.nombre LIMIT 10;',
  })
  @IsNotEmpty({ message: 'La sentencia SQL es requerida' })
  @IsString()
  sql: string;
}
