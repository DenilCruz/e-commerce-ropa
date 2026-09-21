import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProbadorService } from './probador.service';
import { ProbarPrendaDto } from './dto/probar-prenda.dto';

@ApiTags('Probador Virtual IA')
@Controller('probador')
export class ProbadorController {
  constructor(private readonly probadorService: ProbadorService) {}

  @Get('modelos')
  @ApiOperation({ summary: 'Obtener lista de modelos y avatares base para pruebas instantáneas' })
  @ApiResponse({ status: 200, description: 'Modelos base disponibles retornados.' })
  obtenerModelos() {
    return this.probadorService.obtenerModelosBase();
  }

  @Post('try-on')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ejecutar prueba virtual con IA (IDM-VTON en Hugging Face)' })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba virtual fotorrealista.' })
  generarPruebaVirtual(@Body() dto: ProbarPrendaDto) {
    return this.probadorService.generarPruebaVirtual(dto);
  }
}
