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

