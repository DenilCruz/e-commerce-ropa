import {
  particionar8020,
  RandomForestClasificador,
  KMeansClustering,
  MuestraSupervisada,
  MuestraNoSupervisada,
} from './analytics/ml-models';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In, Not } from 'typeorm';
import { OrderEntity } from '../pedidos/entities/order.entity';
import { OrderItemEntity } from '../pedidos/entities/order-item.entity';
import { UserEntity } from '../usuarios/entities/user.entity';
import { ProductEntity } from '../productos/entities/product.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { ReporteVentasFiltroDto } from './dto/reporte-ventas-filtro.dto';
import { UserStoreEntity } from '../tiendas/entities/user-store.entity';
import { TenantContext } from '../../common/tenant/tenant-context';
import {
  HOLDOUT_DIAS,
  MIN_DIAS_CON_VENTAS,
  PESOS_RIESGO,
  VENTANA_DIAS,
  ajustarPronostico,
  claveDiaLocal,
  clasificarFiabilidad,
  clasificarTendencia,
  construirAsociaciones,
  frecuenciaMinimaConjunta,
  puntuarRiesgoRfm,
  tasaRecompra,
} from './analytics/predictive.math';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepository: Repository<OrderItemEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepository: Repository<ProductVariantEntity>,
    @InjectRepository(UserStoreEntity)
    private readonly membershipRepository: Repository<UserStoreEntity>,
  ) {}

  private get tid(): string {
    return TenantContext.require();
  }

  // =========================================================================
  // HU-89: DASHBOARD CON VENTAS DEL DÍA / MES
  // =========================================================================
  async obtenerMetricasDashboard() {
    const ahora = new Date();

    // Rango Hoy (00:00:00.000 a 23:59:59.999)
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    // Rango Mes Actual (Día 1 00:00:00 a fin de mes)
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);

    // Rango Mes Anterior
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1, 0, 0, 0, 0);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59, 999);

    // Rango Últimos 30 Días para el gráfico de tendencia
    const inicio30Dias = new Date();
    inicio30Dias.setDate(ahora.getDate() - 29);
    inicio30Dias.setHours(0, 0, 0, 0);

    // 1. Ventas Hoy
    const ordenesHoy = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.tenantId = :tid', { tid: this.tid })
      .andWhere('o.fecha BETWEEN :inicio AND :fin', { inicio: inicioHoy, fin: finHoy })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .getMany();

    const montoHoy = ordenesHoy.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const cantidadHoy = ordenesHoy.length;

    // 2. Ventas Mes Actual
    const ordenesMes = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.tenantId = :tid', { tid: this.tid })
      .andWhere('o.fecha BETWEEN :inicio AND :fin', { inicio: inicioMes, fin: finMes })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .getMany();

    const montoMes = ordenesMes.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const cantidadMes = ordenesMes.length;
    const ticketPromedio = cantidadMes > 0 ? montoMes / cantidadMes : 0;

    // 3. Ventas Mes Anterior (para cálculo de % de crecimiento)
    const ordenesMesAnterior = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.tenantId = :tid', { tid: this.tid })
      .andWhere('o.fecha BETWEEN :inicio AND :fin', { inicio: inicioMesAnterior, fin: finMesAnterior })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .getMany();

    const montoMesAnterior = ordenesMesAnterior.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const crecimientoVentasMes =
      montoMesAnterior > 0 ? ((montoMes - montoMesAnterior) / montoMesAnterior) * 100 : montoMes > 0 ? 100 : 0;

    // 4. Tendencia de Ventas (últimos 30 días día a día)
    const ordenes30Dias = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.tenantId = :tid', { tid: this.tid })
      .andWhere('o.fecha >= :inicio', { inicio: inicio30Dias })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .orderBy('o.fecha', 'ASC')
      .getMany();

    // Agrupación por día 'YYYY-MM-DD'
    const mapaDias: Record<string, { total: number; pedidos: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(inicio30Dias);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      mapaDias[key] = { total: 0, pedidos: 0 };
    }

    ordenes30Dias.forEach((o) => {
      const key = new Date(o.fecha).toISOString().slice(0, 10);
      if (mapaDias[key]) {
        mapaDias[key].total += Number(o.total || 0);
        mapaDias[key].pedidos += 1;
      }
    });

    const tendenciaVentas = Object.entries(mapaDias).map(([fecha, data]) => ({
      fecha,
      dia: new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      total: Number(data.total.toFixed(2)),
      pedidos: data.pedidos,
    }));

    // 5. Distribución de Pedidos por Estado
    const estadosTotales = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.estado', 'estado')
      .addSelect('COUNT(o.id)', 'cantidad')
      .addSelect('SUM(o.total)', 'total')
      .where('o.tenantId = :tid', { tid: this.tid })
      .groupBy('o.estado')
      .getRawMany();

    const resumenEstados = estadosTotales.map((e) => ({
      estado: e.estado,
      cantidad: Number(e.cantidad || 0),
      total: Number(Number(e.total || 0).toFixed(2)),
    }));

    // 6. Totales Generales Históricos
    const totalOrdenesHistoricas = await this.orderRepository.count({ where: { tenantId: this.tid } });
    const totalUsuariosRegistrados = await this.membershipRepository.count({ where: { tiendaId: this.tid } });
    const totalProductosActivos = await this.productRepository.count({ where: { activo: true, tenantId: this.tid } });

    return {
      ventasHoy: {
        monto: Number(montoHoy.toFixed(2)),
        cantidad: cantidadHoy,
      },
      ventasMes: {
        monto: Number(montoMes.toFixed(2)),
        cantidad: cantidadMes,
        crecimientoVsMesAnterior: Number(crecimientoVentasMes.toFixed(1)),
        montoMesAnterior: Number(montoMesAnterior.toFixed(2)),
      },
      ticketPromedio: Number(ticketPromedio.toFixed(2)),
      totalesGenerales: {
        pedidos: totalOrdenesHistoricas,
        usuarios: totalUsuariosRegistrados,
        productos: totalProductosActivos,
      },
      tendenciaVentas,
      resumenEstados,
    };
  }

  // =========================================================================
  // HU-90: PRODUCTOS MÁS VENDIDOS
  // =========================================================================
  async obtenerProductosMasVendidos(limite: number = 8) {
    // Consulta agregada por producto uniendo detalle_nota_venta
    const resultados = await this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.notaventa', 'orden')
      .where('item.tenantId = :tid', { tid: this.tid })
      .andWhere('orden.estado != :cancelado', { cancelado: 'CANCELADO' })
      .select('item.producto_id', 'productoId')
      .addSelect('MAX(item.nombre_producto)', 'nombre')
      .addSelect('SUM(item.cantidad)', 'unidadesVendidas')
      .addSelect('SUM(item.subtotal)', 'ingresosGenerados')
      .groupBy('item.producto_id')
      .orderBy('"unidadesVendidas"', 'DESC')
      .limit(limite)
      .getRawMany();

    if (!resultados || resultados.length === 0) {
      // Si no hay ventas registradas aún, traemos los productos destacados o primeros con stock
      const productos = await this.productRepository.find({
        where: { tenantId: this.tid },
        take: limite,
        relations: ['categoria', 'variantes', 'imagenes'],
      });

      return productos.map((p) => {
        const stockTotal = (p.variantes || []).reduce((acc, v) => acc + (v.stock || 0), 0);
        const imgPrincipal = p.imagenes?.find((i) => i.principal) || p.imagenes?.[0];
        return {
          productoId: p.id,
          nombre: p.nombre,
          categoria: p.categoria?.nombre || 'General',
          precio: Number(p.precio),
          unidadesVendidas: 0,
          ingresosGenerados: 0,
          stockActual: stockTotal,
          imagenUrl: imgPrincipal?.url || null,
        };
      });
    }

    // Enriquecer con información del producto (categoría, imagen y stock total)
    const productosIds = resultados.map((r) => r.productoId).filter(Boolean);
    const productosInfo = await this.productRepository.find({
      where: { id: In(productosIds), tenantId: this.tid },
      relations: ['categoria', 'variantes', 'imagenes'],
    });

    const mapaProductos = new Map(productosInfo.map((p) => [p.id, p]));

    return resultados.map((r) => {
      const prod = mapaProductos.get(r.productoId);
      const stockTotal = prod?.variantes ? prod.variantes.reduce((acc, v) => acc + (v.stock || 0), 0) : 0;
      const imgPrincipal = prod?.imagenes?.find((i) => i.principal) || prod?.imagenes?.[0];

      return {
        productoId: r.productoId,
        nombre: prod?.nombre || r.nombre || 'Producto',
        categoria: prod?.categoria?.nombre || 'General',
        precio: prod ? Number(prod.precio) : 0,
        unidadesVendidas: Number(r.unidadesVendidas || 0),
        ingresosGenerados: Number(Number(r.ingresosGenerados || 0).toFixed(2)),
        stockActual: stockTotal,
        imagenUrl: imgPrincipal?.url || null,
      };
    });
  }

  // =========================================================================
  // HU-91: PRODUCTOS CON STOCK BAJO / AGOTADOS
  // =========================================================================
  async obtenerAlertasStockBajo() {
    const variantes = await this.variantRepository
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.producto', 'p')
      .leftJoinAndSelect('v.talla', 't')
      .leftJoinAndSelect('v.color', 'c')
      .leftJoinAndSelect('p.categoria', 'cat')
      .leftJoinAndSelect('p.imagenes', 'img')
      .where('v.tenantId = :tid', { tid: this.tid })
      .andWhere('v.stock <= v.stock_minimo')
      .andWhere('v.activa = true')
      .orderBy('v.stock', 'ASC')
      .addOrderBy('p.nombre', 'ASC')
      .getMany();

    return variantes.map((v) => {
      const imgPrincipal = v.producto.imagenes?.find((i) => i.principal) || v.producto.imagenes?.[0];
      return {
        varianteId: v.id,
        productoId: v.productoId,
        nombreProducto: v.producto.nombre,
        categoria: v.producto.categoria?.nombre || 'General',
        sku: v.sku,
        talla: v.talla?.nombre || 'Única',
        color: v.color?.nombre || 'Estándar',
        stockActual: v.stock,
        stockMinimo: v.stockMinimo,
        estadoStock: v.stock === 0 ? 'AGOTADO' : 'CRITICO',
        precio: Number(v.producto.precio) + Number(v.precioExtra || 0),
        imagenUrl: imgPrincipal?.url || null,
      };
    });
  }

  // =========================================================================
  // HU-92: REPORTES DE VENTAS POR RANGO DE FECHAS
  // =========================================================================
  async generarReporteVentas(filtros: ReporteVentasFiltroDto) {
    const qb = this.orderRepository
      .createQueryBuilder('orden')
      .leftJoinAndSelect('orden.usuario', 'usuario')
      .leftJoinAndSelect('orden.cupon', 'cupon')
      .leftJoinAndSelect('orden.items', 'items')
      .leftJoinAndSelect('orden.pago', 'pago')
      .where('orden.tenantId = :tid', { tid: this.tid });

    // Filtro por Fecha Inicio
    if (filtros.fechaInicio) {
      const fInicio = new Date(`${filtros.fechaInicio}T00:00:00`);
      qb.andWhere('orden.fecha >= :fInicio', { fInicio });
    }

    // Filtro por Fecha Fin
    if (filtros.fechaFin) {
      const fFin = new Date(`${filtros.fechaFin}T23:59:59.999`);
      qb.andWhere('orden.fecha <= :fFin', { fFin });
    }

    // Filtro por Estado
    if (filtros.estado && filtros.estado !== 'TODOS') {
      qb.andWhere('orden.estado = :estado', { estado: filtros.estado });
    }

    // Filtro por Usuario / Cliente
    if (filtros.usuarioId && filtros.usuarioId.trim() !== '') {
      qb.andWhere('orden.usuario_id = :usuarioId', { usuarioId: filtros.usuarioId.trim() });
    }

    // Filtro por Categoría de los productos en la orden
    if (filtros.categoriaId && filtros.categoriaId.trim() !== '') {
      qb.andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('1')
          .from('detalle_nota_venta', 'itemFiltro')
          .innerJoin('producto', 'prodFiltro', 'prodFiltro.id = itemFiltro.producto_id')
          .leftJoin('categoria', 'catFiltro', 'catFiltro.id = prodFiltro.categoria_id')
          .where('itemFiltro.notaventa_id = orden.id')
          .andWhere('(catFiltro.id = :catFiltroId OR catFiltro.padre_id = :catFiltroId)')
          .getQuery();
        return `EXISTS (${subQuery})`;
      }).setParameter('catFiltroId', filtros.categoriaId.trim());
    }

    // Filtro por Búsqueda (N° pedido, nombre, apellido, correo)
    if (filtros.busqueda && filtros.busqueda.trim() !== '') {
      const term = `%${filtros.busqueda.trim()}%`;
      qb.andWhere(
        '(orden.nro ILIKE :term OR usuario.nombre ILIKE :term OR usuario.apellido ILIKE :term OR usuario.correo ILIKE :term)',
        { term },
      );
    }

    // Total general del conjunto filtrado para KPIs del reporte
    const todosFiltrados = await qb.getMany();
    const totalFacturado = todosFiltrados
      .filter((o) => o.estado !== 'CANCELADO')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalDescuentos = todosFiltrados.reduce((sum, o) => sum + Number(o.descuento || 0), 0);
    const totalEnvios = todosFiltrados.reduce((sum, o) => sum + Number(o.costoEnvio || 0), 0);
    const totalPedidos = todosFiltrados.length;
    const ticketMedio = totalPedidos > 0 ? totalFacturado / totalPedidos : 0;

    // Paginación
    const pagina = Number(filtros.pagina) || 1;
    const limite = Number(filtros.limite) || 20;
    const salto = (pagina - 1) * limite;

    qb.orderBy('orden.fecha', 'DESC').skip(salto).take(limite);

    const [pedidosPaginados, totalRegistros] = await qb.getManyAndCount();

    return {
      resumen: {
        totalFacturado: Number(totalFacturado.toFixed(2)),
        totalPedidos,
        totalDescuentos: Number(totalDescuentos.toFixed(2)),
        totalEnvios: Number(totalEnvios.toFixed(2)),
        ticketMedio: Number(ticketMedio.toFixed(2)),
      },
      pedidos: pedidosPaginados.map((p) => ({
        id: p.id,
        nro: p.nro,
        fecha: p.fecha,
        cliente: p.usuario
          ? {
              id: p.usuario.id,
              nombre: `${p.usuario.nombre} ${p.usuario.apellido}`.trim(),
              correo: p.usuario.correo,
            }
          : { id: null, nombre: 'Cliente General', correo: 'N/A' },
        subtotal: Number(p.subtotal),
        descuento: Number(p.descuento),
        costoEnvio: Number(p.costoEnvio),
        total: Number(p.total),
        estado: p.estado,
        metodoPago: p.pago?.metodoPagoId ? 'Electrónico / QR' : 'Efectivo',
        cuponCodigo: p.cupon?.codigo || null,
        cantidadItems: p.items?.length || 0,
        items: (p.items || []).map((i) => ({
          id: i.id,
          nombreProducto: i.nombreProducto,
          cantidad: i.cantidad,
          precio: Number(i.precio),
          subtotal: Number(i.subtotal),
          talla: i.talla,
          color: i.color,
        })),
      })),
      paginacion: {
        totalRegistros,
        paginaActual: pagina,
        totalPaginas: Math.ceil(totalRegistros / limite) || 1,
        limite,
      },
    };
  }

  // =========================================================================
  // HU-93: USUARIOS NUEVOS POR MES Y CRECIMIENTO
  // =========================================================================
  async obtenerUsuariosNuevosPorMes(mesesAtras: number = 6) {
    const ahora = new Date();
    const miembros = () =>
      this.membershipRepository
        .createQueryBuilder('m')
        .innerJoin('m.usuario', 'u')
        .where('m.tiendaId = :tid', { tid: this.tid });

    const totalUsuarios = await miembros().getCount();
    const totalVerificados = await miembros().andWhere('u.emailVerificado = true').getCount();
    const totalActivos = await miembros().andWhere('u.activo = true').andWhere('m.activo = true').getCount();

    // Calculamos los últimos N meses
    const mesesData: { mes: string; label: string; fechaInicio: Date; fechaFin: Date }[] = [];
    for (let i = mesesAtras - 1; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const fInicio = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const fFin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });

      mesesData.push({ mes: mesKey, label, fechaInicio: fInicio, fechaFin: fFin });
    }

    const desgloseMensual = await Promise.all(
      mesesData.map(async (m) => {
        // "Nuevos" = personas que se unieron a esta tienda en el mes
        const total = await miembros()
          .andWhere('m.creadoEn BETWEEN :inicio AND :fin', { inicio: m.fechaInicio, fin: m.fechaFin })
          .getCount();

        const verificados = await miembros()
          .andWhere('m.creadoEn BETWEEN :inicio AND :fin', { inicio: m.fechaInicio, fin: m.fechaFin })
          .andWhere('u.emailVerificado = true')
          .getCount();

        return {
          mes: m.mes,
          label: m.label,
          total,
          verificados,
        };
      }),
    );

    // Comparativa mes actual vs mes anterior
    const actual = desgloseMensual[desgloseMensual.length - 1]?.total || 0;
    const anterior = desgloseMensual[desgloseMensual.length - 2]?.total || 0;
    const crecimientoVsMesAnterior =
      anterior > 0 ? ((actual - anterior) / anterior) * 100 : actual > 0 ? 100 : 0;

    // Últimos 10 usuarios registrados
    const ultimasMembresias = await this.membershipRepository.find({
      where: { tiendaId: this.tid },
      order: { creadoEn: 'DESC' },
      take: 10,
      relations: ['usuario', 'rol'],
    });

    return {
      resumen: {
        totalUsuarios,
        totalVerificados,
        totalActivos,
        tasaVerificacion: totalUsuarios > 0 ? Number(((totalVerificados / totalUsuarios) * 100).toFixed(1)) : 0,
        nuevosEsteMes: actual,
        crecimientoVsMesAnterior: Number(crecimientoVsMesAnterior.toFixed(1)),
      },
      desgloseMensual,
      ultimosUsuarios: ultimasMembresias.map((m) => ({
        id: m.usuario.id,
        nombre: `${m.usuario.nombre} ${m.usuario.apellido}`.trim(),
        correo: m.usuario.correo,
        rol: m.rol?.nombre || 'CLIENTE',
        emailVerificado: m.usuario.emailVerificado,
        activo: m.usuario.activo && m.activo,
        creadoEn: m.creadoEn,
      })),
    };
  }

  // =========================================================================
  // ANALÍTICA PREDICTIVA IA 1: PROYECCIÓN Y ANÁLISIS PREDICTIVO DE VENTAS
  // =========================================================================
  async analisisPredictivoVentas() {
    // Ventana de días COMPLETOS que termina ayer: hoy sigue en curso y falsearía la pendiente
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - VENTANA_DIAS);

    // 1. Órdenes reales no canceladas de la ventana de análisis
    const ordenes = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.tenantId = :tid', { tid: this.tid })
      .andWhere('o.fecha >= :inicio', { inicio })
      .andWhere('o.fecha < :hoy', { hoy })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .orderBy('o.fecha', 'ASC')
      .getMany();

    // 2. Ventas reales día a día, por día local (los días sin ventas cuentan como 0)
    const mapaDias: Record<string, number> = {};
    for (let i = 0; i < VENTANA_DIAS; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      mapaDias[claveDiaLocal(d)] = 0;
    }
    ordenes.forEach((o) => {
      const key = claveDiaLocal(new Date(o.fecha));
      if (mapaDias[key] !== undefined) mapaDias[key] += Number(o.total || 0);
    });

    const entries = Object.entries(mapaDias);
    const valores = entries.map(([, v]) => v);
    const n = valores.length;
    const diasConVentas = valores.filter((v) => v > 0).length;
    const promedioDiario = n > 0 ? valores.reduce((a, b) => a + b, 0) / n : 0;

    // 3. El modelo (recta o promedio) se elige y se mide prediciendo los últimos días reales
    const pronostico = ajustarPronostico(valores);
    const { pendiente, intercepto, r2, precision } = pronostico;
    const fiabilidad = clasificarFiabilidad(precision, diasConVentas);
    const hayDatosSuficientes = fiabilidad !== 'INSUFICIENTE';
    const tendencia = !hayDatosSuficientes
      ? ('INSUFICIENTE' as const)
      : pronostico.modelo === 'PROMEDIO'
      ? ('ESTABLE' as const)
      : clasificarTendencia({ pendiente, promedio: promedioDiario, r2 });

    // 4. Proyección desde hoy: solo si el historial alcanza para que signifique algo
    const estimado = (i: number) => Math.max(0, pendiente * (n + i) + intercepto);
    const acumulado = (dias: number) =>
      hayDatosSuficientes
        ? Number(Array.from({ length: dias }, (_, k) => estimado(k + 1)).reduce((a, b) => a + b, 0).toFixed(2))
        : null;

    // 5. Serie para el gráfico: histórico reciente y, si corresponde, proyección
    const serieHistoricoReciente = entries.slice(-14).map(([fecha, valor]) => ({
      fecha,
      label: new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      valorReal: Number(valor.toFixed(2)),
      valorProyectado: null as number | null,
      tipo: 'HISTORICO' as const,
    }));

    const serieProyeccion = hayDatosSuficientes
      ? Array.from({ length: 14 }, (_, k) => {
          const d = new Date(hoy);
          d.setDate(hoy.getDate() + k);
          return {
            fecha: claveDiaLocal(d),
            label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            valorReal: null as number | null,
            valorProyectado: Number(estimado(k + 1).toFixed(2)),
            tipo: 'PROYECCION' as const,
          };
        })
      : [];

    const mensaje = hayDatosSuficientes
      ? null
      : `Aún no hay historial suficiente para proyectar: se necesitan al menos ${MIN_DIAS_CON_VENTAS} días con ventas en los últimos ${VENTANA_DIAS} (hay ${diasConVentas}) y ventas en los ${HOLDOUT_DIAS} días de prueba.`;

    return {
      metricasPredictivas: {
        proyeccionVentas7Dias: acumulado(7),
        proyeccionVentas14Dias: acumulado(14),
        proyeccionVentas30Dias: acumulado(30),
        promedioDiarioHistorico: Number(promedioDiario.toFixed(2)),
        tendencia,
        pendienteDiaria: Number(pendiente.toFixed(2)),
        nivelConfianza: precision !== null && hayDatosSuficientes ? `${(precision * 100).toFixed(1)}%` : 'Sin datos suficientes',
        modelo: pronostico.modelo,
        precision,
        errorModelo: pronostico.wapeModelo,
        errorPromedioSimple: pronostico.wapeBase,
        diasDePrueba: HOLDOUT_DIAS,
        r2: Number(r2.toFixed(4)),
        fiabilidad,
        diasConVentas,
        ordenesAnalizadas: ordenes.length,
        ventanaDias: VENTANA_DIAS,
        mensaje,
      },
      serieGrafico: [...serieHistoricoReciente, ...serieProyeccion],
      recomendacionEstrategica:
        tendencia === 'INSUFICIENTE'
          ? mensaje
          : tendencia === 'ALCISTA'
          ? 'Tendencia positiva detectada: se proyecta aumento sostenido de la demanda. Asegurar reposición de stock en prendas estrella.'
          : tendencia === 'BAJISTA'
          ? 'Tendencia con desaceleración: activar campañas de marketing con cupones dirigidos a clientes en riesgo para estimular la rotación.'
          : 'Demanda estable y balanceada: mantener niveles de inventario actuales y monitorear promociones estacionales.',
    };
  }

  // =========================================================================
  // ANALÍTICA PREDICTIVA IA 2: SEGMENTACIÓN RFM Y RIESGO DE ABANDONO (CHURN)
  // =========================================================================
  async prediccionAbandonoClientes() {
    const ahora = new Date();

    // 1. Compras reales por cliente: cantidad, gasto y fecha de la última
    const ordenesPorUsuario = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.tenantId = :tid', { tid: this.tid })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .select('o.usuario_id', 'usuarioId')
      .addSelect('COUNT(o.id)', 'totalCompras')
      .addSelect('SUM(o.total)', 'gastoTotal')
      .addSelect('MAX(o.fecha)', 'ultimaCompra')
      .groupBy('o.usuario_id')
      .getRawMany();

    const mapaOrdenes = new Map<string, { totalCompras: number; gastoTotal: number; ultimaCompra: Date }>();
    ordenesPorUsuario.forEach((r) => {
      if (r.usuarioId) {
        mapaOrdenes.set(r.usuarioId, {
          totalCompras: Number(r.totalCompras || 0),
          gastoTotal: Number(r.gastoTotal || 0),
          ultimaCompra: new Date(r.ultimaCompra),
        });
      }
    });

    // 2. Clientes de la tienda (rol CLIENTE)
    const membresiasCliente = await this.membershipRepository
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.usuario', 'u')
      .innerJoin('m.rol', 'r', "r.nombre = 'CLIENTE'")
      .where('m.tiendaId = :tid', { tid: this.tid })
      .getMany();
    const clientes = membresiasCliente.map((m) => m.usuario);

    const diasDesde = (fecha: Date) => Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));

    // 3. RFM contra los demás compradores de esta misma tienda
    const rfm = puntuarRiesgoRfm(
      clientes
        .filter((c) => mapaOrdenes.has(c.id))
        .map((c) => {
          const stats = mapaOrdenes.get(c.id)!;
          return {
            id: c.id,
            diasSinComprar: diasDesde(stats.ultimaCompra),
            totalCompras: stats.totalCompras,
            gastoTotal: stats.gastoTotal,
          };
        }),
    );

    const ACCIONES = {
      ALTO: 'Riesgo alto de abandono frente al resto de tus clientes: emitir un cupón de reactivación y un recordatorio personalizado.',
      MEDIO: 'Riesgo moderado: recomendar colecciones afines a sus compras anteriores.',
      BAJO: 'Cliente activo y fidelizado: mantener comunicación regular de nuevos arribos o invitarlo a preventas.',
      SIN_COMPRAS: 'Usuario registrado sin compras: enviar un cupón de bienvenida para incentivar su primer pedido.',
      SIN_DATOS: `Aún no se puede clasificar: se necesitan al menos ${rfm.minimoRequerido} clientes con compras y hay ${rfm.compradores}.`,
    } as const;

    const clientesAnalizados = clientes.map((c) => {
      const stats = mapaOrdenes.get(c.id);
      const totalCompras = stats?.totalCompras || 0;
      const gastoTotal = stats?.gastoTotal || 0;
      const puntaje = rfm.puntajes.get(c.id);

      const nivelRiesgo: 'ALTO' | 'MEDIO' | 'BAJO' | 'SIN_COMPRAS' | 'SIN_DATOS' = !stats
        ? 'SIN_COMPRAS'
        : puntaje
        ? puntaje.nivelRiesgo
        : 'SIN_DATOS';

      return {
        id: c.id,
        nombre: `${c.nombre} ${c.apellido}`.trim(),
        correo: c.correo,
        celular: c.celular || 'N/A',
        totalCompras,
        gastoTotal: Number(gastoTotal.toFixed(2)),
        ticketPromedio: totalCompras > 0 ? Number((gastoTotal / totalCompras).toFixed(2)) : 0,
        ultimaCompra: stats ? stats.ultimaCompra.toISOString().slice(0, 10) : 'Sin compras',
        diasSinComprar: stats ? diasDesde(stats.ultimaCompra) : null,
        nivelRiesgo,
        scoreRiesgo: puntaje?.scoreRiesgo ?? null,
        rfm: puntaje?.rfm ?? null,
        accionRecomendada: ACCIONES[nivelRiesgo],
      };
    });

    // Mayor riesgo primero; los que no se pueden puntuar al final
    clientesAnalizados.sort((a, b) => (b.scoreRiesgo ?? -1) - (a.scoreRiesgo ?? -1));

    const contar = (nivel: string) => clientesAnalizados.filter((c) => c.nivelRiesgo === nivel).length;
    const riesgoAlto = contar('ALTO');
    const riesgoMedio = contar('MEDIO');
    const riesgoBajo = contar('BAJO');
    const clasificados = riesgoAlto + riesgoMedio + riesgoBajo;

    return {
      resumen: {
        totalClientes: clientesAnalizados.length,
        riesgoAlto,
        riesgoMedio,
        riesgoBajo,
        sinCompras: contar('SIN_COMPRAS'),
        sinDatos: contar('SIN_DATOS'),
        clasificados,
        tasaRecompra: tasaRecompra(clientes.filter((c) => mapaOrdenes.has(c.id)).map((c) => mapaOrdenes.get(c.id)!.totalCompras)),
      },
      modelo: {
        tipo: 'RFM_RELATIVO',
        suficiente: rfm.suficiente,
        compradores: rfm.compradores,
        minimoRequerido: rfm.minimoRequerido,
        pesos: PESOS_RIESGO,
        descripcion:
          'Riesgo relativo: recencia, frecuencia y monto de cada cliente comparados con los demás compradores de esta tienda.',
      },
      clientes: clientesAnalizados,
    };
  }

  // =========================================================================
  // ANALÍTICA PREDICTIVA IA 3: AFINIDAD DE PRODUCTOS (MARKET BASKET)
  // =========================================================================
  async recomendacionesAfinidadProductos() {
    const pedidosValidos = () =>
      this.orderItemRepository
        .createQueryBuilder('d')
        .innerJoin('d.notaventa', 'nv')
        .where('d.tenantId = :tid', { tid: this.tid })
        .andWhere('nv.estado != :cancelado', { cancelado: 'CANCELADO' });

    // 1. Totales reales: pedidos analizados y pedidos que contienen cada producto
    const totales = await pedidosValidos().select('COUNT(DISTINCT d.notaventa_id)', 'total').getRawOne();
    const totalPedidos = Number(totales?.total || 0);

    const porProducto = await pedidosValidos()
      .select('d.producto_id', 'productoId')
      .addSelect('COUNT(DISTINCT d.notaventa_id)', 'pedidos')
      .groupBy('d.producto_id')
      .getRawMany();
    const conteos = new Map<string, number>(porProducto.map((r) => [r.productoId as string, Number(r.pedidos)]));

    const conVariosProductos = await pedidosValidos()
      .select('d.notaventa_id', 'pedidoId')
      .groupBy('d.notaventa_id')
      .having('COUNT(DISTINCT d.producto_id) > 1')
      .getRawMany();

    // 2. Pares comprados juntos en el mismo pedido, con la frecuencia mínima exigida
    const paresRaw = await this.orderItemRepository
      .createQueryBuilder('d1')
      .innerJoin(OrderItemEntity, 'd2', 'd1.notaventa_id = d2.notaventa_id AND d1.producto_id < d2.producto_id')
      .innerJoin('d1.notaventa', 'nv')
      .where('d1.tenantId = :tid', { tid: this.tid })
      .andWhere('nv.estado != :cancelado', { cancelado: 'CANCELADO' })
      .select('d1.producto_id', 'productoAId')
      .addSelect('MAX(d1.nombre_producto)', 'productoANombre')
      .addSelect('d2.producto_id', 'productoBId')
      .addSelect('MAX(d2.nombre_producto)', 'productoBNombre')
      .addSelect('COUNT(DISTINCT d1.notaventa_id)', 'frecuenciaConjunta')
      .groupBy('d1.producto_id')
      .addGroupBy('d2.producto_id')
      .having('COUNT(DISTINCT d1.notaventa_id) >= :minimo', { minimo: frecuenciaMinimaConjunta(totalPedidos) })
      .getRawMany();

    // 3. Soporte, confianza y lift calculados sobre esos datos
    const asociaciones = construirAsociaciones(
      paresRaw.map((p) => ({
        productoAId: p.productoAId,
        productoANombre: p.productoANombre,
        productoBId: p.productoBId,
        productoBNombre: p.productoBNombre,
        frecuencia: Number(p.frecuenciaConjunta),
      })),
      conteos,
      totalPedidos,
    );

    return {
      tipoAnalisis: asociaciones.length > 0 ? 'FRECUENTEMENTE_COMPRADOS_JUNTOS' : 'SIN_DATOS_SUFICIENTES',
      descripcion:
        asociaciones.length > 0
          ? `Asociaciones calculadas sobre ${totalPedidos} pedidos reales: soporte, confianza y lift de cada par de productos.`
          : `Todavía no hay productos comprados juntos al menos ${frecuenciaMinimaConjunta(totalPedidos)} veces (${totalPedidos} pedidos analizados, ${conVariosProductos.length} con más de un producto).`,
      pedidosAnalizados: totalPedidos,
      pedidosConVariosProductos: conVariosProductos.length,
      frecuenciaMinima: frecuenciaMinimaConjunta(totalPedidos),
      asociaciones,
    };
  }

  // =========================================================================
  // MODELOS MACHINE LEARNING (SUPERVISADO: RANDOM FOREST + NO SUPERVISADO: K-MEANS)
  // PARTICIÓN 80/20 (TRAIN / TEST SPLIT)
  // =========================================================================
  async modelosMachineLearning() {
    const ahora = new Date();

    const ordenesPorUsuario = await this.orderRepository
      .createQueryBuilder('o')
      .leftJoin('o.usuario', 'u')
      .where('o.tenantId = :tid', { tid: this.tid })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .select('o.usuario_id', 'usuarioId')
      .addSelect('u.nombre', 'nombre')
      .addSelect('u.apellido', 'apellido')
      .addSelect('u.correo', 'correo')
      .addSelect('COUNT(o.id)', 'totalCompras')
      .addSelect('SUM(o.total)', 'gastoTotal')
      .addSelect('MAX(o.fecha)', 'ultimaCompra')
      .groupBy('o.usuario_id')
      .addGroupBy('u.nombre')
      .addGroupBy('u.apellido')
      .addGroupBy('u.correo')
      .getRawMany();

    const compradores = ordenesPorUsuario.map((r) => {
      const uCompra = new Date(r.ultimaCompra);
      const recenciaDias = Math.max(0, Math.floor((ahora.getTime() - uCompra.getTime()) / (1000 * 60 * 60 * 24)));
      const totalCompras = Number(r.totalCompras || 1);
      const gastoTotal = Number(r.gastoTotal || 0);
      const ticketPromedio = totalCompras > 0 ? Number((gastoTotal / totalCompras).toFixed(2)) : 0;
      const nombreCompleto = `${r.nombre || ''} ${r.apellido || ''}`.trim() || 'Cliente AURA';

      return {
        id: r.usuarioId,
        nombre: nombreCompleto,
        correo: r.correo || 'sin-correo@aura.com',
        recenciaDias,
        totalCompras,
        gastoTotal,
        ticketPromedio,
      };
    });

    const muestrasSupervisadas: MuestraSupervisada[] = compradores.map((c) => ({
      id: c.id,
      caracteristicas: [c.recenciaDias, c.totalCompras, c.gastoTotal, c.ticketPromedio],
      etiqueta: c.totalCompras >= 2 && c.recenciaDias <= 150 ? 1 : 0,
    }));

    const muestrasNoSupervisadas: MuestraNoSupervisada[] = compradores.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      correo: c.correo,
      valores: [c.recenciaDias, c.totalCompras, c.gastoTotal],
    }));

    const partSupervisada = particionar8020(muestrasSupervisadas, 0.20, 42);

    const rf = new RandomForestClasificador(15, 4);
    rf.entrenar(partSupervisada.entrenamiento);
    const metricasRF = rf.evaluar(partSupervisada.prueba);
    const importanciaVars = rf.obtenerImportanciaCaracteristicas();

    const prediccionesRF = partSupervisada.prueba.map((m) => {
      const prob = rf.predecirProbabilidad(m.caracteristicas);
      return {
        id: m.id,
        real: m.etiqueta,
        predicho: rf.predecir(m.caracteristicas),
        probabilidadFidelidad: Number(prob.toFixed(4)),
      };
    });

    const partNoSupervisada = particionar8020(muestrasNoSupervisadas, 0.20, 42);

    const kmeans = new KMeansClustering(3, 40);
    const entKmeans = kmeans.entrenar(partNoSupervisada.entrenamiento);
    const silhouette = kmeans.calcularSilhouette(partNoSupervisada.prueba);
    const clusters = kmeans.generarReporteClusters(muestrasNoSupervisadas);

    return {
      exito: true,
      timestamp: new Date().toISOString(),
      particion: {
        proporcion: '80% Entrenamiento / 20% Prueba',
        totalMuestras: compradores.length,
        entrenamiento: partSupervisada.tamanioEntrenamiento,
        prueba: partSupervisada.tamanioPrueba,
      },
      modeloSupervisado: {
        algoritmo: 'Random Forest (Ensamble de Árboles de Decisión)',
        tipo: 'SUPERVISADO',
        objetivo: 'Clasificación de Fidelidad y Recompra de Clientes',
        arbolesEnsamble: 15,
        metricasPrueba20Pct: metricasRF,
        importanciaCaracteristicas: importanciaVars,
        muestrasEvaluadas: prediccionesRF,
      },
      modeloNoSupervisado: {
        algoritmo: 'K-Means Clustering (Inicialización K-Means++)',
        tipo: 'NO_SUPERVISADO',
        objetivo: 'Segmentación de Clientes por Recencia, Frecuencia y Gasto',
        kClusters: 3,
        iteracionesConvergencia: entKmeans.iteraciones,
        inercia: entKmeans.inercia,
        silhouetteScore: silhouette,
        interpretacionSilhouette:
          silhouette > 0.5
            ? 'Excelente separación y cohesión entre clusters'
            : silhouette > 0.25
            ? 'Buena estructura de clusters identificada'
            : 'Clusters con solapamiento moderado',
        clusters,
      },
    };
  }

}
