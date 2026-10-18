export interface MetricasVentas {
  monto: number;
  cantidad: number;
  crecimientoVsMesAnterior?: number;
  montoMesAnterior?: number;
}

export interface TendenciaVentaDia {
  fecha: string;
  dia: string;
  total: number;
  pedidos: number;
}

export interface ResumenEstadoPedido {
  estado: string;
  cantidad: number;
  total: number;
}

export interface DashboardMetricas {
  ventasHoy: MetricasVentas;
  ventasMes: MetricasVentas;
  ticketPromedio: number;
  totalesGenerales: {
    pedidos: number;
    usuarios: number;
    productos: number;
  };
  tendenciaVentas: TendenciaVentaDia[];
  resumenEstados: ResumenEstadoPedido[];
}

export interface ProductoMasVendido {
  productoId: string;
  nombre: string;
  categoria: string;
  precio: number;
  unidadesVendidas: number;
  ingresosGenerados: number;
  stockActual: number;
  imagenUrl: string | null;
}

export interface AlertaStock {
  varianteId: string;
  productoId: string;
  nombreProducto: string;
  categoria: string;
  sku: string;
  talla: string;
  color: string;
  stockActual: number;
  stockMinimo: number;
  estadoStock: 'AGOTADO' | 'CRITICO';
  precio: number;
  imagenUrl: string | null;
}

export interface ReporteItemDetalle {
  id: string;
  nombreProducto: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  talla?: string;
  color?: string;
}

export interface ReportePedido {
  id: string;
  nro: string;
  fecha: string;
  cliente: {
    id: string | null;
    nombre: string;
    correo: string;
  };
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  estado: string;
  metodoPago: string;
  cuponCodigo: string | null;
  cantidadItems: number;
  items: ReporteItemDetalle[];
}

export interface ReporteVentasRespuesta {
  resumen: {
    totalFacturado: number;
    totalPedidos: number;
    totalDescuentos: number;
    totalEnvios: number;
    ticketMedio: number;
  };
  pedidos: ReportePedido[];
  paginacion: {
    totalRegistros: number;
    paginaActual: number;
    totalPaginas: number;
    limite: number;
  };
}

export interface ReporteVentasFiltros {
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  categoriaId?: string;
  usuarioId?: string;
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

export interface DesgloseMesUsuario {
  mes: string;
  label: string;
  total: number;
  verificados: number;
}

export interface UsuarioResumenAdmin {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  emailVerificado: boolean;
  activo: boolean;
  creadoEn: string;
}

export interface UsuariosNuevosRespuesta {
  resumen: {
    totalUsuarios: number;
    totalVerificados: number;
    totalActivos: number;
    tasaVerificacion: number;
    nuevosEsteMes: number;
    crecimientoVsMesAnterior: number;
  };
  desgloseMensual: DesgloseMesUsuario[];
  ultimosUsuarios: UsuarioResumenAdmin[];
}

export interface ReporteDinamicoSolicitud {
  prompt: string;
  proveedor?: 'GROQ' | 'OLLAMA';
}

export interface ReporteDinamicoResultado {
  promptOriginal: string;
  sql: string;
  descripcion: string;
  sugerenciaVisualizacion: string;
  columnas: string[];
  filas: Record<string, any>[];
  totalFilas: number;
  tiempoEjecucionMs: number;
}

export interface PuntoSeriePredictiva {
  fecha: string;
  label: string;
  valorReal: number | null;
  valorProyectado: number | null;
  tipo: 'HISTORICO' | 'PROYECCION';
}

export interface MetricasPredictivasVentas {
  proyeccionVentas7Dias: number;
  proyeccionVentas14Dias: number;
  proyeccionVentas30Dias: number;
  promedioDiarioHistorico: number;
  tendencia: 'ALCISTA' | 'ESTABLE' | 'BAJISTA';
  pendienteDiaria: number;
  nivelConfianza: string;
}

export interface AnalisisPredictivoVentasRespuesta {
  metricasPredictivas: MetricasPredictivasVentas;
  serieGrafico: PuntoSeriePredictiva[];
  recomendacionEstrategica: string;
}

export interface ClienteRiesgoChurn {
  id: string;
  nombre: string;
  correo: string;
  celular: string;
  totalCompras: number;
  gastoTotal: number;
  ticketPromedio: number;
  ultimaCompra: string;
  diasSinComprar: number | null;
  nivelRiesgo: 'ALTO' | 'MEDIO' | 'BAJO';
  scoreRiesgo: number;
  accionRecomendada: string;
}

export interface PrediccionChurnRespuesta {
  resumen: {
    totalClientes: number;
    riesgoAlto: number;
    riesgoMedio: number;
    riesgoBajo: number;
    tasaRiesgoGlobal: number;
    tasaRetencionEstimada: number;
  };
  clientes: ClienteRiesgoChurn[];
}

export interface AsociacionProductoAfinidad {
  ranking: number;
  productoA: { id: string; nombre: string };
  productoB: { id: string; nombre: string };
  frecuenciaTransaccional: number;
  scoreAfinidad: number;
  estrategiaSugerida: string;
}

export interface RecomendacionesAfinidadRespuesta {
  tipoAnalisis: string;
  descripcion: string;
  asociaciones: AsociacionProductoAfinidad[];
}


