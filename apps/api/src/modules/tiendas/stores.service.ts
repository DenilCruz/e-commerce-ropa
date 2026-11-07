import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { StoreEntity } from './entities/store.entity';
import { UserStoreEntity } from './entities/user-store.entity';
import { UserEntity } from '../usuarios/entities/user.entity';
import { RoleEntity } from '../usuarios/entities/role.entity';
import { CategoriaEntity } from '../categorias/entities/category.entity';
import { CrearTiendaDto } from './dto/crear-tienda.dto';
import { ActualizarConfigPagoDto } from './dto/actualizar-config-pago.dto';
import { TenantContext } from '../../common/tenant/tenant-context';

export const PLAN_INICIAL = 'FREE_TRIAL';
const MAX_INTENTOS_SLUG = 3;

const MOVIMIENTOS_SIMULADOS = `
  SELECT id AS referencia, tipo, monto, creado_en,
         CASE WHEN tipo = 'RETIRO' THEN 'RETIRO' ELSE 'QR' END AS origen
  FROM movimiento_qr_simulado WHERE tenant_id = $1
  UNION ALL
  SELECT id, 'VENTA', monto, COALESCE(fecha_pago, creado_en), 'STRIPE_PRUEBA'
  FROM pago
  WHERE tenant_id = $1 AND estado = 'APROBADO'
    AND respuesta_pasarela->>'gateway' IN ('stripe', 'stripe_embedded_checkout')
    AND respuesta_pasarela->>'currency' = 'bob'
    AND (
      respuesta_pasarela->'livemode' = 'false'::jsonb
      OR (
        NOT (respuesta_pasarela ? 'livemode')
        AND starts_with(respuesta_pasarela->>'sessionId', 'cs_test_')
      )
    )
`;

/** Postgres unique violation on the store slug. */
export function esSlugDuplicado(error: any): boolean {
  return error?.code === '23505' && String(error?.constraint ?? error?.detail ?? '').includes('slug');
}

/** Turns a store name into a URL-safe slug: "Moda Luna!" -> "moda-luna". */
export function generarSlugBase(nombre: string): string {
  const slug = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  return slug || 'tienda';
}

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(UserStoreEntity)
    private readonly membershipRepo: Repository<UserStoreEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /** Every store the user belongs to, with their role in each one. */
  async listarMias(usuarioId: string) {
    const membresias = await this.membershipRepo.find({
      where: { usuarioId, activo: true },
      relations: ['tienda', 'rol'],
      order: { creadoEn: 'ASC' },
    });
    const activa = TenantContext.get();
    return membresias
      .filter((m) => m.tienda?.estado === 'ACTIVA')
      .map((m) => ({
        id: m.tienda.id,
        nombre: m.tienda.nombre,
        slug: m.tienda.slug,
        plan: m.tienda.plan,
        rol: m.rol?.nombre || 'CLIENTE',
        esActiva: m.tienda.id === activa,
      }));
  }

  /** Every active store. Used by the platform operator, who is not a member of each one. */
  async listarTodasActivas() {
    const tiendas = await this.storeRepo.find({ where: { estado: 'ACTIVA' }, order: { creadoEn: 'ASC' } });
    const activa = TenantContext.get();
    return tiendas.map((tienda) => ({
      id: tienda.id,
      nombre: tienda.nombre,
      slug: tienda.slug,
      plan: tienda.plan,
      rol: 'SUPERADMIN',
      esActiva: tienda.id === activa,
    }));
  }

  async obtenerActiva(tiendaId: string): Promise<StoreEntity> {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId, estado: 'ACTIVA' } });
    if (!tienda) throw new NotFoundException('Esa tienda no está disponible.');
    return tienda;
  }

  /** Membership check used before switching the active store. */
  async obtenerMembresia(usuarioId: string, tiendaId: string): Promise<UserStoreEntity> {
    const membresia = await this.membershipRepo.findOne({
      where: { usuarioId, tiendaId, activo: true },
      relations: ['tienda', 'rol'],
    });
    if (!membresia || membresia.tienda?.estado !== 'ACTIVA') {
      throw new NotFoundException('No perteneces a esa tienda o ya no está disponible.');
    }
    return membresia;
  }

  /**
   * Subscribes a new store: creates the tenant (always in the free trial: a paid plan is bought through the
   * plans checkout), makes the user its ADMIN and
   * provisions the workspace (default category). Everything happens in one transaction.
   */
  async crear(usuarioId: string, dto: CrearTiendaDto): Promise<StoreEntity> {
    const usuario = await this.userRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    if (!usuario.emailVerificado) {
      throw new ForbiddenException('Verifica tu correo electrónico antes de crear una tienda.');
    }

    const rolAdmin = await this.roleRepo.findOne({ where: { nombre: 'ADMIN' } });
    if (!rolAdmin) throw new BadRequestException('El rol ADMIN no existe en el sistema.');

    const nombre = dto.nombre.trim();
    // Two sign-ups with the same name can pick the same slug at once: the loser retries with the next one
    for (let intento = 1; intento <= MAX_INTENTOS_SLUG; intento++) {
      const slug = await this.slugDisponible(generarSlugBase(nombre));
      try {
        return await this.aprovisionar(usuarioId, rolAdmin.id, nombre, slug);
      } catch (error) {
        if (!esSlugDuplicado(error)) throw error;
      }
    }
    throw new ConflictException('No se pudo reservar un identificador para la tienda. Inténtalo de nuevo.');
  }

  /** Creates the tenant and its workspace in one transaction, under the new tenant's own context. */
  private async aprovisionar(
    usuarioId: string,
    rolAdminId: string,
    nombre: string,
    slug: string,
    plan: string = PLAN_INICIAL,
  ): Promise<StoreEntity> {
    // The new store is a different tenant than the request's one
    const tiendaId = (await this.dataSource.query('SELECT uuid_generate_v4() AS id'))[0].id as string;

    return TenantContext.runAs(tiendaId, usuarioId, async () => {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const tienda = await queryRunner.manager.save(
          queryRunner.manager.create(StoreEntity, {
            id: tiendaId,
            nombre,
            slug,
            plan,
            propietarioId: usuarioId,
            pruebaVenceEn: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          }),
        );
        await queryRunner.manager.query(
          `INSERT INTO sucursal (tenant_id, nombre, activa) VALUES ($1, 'Casa matriz', true)`,
          [tienda.id],
        );
        await queryRunner.manager.save(
          queryRunner.manager.create(UserStoreEntity, {
            usuarioId,
            tiendaId: tienda.id,
            rolId: rolAdminId,
          }),
        );
        await queryRunner.manager.save(
          queryRunner.manager.create(CategoriaEntity, {
            nombre: 'General',
            descripcion: 'Categoría inicial de la tienda',
            activa: true,
            orden: 0,
          }),
        );
        await queryRunner.commitTransaction();
        return tienda;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    });
  }

  private async slugDisponible(base: string): Promise<string> {
    let candidato = base;
    for (let n = 2; await this.storeRepo.exist({ where: { slug: candidato } }); n++) {
      candidato = `${base.slice(0, 46)}-${n}`;
    }
    return candidato;
  }

  /**
   * Consulta pública de pasarela para el Checkout del cliente.
   * Si la tienda subió su QR propio, opera en MODELO B (Cobro Directo).
   * Si no tiene QR propio, opera en MODELO A (Custodia Central AURA).
   */
  async obtenerConfigPagoPublica(slugOId?: string) {
    let tienda: StoreEntity | null = null;
    const isUuid = slugOId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOId);

    if (slugOId) {
      if (isUuid) {
        tienda = await this.storeRepo.findOne({ where: { id: slugOId, estado: 'ACTIVA' } });
      } else {
        tienda = await this.storeRepo.findOne({ where: { slug: slugOId.toLowerCase().trim(), estado: 'ACTIVA' } });
      }
    }

    if (!tienda) {
      const activeTenant = TenantContext.get();
      if (activeTenant) {
        tienda = await this.storeRepo.findOne({ where: { id: activeTenant, estado: 'ACTIVA' } });
      }
    }

    if (!tienda) {
      throw new NotFoundException('Tienda no encontrada.');
    }

    return {
      tiendaId: tienda.id,
      nombre: tienda.nombre,
      slug: tienda.slug,
      disponible: true,
      modalidad: 'QR_SIMULADO',
      descripcion: 'Código de demostración de AURA. No se transfiere dinero.',
    };
  }

  private async consultarSaldoSimulado(manager: EntityManager, tiendaId: string) {
    const [saldo] = await manager.query(
      `SELECT GREATEST(0, COALESCE(SUM(CASE WHEN tipo = 'VENTA' THEN monto ELSE -monto END), 0)) AS disponible,
              COUNT(*) FILTER (WHERE tipo = 'VENTA') AS ventas,
              COALESCE(SUM(monto) FILTER (WHERE origen = 'STRIPE_PRUEBA'), 0) AS stripe_prueba
       FROM (${MOVIMIENTOS_SIMULADOS}) movimientos`,
      [tiendaId],
    );
    return {
      saldoAcumulado: Number(saldo.disponible),
      totalVentas: Number(saldo.ventas),
      totalStripePrueba: Number(saldo.stripe_prueba),
    };
  }

  async simularRetiro(tiendaId: string, usuarioId: string, solicitudId: string) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`retiro-qr:${tiendaId}`]);
      const [previo] = await manager.query(
        `SELECT id AS referencia, monto FROM movimiento_qr_simulado
         WHERE tenant_id = $1 AND tipo = 'RETIRO' AND solicitud_id = $2 AND usuario_id = $3`,
        [tiendaId, solicitudId, usuarioId],
      );
      if (previo) return { referencia: previo.referencia, monto: Number(previo.monto) };

      const tienda = await manager.findOne(StoreEntity, { where: { id: tiendaId }, lock: { mode: 'pessimistic_write' } });
      if (!tienda) throw new NotFoundException('Tienda no encontrada.');
      if (!tienda.titularCuenta?.trim() || !tienda.banco?.trim() || !tienda.numeroCuenta?.trim()) {
        throw new BadRequestException('Guarda el titular, el banco y el número de cuenta antes de simular un retiro.');
      }

      const { saldoAcumulado } = await this.consultarSaldoSimulado(manager, tiendaId);
      if (saldoAcumulado <= 0) throw new BadRequestException('No tienes saldo simulado disponible.');

      const [retiro] = await manager.query(
        `INSERT INTO movimiento_qr_simulado (tenant_id, usuario_id, solicitud_id, tipo, monto)
         VALUES ($1, $2, $3, 'RETIRO', $4) RETURNING id AS referencia`,
        [tiendaId, usuarioId, solicitudId, saldoAcumulado],
      );
      return { referencia: retiro.referencia, monto: saldoAcumulado };
    });
  }

  /** Datos privados de liquidación y saldo de prueba de la tienda activa. */
  async obtenerConfigPagoAdmin(tiendaId: string) {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) throw new NotFoundException('Tienda no encontrada.');

    const [billeteraSimulada, movimientos] = await Promise.all([
      this.consultarSaldoSimulado(this.dataSource.manager, tiendaId),
      this.dataSource.query(
        `SELECT referencia, tipo, origen, monto, creado_en AS "creadoEn"
         FROM (${MOVIMIENTOS_SIMULADOS}) movimientos
         ORDER BY creado_en DESC, referencia DESC LIMIT 10`,
        [tiendaId],
      ),
    ]);
    return {
      tienda: {
        nombre: tienda.nombre,
        titularCuenta: tienda.titularCuenta,
        banco: tienda.banco,
        numeroCuenta: tienda.numeroCuenta,
      },
      billeteraSimulada,
      movimientos: movimientos.map((movimiento) => ({ ...movimiento, monto: Number(movimiento.monto) })),
    };
  }

  /**
   * Guarda o actualiza la configuración de pasarela del dueño de la tienda.
   */
  async actualizarConfigPagoAdmin(tiendaId: string, dto: ActualizarConfigPagoDto) {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) throw new NotFoundException('Tienda no encontrada.');

    if (dto.qrUrl !== undefined) tienda.qrUrl = dto.qrUrl;
    if (dto.titularCuenta !== undefined) tienda.titularCuenta = dto.titularCuenta;
    if (dto.banco !== undefined) tienda.banco = dto.banco;
    if (dto.numeroCuenta !== undefined) tienda.numeroCuenta = dto.numeroCuenta;

    tienda.modalidadPagoActiva = (tienda.qrUrl && tienda.qrUrl.trim() !== '')
      ? 'MODELO_B_DIRECTO'
      : 'MODELO_A_CUSTODIA';

    await this.storeRepo.save(tienda);
    return this.obtenerConfigPagoAdmin(tiendaId);
  }
}

