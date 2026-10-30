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
  /** how far a typical day (10th to 90th percentile) falls from the projection; only on projected points */
  rangoBajo?: number | null;
  rangoAlto?: number | null;
  tipo: 'HISTORICO' | 'PROYECCION';
}

export interface MetricasPredictivasVentas {
  /** null when there is not enough history to project */
  proyeccionVentas7Dias: number | null;
  proyeccionVentas14Dias: number | null;
  proyeccionVentas30Dias: number | null;
  promedioDiarioHistorico: number;
  tendencia: 'ALCISTA' | 'ESTABLE' | 'BAJISTA' | 'INSUFICIENTE';
  pendienteDiaria: number;
  /** Precision measured on held-out days as a percentage, or a notice when there is not enough data */
  nivelConfianza: string;
  /** model chosen by testing both on the last days: trend line or plain average */
  modelo: 'PROMEDIO' | 'REGRESION' | 'DIA_DE_SEMANA' | 'DIA_DE_SEMANA_NIVEL';
  precision: number | null;
  errorModelo: number | null;
  errorPromedioSimple: number | null;
  diasDePrueba: number;
  ventanasDePrueba: number;
  r2: number;
  fiabilidad: 'INSUFICIENTE' | 'BAJA' | 'MEDIA' | 'ALTA';
  diasConVentas: number;
  ordenesAnalizadas: number;
  ventanaDias: number;
  mensaje: string | null;
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
  nivelRiesgo: 'ALTO' | 'MEDIO' | 'BAJO' | 'SIN_COMPRAS' | 'SIN_DATOS';
  /** null when the customer cannot be scored (no purchases or not enough buyers) */
  scoreRiesgo: number | null;
  rfm: { recencia: number; frecuencia: number; monto: number } | null;
  accionRecomendada: string;
}

export interface PrediccionChurnRespuesta {
  resumen: {
    totalClientes: number;
    riesgoAlto: number;
    riesgoMedio: number;
    riesgoBajo: number;
    sinCompras: number;
    sinDatos: number;
    clasificados: number;
    /** % of buyers with two or more purchases; null when there are no buyers */
    tasaRecompra: number | null;
  };
  modelo: {
    tipo: string;
    suficiente: boolean;
    compradores: number;
    minimoRequerido: number;
    descripcion: string;
  };
  clientes: ClienteRiesgoChurn[];
}

export interface AsociacionProductoAfinidad {
  ranking: number;
  productoA: { id: string; nombre: string };
  productoB: { id: string; nombre: string };
  frecuenciaTransaccional: number;
  soporte: number;
  confianzaAB: number;
  confianzaBA: number;
  lift: number;
  /** standard deviations above what chance alone would give */
  zScore: number;
  scoreAfinidad: number;
  estrategiaSugerida: string;
}

export interface RecomendacionesAfinidadRespuesta {
  tipoAnalisis: string;
  descripcion: string;
  pedidosAnalizados: number;
  pedidosConVariosProductos: number;
  frecuenciaMinima: number;
  asociaciones: AsociacionProductoAfinidad[];
}

export interface ModelosMachineLearningRespuesta {
  exito: boolean;
  timestamp: string;
  particion: {
    proporcion: string;
    totalMuestras: number;
    entrenamiento: number;
    prueba: number;
  };
  modeloSupervisado: {
    algoritmo: string;
    tipo: string;
    objetivo: string;
    arbolesEnsamble: number;
    metricasPrueba20Pct: {
      exactitud: number;
      precision: number;
      exhaustividad: number;
      f1Score: number;
      matrizConfusion: {
        verdaderosPositivos: number;
        falsosPositivos: number;
        verdaderosNegativos: number;
        falsosNegativos: number;
      };
      totalEvaluados: number;
    };
    importanciaCaracteristicas: { caracteristica: string; peso: number }[];
    muestrasEvaluadas: { id?: string; real: number; predicho: number; probabilidadFidelidad: number }[];
  };
  modeloNoSupervisado: {
    algoritmo: string;
    tipo: string;
    objetivo: string;
    kClusters: number;
    iteracionesConvergencia: number;
    inercia: number;
    silhouetteScore: number;
    interpretacionSilhouette: string;
    clusters: {
      clusterId: number;
      nombre: string;
      descripcion: string;
      centroideOriginal: number[];
      cantidadClientes: number;
      porcentaje: number;
      clientes: { id: string; nombre: string; correo: string; distanciaAlCentroide: number }[];
    }[];
  };
}
