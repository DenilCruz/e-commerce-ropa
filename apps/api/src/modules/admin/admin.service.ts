import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In, Not } from 'typeorm';
import { OrderEntity } from '../pedidos/entities/order.entity';
import { OrderItemEntity } from '../pedidos/entities/order-item.entity';
import { UserEntity } from '../usuarios/entities/user.entity';
import { ProductEntity } from '../productos/entities/product.entity';
import { ProductVariantEntity } from '../productos/entities/product-variant.entity';
import { ReporteVentasFiltroDto } from './dto/reporte-ventas-filtro.dto';

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
  ) {}

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
      .where('o.fecha BETWEEN :inicio AND :fin', { inicio: inicioHoy, fin: finHoy })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .getMany();

    const montoHoy = ordenesHoy.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const cantidadHoy = ordenesHoy.length;

    // 2. Ventas Mes Actual
    const ordenesMes = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.fecha BETWEEN :inicio AND :fin', { inicio: inicioMes, fin: finMes })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .getMany();

    const montoMes = ordenesMes.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const cantidadMes = ordenesMes.length;
    const ticketPromedio = cantidadMes > 0 ? montoMes / cantidadMes : 0;

    // 3. Ventas Mes Anterior (para cálculo de % de crecimiento)
    const ordenesMesAnterior = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.fecha BETWEEN :inicio AND :fin', { inicio: inicioMesAnterior, fin: finMesAnterior })
      .andWhere('o.estado != :cancelado', { cancelado: 'CANCELADO' })
      .getMany();

    const montoMesAnterior = ordenesMesAnterior.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const crecimientoVentasMes =
      montoMesAnterior > 0 ? ((montoMes - montoMesAnterior) / montoMesAnterior) * 100 : montoMes > 0 ? 100 : 0;

    // 4. Tendencia de Ventas (últimos 30 días día a día)
    const ordenes30Dias = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.fecha >= :inicio', { inicio: inicio30Dias })
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
      .groupBy('o.estado')
      .getRawMany();

    const resumenEstados = estadosTotales.map((e) => ({
      estado: e.estado,
      cantidad: Number(e.cantidad || 0),
      total: Number(Number(e.total || 0).toFixed(2)),
    }));

    // 6. Totales Generales Históricos
    const totalOrdenesHistoricas = await this.orderRepository.count();
    const totalUsuariosRegistrados = await this.userRepository.count();
    const totalProductosActivos = await this.productRepository.count({ where: { activo: true } });

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
      .where('orden.estado != :cancelado', { cancelado: 'CANCELADO' })
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
      where: { id: In(productosIds) },
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
      .where('v.stock <= v.stock_minimo')
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
      .leftJoinAndSelect('orden.pago', 'pago');

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
    const totalUsuarios = await this.userRepository.count();
    const totalVerificados = await this.userRepository.count({ where: { emailVerificado: true } });
    const totalActivos = await this.userRepository.count({ where: { activo: true } });

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
        const total = await this.userRepository
          .createQueryBuilder('u')
          .where('u.creadoEn BETWEEN :inicio AND :fin', { inicio: m.fechaInicio, fin: m.fechaFin })
          .getCount();

        const verificados = await this.userRepository
          .createQueryBuilder('u')
          .where('u.creadoEn BETWEEN :inicio AND :fin', { inicio: m.fechaInicio, fin: m.fechaFin })
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
    const ultimosUsuarios = await this.userRepository.find({
      order: { creadoEn: 'DESC' },
      take: 10,
      relations: ['rol'],
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
      ultimosUsuarios: ultimosUsuarios.map((u) => ({
        id: u.id,
        nombre: `${u.nombre} ${u.apellido}`.trim(),
        correo: u.correo,
        rol: u.rol?.nombre || 'CLIENTE',
        emailVerificado: u.emailVerificado,
        activo: u.activo,
        creadoEn: u.creadoEn,
      })),
    };
  }
}
