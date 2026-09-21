import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { DynamicReportsService } from './dynamic-reports/dynamic-reports.service';
import { JwtAuthGuard } from '../autenticacion/guards/jwt-auth.guard';
import { RolesGuard } from '../autenticacion/guards/roles.guard';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { ReporteVentasFiltroDto } from './dto/reporte-ventas-filtro.dto';
import {
  GenerarReporteDinamicoDto,
  EjecutarSqlDinamicoDto,
} from './dynamic-reports/dto/dynamic-reports.dto';

@ApiTags('Admin Dashboard & Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dynamicReportsService: DynamicReportsService,
  ) {}

  // =========================================================================
  // HU-89: DASHBOARD RESUMEN DE VENTAS (DÍA / MES)
  // =========================================================================
  @Get('dashboard/resumen')
  @ApiOperation({ summary: 'Obtener métricas principales de ventas del día, mes y tendencia' })
  obtenerMetricasDashboard() {
    return this.adminService.obtenerMetricasDashboard();
  }

  // =========================================================================
  // HU-90: PRODUCTOS MÁS VENDIDOS
  // =========================================================================
  @Get('dashboard/productos-top')
  @ApiOperation({ summary: 'Obtener los productos más vendidos con unidades, ingresos y stock' })
  @ApiQuery({ name: 'limite', required: false, type: Number, description: 'Límite de productos (default: 8)' })
  obtenerProductosMasVendidos(
    @Query('limite', new DefaultValuePipe(8), ParseIntPipe) limite: number,
  ) {
    return this.adminService.obtenerProductosMasVendidos(limite);
  }

  // =========================================================================
  // HU-91: PRODUCTOS CON STOCK BAJO / ALERTAS
  // =========================================================================
  @Get('dashboard/stock-bajo')
  @ApiOperation({ summary: 'Obtener prendas y variantes con stock crítico o agotadas' })
  obtenerAlertasStockBajo() {
    return this.adminService.obtenerAlertasStockBajo();
  }

  // =========================================================================
  // HU-92: REPORTE DE VENTAS POR RANGO DE FECHAS
  // =========================================================================
  @Get('reportes/ventas')
  @ApiOperation({ summary: 'Generar reporte de ventas filtrado por fechas, estado y búsqueda' })
  generarReporteVentas(@Query() filtros: ReporteVentasFiltroDto) {
    return this.adminService.generarReporteVentas(filtros);
  }

  // =========================================================================
  // HU-93: USUARIOS NUEVOS POR MES Y CRECIMIENTO
  // =========================================================================
  @Get('dashboard/usuarios-mes')
  @ApiOperation({ summary: 'Obtener estadísticas de nuevos usuarios registrados por mes' })
  @ApiQuery({ name: 'meses', required: false, type: Number, description: 'Meses hacia atrás (default: 6)' })
  obtenerUsuariosNuevosPorMes(
    @Query('meses', new DefaultValuePipe(6), ParseIntPipe) meses: number,
  ) {
    return this.adminService.obtenerUsuariosNuevosPorMes(meses);
  }

  // =========================================================================
  // REPORTES DINÁMICOS POR VOZ / IA (GROQ & OLLAMA)
  // =========================================================================
  @Post('reportes-dinamicos/generar')
  @ApiOperation({ summary: 'Generar y ejecutar reporte dinámico a partir de voz o lenguaje natural con IA' })
  @ApiBody({ type: GenerarReporteDinamicoDto })
  generarReporteDinamico(@Body() dto: GenerarReporteDinamicoDto) {
    return this.dynamicReportsService.generarYEjecutarReporte(dto);
  }

  @Post('reportes-dinamicos/ejecutar-sql')
  @ApiOperation({ summary: 'Ejecutar consulta SQL validada (únicamente lectura SELECT)' })
  @ApiBody({ type: EjecutarSqlDinamicoDto })
  ejecutarSqlDinamico(@Body() dto: EjecutarSqlDinamicoDto) {
    return this.dynamicReportsService.ejecutarSqlDirecto(dto.sql);
  }
}
