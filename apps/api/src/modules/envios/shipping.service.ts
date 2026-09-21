import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShippingEntity } from './entities/shipping.entity';
import { ShippingMethodEntity } from './entities/shipping-method.entity';
import { OrderEntity } from '../pedidos/entities/order.entity';
import { OrderHistoryEntity } from '../pedidos/entities/order-history.entity';
import { CrearMetodoEnvioDto } from './dto/crear-metodo-envio.dto';
import { ActualizarMetodoEnvioDto } from './dto/actualizar-metodo-envio.dto';
import { CotizarEnvioDto } from './dto/cotizar-envio.dto';
import { ActualizarEstadoEnvioDto } from './dto/actualizar-estado-envio.dto';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    @InjectRepository(ShippingEntity)
    private readonly shippingRepo: Repository<ShippingEntity>,
    @InjectRepository(ShippingMethodEntity)
    private readonly shippingMethodRepo: Repository<ShippingMethodEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderHistoryEntity)
    private readonly orderHistoryRepo: Repository<OrderHistoryEntity>,
  ) {}

  // =========================================================================
  // HU-61: MÉTODOS DE ENVÍO (CRUD ADMIN / LISTAR PÚBLICO)
  // =========================================================================
  async listarMetodos(soloActivos: boolean = true) {
    const where = soloActivos ? { activo: true } : {};
    const metodos = await this.shippingMethodRepo.find({
      where,
      order: { costo: 'ASC' },
    });

    return metodos.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      descripcion: m.descripcion,
      costo: Number(m.costo),
      tiempoEstimado: m.tiempoEstimado,
      activo: m.activo,
      creadoEn: m.creadoEn,
    }));
  }

  async obtenerMetodo(id: string) {
    const metodo = await this.shippingMethodRepo.findOne({ where: { id } });
    if (!metodo) {
      throw new NotFoundException(`El método de envío con ID ${id} no existe.`);
    }
    return {
      ...metodo,
      costo: Number(metodo.costo),
    };
  }

  async crearMetodo(dto: CrearMetodoEnvioDto) {
    const nuevo = this.shippingMethodRepo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      costo: dto.costo,
      tiempoEstimado: dto.tiempoEstimado || '2 a 3 días hábiles',
      activo: dto.activo ?? true,
    });
    const guardado = await this.shippingMethodRepo.save(nuevo);
    return {
      ...guardado,
      costo: Number(guardado.costo),
    };
  }

  async actualizarMetodo(id: string, dto: ActualizarMetodoEnvioDto) {
    const metodo = await this.shippingMethodRepo.findOne({ where: { id } });
    if (!metodo) {
      throw new NotFoundException(`Método de envío ${id} no encontrado.`);
    }

    if (dto.nombre !== undefined) metodo.nombre = dto.nombre;
    if (dto.descripcion !== undefined) metodo.descripcion = dto.descripcion;
    if (dto.costo !== undefined) metodo.costo = dto.costo;
    if (dto.tiempoEstimado !== undefined) metodo.tiempoEstimado = dto.tiempoEstimado;
    if (dto.activo !== undefined) metodo.activo = dto.activo;

    const guardado = await this.shippingMethodRepo.save(metodo);
    return {
      ...guardado,
      costo: Number(guardado.costo),
    };
  }

  async eliminarMetodo(id: string) {
    const metodo = await this.shippingMethodRepo.findOne({ where: { id } });
    if (!metodo) {
      throw new NotFoundException(`Método de envío ${id} no encontrado.`);
    }
    // Desactivar suavemente para no romper órdenes históricas
    metodo.activo = false;
    await this.shippingMethodRepo.save(metodo);
    return { message: `Método de envío ${metodo.nombre} desactivado con éxito.` };
  }

  // =========================================================================
  // HU-62 & HU-63: COTIZAR ENVÍO Y ELEGIR ESTÁNDAR O EXPRESS
  // =========================================================================
  async cotizar(dto: CotizarEnvioDto) {
    const subtotal = Number(dto.subtotal || 0);
    const metodos = await this.shippingMethodRepo.find({
      where: { activo: true },
      order: { costo: 'ASC' },
    });

    const UMBRAL_ENVIO_GRATIS = 200;
    const calificaEnvioGratis = subtotal >= UMBRAL_ENVIO_GRATIS;
    const montoFaltanteParaGratis = Math.max(0, UMBRAL_ENVIO_GRATIS - subtotal);

    const opciones = metodos.map((m) => {
      const esEstandar = m.nombre.toLowerCase().includes('estándar') || m.nombre.toLowerCase().includes('estandar');
      const costoOriginal = Number(m.costo);
      const costoFinal = esEstandar && calificaEnvioGratis ? 0 : costoOriginal;

      return {
        id: m.id,
        nombre: m.nombre,
        descripcion: m.descripcion,
        tiempoEstimado: m.tiempoEstimado,
        costoOriginal,
        costoFinal,
        esGratis: costoFinal === 0,
        esEstandar,
        esExpress: m.nombre.toLowerCase().includes('express'),
      };
    });

    // Si se solicitó un método específico
    let metodoSeleccionado = opciones[0] || null;
    if (dto.metodoEnvioId) {
      const encontrado = opciones.find((op) => op.id === dto.metodoEnvioId);
      if (encontrado) metodoSeleccionado = encontrado;
    }

    return {
      subtotal,
      umbralEnvioGratis: UMBRAL_ENVIO_GRATIS,
      calificaEnvioGratis,
      montoFaltanteParaGratis,
      metodoSeleccionado,
      opciones,
      departamento: dto.departamento || 'Santa Cruz',
      ciudad: dto.ciudad || 'Santa Cruz de la Sierra',
    };
  }

  // =========================================================================
  // HU-64: RASTREAR ENVÍO CON CÓDIGO DE SEGUIMIENTO Y MAPA LEAFLET
  // =========================================================================
  async consultarTracking(codigo: string) {
    const termino = codigo?.trim().toUpperCase();
    if (!termino) {
      throw new BadRequestException('Debes proporcionar un código de seguimiento o número de orden.');
    }

    const envio = await this.shippingRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.metodoEnvio', 'me')
      .leftJoinAndSelect('e.direccion', 'd')
      .leftJoinAndSelect('e.notaventa', 'o')
      .leftJoinAndSelect('o.usuario', 'u')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.producto', 'p')
      .where('UPPER(e.numeroTracking) = :termino', { termino })
      .orWhere('UPPER(o.nro) = :termino', { termino })
      .orWhere('e.id::text = :terminoOriginal', { terminoOriginal: codigo.trim() })
      .getOne();

    if (!envio) {
      throw new NotFoundException(
        `No se encontró información de envío para el código "${codigo}". Verifica tu número de guía o pedido.`,
      );
    }

    // Calcular estado y progreso del timeline
    const estados = ['PREPARANDO', 'EN_CAMINO', 'EN_REPARTO', 'ENTREGADO'];
    const estadoActual = (envio.estado || 'PREPARANDO').toUpperCase();
    const indiceActual = estados.indexOf(estadoActual);

    const timeline = [
      {
        paso: 1,
        codigo: 'PREPARANDO',
        titulo: 'Preparando Pedido',
        descripcion: 'El paquete se está empaquetando e inspeccionando en nuestro almacén central.',
        completado: indiceActual >= 0,
        actual: estadoActual === 'PREPARANDO',
        fecha: envio.creadoEn,
        icono: 'package',
      },
      {
        paso: 2,
        codigo: 'EN_CAMINO',
        titulo: 'En Tránsito',
        descripcion: 'El paquete fue despachado y viaja con el courier hacia la central regional.',
        completado: indiceActual >= 1,
        actual: estadoActual === 'EN_CAMINO',
        fecha: envio.fechaEnvio || (indiceActual >= 1 ? envio.creadoEn : null),
        icono: 'truck',
      },
      {
        paso: 3,
        codigo: 'EN_REPARTO',
        titulo: 'En Reparto a Domicilio',
        descripcion: 'El repartidor asignado tiene tu paquete y está realizando la entrega hoy.',
        completado: indiceActual >= 2,
        actual: estadoActual === 'EN_REPARTO',
        fecha: indiceActual >= 2 ? (envio.fechaEntregaEstimada || new Date()) : null,
        icono: 'navigation',
      },
      {
        paso: 4,
        codigo: 'ENTREGADO',
        titulo: 'Entregado con Éxito',
        descripcion: 'El paquete fue entregado en la dirección indicada y recibido satisfactoriamente.',
        completado: indiceActual >= 3,
        actual: estadoActual === 'ENTREGADO',
        fecha: envio.fechaEntregaReal || (indiceActual >= 3 ? new Date() : null),
        icono: 'check-circle',
      },
    ];

    // Puntos geográficos para Leaflet / OpenStreetMap (Santa Cruz, Bolivia)
    const destLat = envio.latitud ? Number(envio.latitud) : -17.7610;
    const destLng = envio.longitud ? Number(envio.longitud) : -63.1530;

    const puntosRuta = [
      {
        nombre: 'Centro Logístico Principal El Magnífico',
        lat: -17.7833,
        lng: -63.1821,
        descripcion: 'Almacén Central - Parque Industrial, Santa Cruz',
      },
      {
        nombre: 'Hub de Distribución Intermedia',
        lat: Number(((-17.7833 + destLat) / 2).toFixed(4)),
        lng: Number(((-63.1821 + destLng) / 2).toFixed(4)),
        descripcion: 'Punto de clasificación y despacho de ruta',
      },
      {
        nombre: 'Destino / Dirección de Entrega',
        lat: destLat,
        lng: destLng,
        descripcion: envio.direccionTexto || 'Dirección de entrega del cliente',
      },
    ];

    let posicionRepartidor = puntosRuta[0];
    if (estadoActual === 'EN_CAMINO') posicionRepartidor = puntosRuta[1];
    if (estadoActual === 'EN_REPARTO') {
      posicionRepartidor = {
        nombre: 'Unidad Móvil de Entrega',
        lat: Number(((puntosRuta[1].lat + destLat) / 2).toFixed(4)),
        lng: Number(((puntosRuta[1].lng + destLng) / 2).toFixed(4)),
        descripcion: 'Vehículo en movimiento dirigiéndose al domicilio',
      };
    }
    if (estadoActual === 'ENTREGADO') posicionRepartidor = puntosRuta[2];

    return {
      id: envio.id,
      numeroTracking: envio.numeroTracking,
      estado: envio.estado,
      empresaTransportadora: envio.empresaTransportadora || 'Courier Local Asociado',
      direccionEntrega: envio.direccionTexto || envio.direccion?.calle || 'Dirección registrada en el pedido',
      metodoEnvio: envio.metodoEnvio?.nombre || 'Envío Estándar',
      fechas: {
        creadoEn: envio.creadoEn,
        fechaEnvio: envio.fechaEnvio,
        fechaEntregaEstimada:
          envio.fechaEntregaEstimada ||
          new Date(new Date(envio.creadoEn).getTime() + 48 * 60 * 60 * 1000),
        fechaEntregaReal: envio.fechaEntregaReal,
      },
      timeline,
      orden: {
        id: envio.notaventa?.id,
        nro: envio.notaventa?.nro,
        total: Number(envio.notaventa?.total || 0),
        estado: envio.notaventa?.estado,
        cliente: envio.notaventa?.usuario
          ? `${envio.notaventa.usuario.nombre} ${envio.notaventa.usuario.apellido}`
          : 'Cliente',
        items: (envio.notaventa?.items || []).map((item) => ({
          id: item.id,
          nombre: item.nombreProducto,
          talla: item.talla,
          color: item.color,
          cantidad: item.cantidad,
          subtotal: Number(item.subtotal),
        })),
      },
      mapa: {
        origen: puntosRuta[0],
        destino: puntosRuta[2],
        puntosRuta,
        posicionRepartidor,
      },
    };
  }

  // =========================================================================
  // HU-65: ACTUALIZAR ESTADO DEL ENVÍO (ADMIN)
  // =========================================================================
  async actualizarEstadoEnvio(
    envioId: string,
    dto: ActualizarEstadoEnvioDto,
    adminId?: string,
  ) {
    const envio = await this.shippingRepo.findOne({
      where: { id: envioId },
      relations: ['notaventa'],
    });

    if (!envio) {
      throw new NotFoundException(`Envío con ID ${envioId} no encontrado.`);
    }

    const estadoAnterior = envio.estado;
    const nuevoEstado = dto.estadoEnvio.toUpperCase();
    envio.estado = nuevoEstado;

    if (dto.transportadora) {
      envio.empresaTransportadora = dto.transportadora;
    }
    if (dto.numeroGuia) {
      envio.numeroTracking = dto.numeroGuia;
    }

    const ahora = new Date();
    if (nuevoEstado === 'EN_CAMINO' && !envio.fechaEnvio) {
      envio.fechaEnvio = ahora;
    }
    if (nuevoEstado === 'ENTREGADO') {
      envio.fechaEntregaReal = ahora;
    }

    await this.shippingRepo.save(envio);

    // Sincronizar con nota_venta si corresponde (HU-54 y HU-55)
    if (envio.notaventa) {
      const orden = envio.notaventa;
      const ordenEstadoAnterior = orden.estado;

      if (nuevoEstado === 'EN_CAMINO' && orden.estado !== 'ENVIADO') {
        orden.estado = 'ENVIADO';
        await this.orderRepo.save(orden);

        // Registrar en historial_venta
        await this.orderHistoryRepo.save(
          this.orderHistoryRepo.create({
            notaventaId: orden.id,
            estadoAnterior: ordenEstadoAnterior,
            estadoNuevo: 'ENVIADO',
            comentario: dto.notas || `Paquete despachado vía ${envio.empresaTransportadora || 'Courier'}. Guía: ${envio.numeroTracking}`,
            usuarioId: adminId || null,
          }),
        );
      } else if (nuevoEstado === 'ENTREGADO' && orden.estado !== 'ENTREGADO') {
        orden.estado = 'ENTREGADO';
        await this.orderRepo.save(orden);

        await this.orderHistoryRepo.save(
          this.orderHistoryRepo.create({
            notaventaId: orden.id,
            estadoAnterior: ordenEstadoAnterior,
            estadoNuevo: 'ENTREGADO',
            comentario: dto.notas || 'Paquete entregado satisfactoriamente al cliente.',
            usuarioId: adminId || null,
          }),
        );
      } else if (dto.notas) {
        await this.orderHistoryRepo.save(
          this.orderHistoryRepo.create({
            notaventaId: orden.id,
            estadoAnterior,
            estadoNuevo: nuevoEstado,
            comentario: dto.notas,
            usuarioId: adminId || null,
          }),
        );
      }
    }

    return this.consultarTracking(envio.numeroTracking);
  }

  // =========================================================================
  // LISTAR TODOS LOS ENVÍOS (ADMIN)
  // =========================================================================
  async obtenerTodosAdmin(filtros?: {
    estado?: string;
    busqueda?: string;
  }) {
    const qb = this.shippingRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.metodoEnvio', 'me')
      .leftJoinAndSelect('e.notaventa', 'o')
      .leftJoinAndSelect('o.usuario', 'u')
      .orderBy('e.creadoEn', 'DESC');

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      qb.andWhere('e.estado = :estado', { estado: filtros.estado.toUpperCase() });
    }

    if (filtros?.busqueda) {
      qb.andWhere(
        '(e.numeroTracking ILIKE :b OR o.nro ILIKE :b OR u.nombre ILIKE :b OR u.apellido ILIKE :b OR e.empresaTransportadora ILIKE :b)',
        { b: `%${filtros.busqueda}%` },
      );
    }

    const envios = await qb.getMany();
    return envios.map((e) => ({
      id: e.id,
      numeroTracking: e.numeroTracking,
      estado: e.estado,
      empresaTransportadora: e.empresaTransportadora || 'Sin asignar',
      direccionTexto: e.direccionTexto,
      fechaEnvio: e.fechaEnvio,
      fechaEntregaEstimada: e.fechaEntregaEstimada,
      fechaEntregaReal: e.fechaEntregaReal,
      creadoEn: e.creadoEn,
      metodoEnvio: e.metodoEnvio?.nombre,
      orden: e.notaventa
        ? {
            id: e.notaventa.id,
            nro: e.notaventa.nro,
            total: Number(e.notaventa.total),
            cliente: e.notaventa.usuario
              ? `${e.notaventa.usuario.nombre} ${e.notaventa.usuario.apellido}`
              : 'Cliente',
            correo: e.notaventa.usuario?.correo,
          }
        : null,
    }));
  }

  // =========================================================================
  // HELPER PARA CREAR ENVÍO AL CONFIRMAR ORDEN
  // =========================================================================
  async crearEnvioParaOrden(
    notaventaId: string,
    datos: {
      metodoEnvioId?: string;
      direccionTexto?: string;
      direccionId?: string;
      empresaTransportadora?: string;
    },
  ) {
    let metodoId = datos.metodoEnvioId;
    if (!metodoId) {
      const defaultMetodo = await this.shippingMethodRepo.findOne({
        where: { activo: true },
        order: { costo: 'ASC' },
      });
      metodoId = defaultMetodo?.id || 'e1000000-0000-0000-0000-000000000001';
    }

    const anio = new Date().getFullYear();
    const aleatorio = Math.random().toString(36).substring(2, 7).toUpperCase();
    const tracking = `TRK-BO-${anio}-${aleatorio}`;

    const fechaEstimada = new Date();
    fechaEstimada.setDate(fechaEstimada.getDate() + 2);

    const nuevoEnvio = this.shippingRepo.create({
      notaventaId,
      metodoEnvioId: metodoId,
      direccionId: datos.direccionId || null,
      direccionTexto: datos.direccionTexto || 'Dirección acordada con el cliente',
      empresaTransportadora: datos.empresaTransportadora || 'Courier Local Express',
      numeroTracking: tracking,
      estado: 'PREPARANDO',
      fechaEntregaEstimada: fechaEstimada,
    });

    return this.shippingRepo.save(nuevoEnvio);
  }
}
