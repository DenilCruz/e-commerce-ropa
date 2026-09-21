import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException, 
  Logger 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReviewEntity } from './entities/review.entity';
import { CrearResenaDto } from './dto/crear-resena.dto';
import { ActualizarResenaDto } from './dto/actualizar-resena.dto';
import { EstadoCompraResenaDto } from './dto/verificar-compra.dto';

@Injectable()
export class ResenasService {
  private readonly logger = new Logger(ResenasService.name);

  constructor(
    @InjectRepository(ReviewEntity)
    private readonly repositorioResena: Repository<ReviewEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * HU-66: Verificar si el cliente compró el producto antes de permitir reseñar
   */
  async verificarCompraCliente(productoId: string, usuarioId: string): Promise<EstadoCompraResenaDto> {
    // 1. Verificar si ya existe una reseña escrita por el usuario para este producto
    const resenaExistente = await this.repositorioResena.findOne({
      where: { usuarioId, productoId },
      relations: ['usuario'],
    });

    // 2. Verificar compra en la base de datos (nota_venta vinculada con detalle_nota_venta)
    const ventas = await this.dataSource.query(
      `SELECT nv.id as notaventa_id
       FROM nota_venta nv
       INNER JOIN detalle_nota_venta dnv ON dnv.notaventa_id = nv.id
       WHERE nv.usuario_id = $1 
         AND dnv.producto_id = $2
         AND nv.estado NOT IN ('CANCELADO', 'RECHAZADO')
       LIMIT 1`,
      [usuarioId, productoId],
    );

    const comproProducto = Boolean(ventas && ventas.length > 0);
    const yaReseno = Boolean(resenaExistente);

    return {
      puedeCalificar: comproProducto && !yaReseno,
      comproProducto,
      yaReseno,
      resenaExistente: resenaExistente || undefined,
    };
  }

  /**
   * HU-66: Crear reseña y calificación solo si el cliente compró el producto
   */
  async crear(datos: CrearResenaDto): Promise<ReviewEntity> {
    // 1. Regla de Negocio: Verificar que no haya reseñado previamente
    const resenaPrevia = await this.repositorioResena.findOne({
      where: {
        usuarioId: datos.usuarioId,
        productoId: datos.productoId,
      },
    });

    if (resenaPrevia) {
      throw new BadRequestException('Ya has escrito una reseña para este producto. Puedes editarla si deseas modificar tu opinión.');
    }

    // 2. Regla de Negocio HU-66: Verificar compra obligatoria
    const ventas = await this.dataSource.query(
      `SELECT nv.id as notaventa_id
       FROM nota_venta nv
       INNER JOIN detalle_nota_venta dnv ON dnv.notaventa_id = nv.id
       WHERE nv.usuario_id = $1 
         AND dnv.producto_id = $2
         AND nv.estado NOT IN ('CANCELADO', 'RECHAZADO')
       LIMIT 1`,
      [datos.usuarioId, datos.productoId],
    );

    if (!ventas || ventas.length === 0) {
      throw new ForbiddenException('Solo los clientes que hayan comprado este producto pueden calificarlo y dejar una reseña.');
    }

    const notaventaId = ventas[0].notaventa_id;

    const nuevaResena = this.repositorioResena.create({
      ...datos,
      notaventaId,
      aprobada: true,
    });

    return await this.repositorioResena.save(nuevaResena);
  }

  /**
   * HU-66 (Herramienta de Simulación para Evaluación Académica):
   * Permite registrar una compra ficticia rápida de un producto para que el evaluador pueda probar la reseña sin pasar por pasarela de pago.
   */
  async simularCompraParaPruebas(productoId: string, usuarioId: string): Promise<{ exito: boolean; mensaje: string }> {
    const nroVenta = `TEST-${Date.now().toString().slice(-6)}`;

    // Crear nota de venta de prueba
    const ventaResult = await this.dataSource.query(
      `INSERT INTO nota_venta (nro, usuario_id, subtotal, total, estado)
       VALUES ($1, $2, 50.00, 50.00, 'COMPLETADO')
       RETURNING id`,
      [nroVenta, usuarioId],
    );

    const notaventaId = ventaResult[0].id;

    // Crear detalle vinculado al producto
    await this.dataSource.query(
      `INSERT INTO detalle_nota_venta (notaventa_id, producto_id, cantidad, precio, subtotal, nombre_producto)
       VALUES ($1, $2, 1, 50.00, 50.00, 'Prenda de prueba para reseña')`,
      [notaventaId, productoId],
    );

    return {
      exito: true,
      mensaje: `Compra de prueba registrada exitosamente (${nroVenta}). Ahora puedes dejar tu reseña.`,
    };
  }

  /**
   * HU-67: Ver reseñas de otros compradores aprobadas para un producto
   */
  async obtenerPorProducto(productoId: string): Promise<ReviewEntity[]> {
    return await this.repositorioResena.find({
      where: { productoId, aprobada: true },
      relations: ['usuario'],
      order: { creadoEn: 'DESC' },
    });
  }

  /**
   * HU-70: Obtener el promedio de estrellas y distribución de un producto
   */
  async obtenerResumenProducto(productoId: string): Promise<{
    promedio: number;
    total: number;
    distribucion: { [key: number]: number };
  }> {
    const resenas = await this.repositorioResena.find({
      where: { productoId, aprobada: true },
    });

    const total = resenas.length;
    const distribucion: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (total === 0) {
      return {
        promedio: 0,
        total: 0,
        distribucion,
      };
    }

    let suma = 0;
    for (const r of resenas) {
      suma += r.calificacion;
      const calif = Math.min(5, Math.max(1, Math.round(r.calificacion)));
      distribucion[calif] = (distribucion[calif] || 0) + 1;
    }

    const promedio = parseFloat((suma / total).toFixed(1));

    return {
      promedio,
      total,
      distribucion,
    };
  }

  /**
   * HU-68: Editar la propia reseña del cliente
   */
  async actualizar(id: string, datos: ActualizarResenaDto, usuarioId?: string): Promise<ReviewEntity> {
    const resena = await this.repositorioResena.findOne({ 
      where: { id },
      relations: ['usuario'],
    });

    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada.`);
    }

    // Regla de Negocio HU-68: Solo el autor puede editar su propia reseña
    if (usuarioId && resena.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para modificar una reseña que no es de tu autoría.');
    }

    if (datos.calificacion !== undefined) {
      resena.calificacion = datos.calificacion;
    }

    if (datos.comentario !== undefined) {
      resena.comentario = datos.comentario;
    }

    return await this.repositorioResena.save(resena);
  }

  /**
   * HU-68 & HU-69: Eliminar reseña (por el cliente autor o por el admin)
   */
  async eliminar(id: string, usuarioId?: string, esAdmin: boolean = false): Promise<void> {
    const resena = await this.repositorioResena.findOne({ where: { id } });
    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada.`);
    }

    // Si no es admin, validar que el usuarioId corresponda al autor
    if (!esAdmin && usuarioId && resena.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para eliminar esta reseña.');
    }

    await this.repositorioResena.remove(resena);
  }

  /**
   * HU-69: Listar todas las reseñas para moderación administrativa
   */
  async obtenerTodasAdmin(busqueda?: string, estado?: 'todas' | 'aprobadas' | 'ocultas'): Promise<any[]> {
    const qb = this.repositorioResena
      .createQueryBuilder('resena')
      .leftJoinAndSelect('resena.usuario', 'usuario')
      .leftJoinAndSelect('resena.producto', 'producto')
      .orderBy('resena.creado_en', 'DESC');

    if (estado === 'aprobadas') {
      qb.andWhere('resena.aprobada = true');
    } else if (estado === 'ocultas') {
      qb.andWhere('resena.aprobada = false');
    }

    if (busqueda && busqueda.trim() !== '') {
      const q = `%${busqueda.trim()}%`;
      qb.andWhere(
        '(producto.nombre ILIKE :q OR usuario.nombre ILIKE :q OR usuario.correo ILIKE :q OR resena.comentario ILIKE :q)',
        { q },
      );
    }

    return await qb.getMany();
  }

  /**
   * HU-69: Alternar estado de aprobación (ocultar spam u ofensas)
   */
  async toggleAprobada(id: string): Promise<ReviewEntity> {
    const resena = await this.repositorioResena.findOne({ where: { id } });
    if (!resena) {
      throw new NotFoundException(`Reseña con ID ${id} no encontrada.`);
    }

    resena.aprobada = !resena.aprobada;
    return await this.repositorioResena.save(resena);
  }

  /**
   * HU-69: Métricas para el panel de administración
   */
  async obtenerKpisAdmin(): Promise<{
    totalResenas: number;
    promedioGlobal: number;
    resenasOcultas: number;
  }> {
    const todas = await this.repositorioResena.find();
    const totalResenas = todas.length;
    let suma = 0;
    let resenasOcultas = 0;

    for (const r of todas) {
      suma += r.calificacion;
      if (!r.aprobada) resenasOcultas++;
    }

    const promedioGlobal = totalResenas > 0 ? parseFloat((suma / totalResenas).toFixed(1)) : 0;

    return {
      totalResenas,
      promedioGlobal,
      resenasOcultas,
    };
  }
}
