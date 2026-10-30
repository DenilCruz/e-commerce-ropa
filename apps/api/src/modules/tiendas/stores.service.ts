import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
          }),
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
      tienda = await this.storeRepo.findOne({ where: { slug: 'aura' } });
    }

    if (!tienda) {
      throw new NotFoundException('Tienda no encontrada.');
    }

    const tieneQrPropio = Boolean(tienda.qrUrl && tienda.qrUrl.trim() !== '');

    if (tieneQrPropio) {
      return {
        tiendaId: tienda.id,
        nombre: tienda.nombre,
        slug: tienda.slug,
        modalidad: 'MODELO_B_DIRECTO',
        tituloModalidad: `Cobro Directo · ${tienda.nombre}`,
        qrUrl: tienda.qrUrl,
        titularCuenta: tienda.titularCuenta || tienda.nombre,
        banco: tienda.banco || 'Banca Móvil QR Simple',
        numeroCuenta: tienda.numeroCuenta || '',
        descripcion: `Cobro directo acreditado directamente a la cuenta bancaria de ${tienda.nombre}.`,
      };
    }

    return {
      tiendaId: tienda.id,
      nombre: tienda.nombre,
      slug: tienda.slug,
      modalidad: 'MODELO_A_CUSTODIA',
      tituloModalidad: 'AURA Pagos · Sistema Central en Custodia',
      qrUrl: '/qr_pago_aura.png',
      titularCuenta: 'AURA S.R.L. (Plataforma Oficial)',
      banco: 'Banco Nacional de Bolivia (BNB)',
      numeroCuenta: '1000004928371',
      descripcion: `Pago en custodia procesado por la plataforma central AURA. El saldo neto se acreditará al balance contable de ${tienda.nombre}.`,
    };
  }

  /**
   * Vista administrativa para el dueño de la tienda:
   * Muestra la configuración actual y el saldo acumulado en custodia (Modelo A).
   */
  async obtenerConfigPagoAdmin(tiendaId: string) {
    const tienda = await this.storeRepo.findOne({ where: { id: tiendaId } });
    if (!tienda) throw new NotFoundException('Tienda no encontrada.');

    // Calcular ventas acumuladas en custodia para esta tienda
    const stats = await this.dataSource.query(
      `SELECT COALESCE(SUM(p.monto), 0) AS total_recaudado, COUNT(p.id) AS total_ventas 
       FROM pago p 
       WHERE p.tenant_id = $1 AND p.estado = 'APROBADO'`,
      [tiendaId],
    );

    const saldo = parseFloat(stats[0]?.total_recaudado || '0');
    const totalVentas = parseInt(stats[0]?.total_ventas || '0', 10);
    const tieneQr = Boolean(tienda.qrUrl && tienda.qrUrl.trim() !== '');

    return {
      tienda: {
        id: tienda.id,
        nombre: tienda.nombre,
        slug: tienda.slug,
        plan: tienda.plan,
        qrUrl: tienda.qrUrl,
        titularCuenta: tienda.titularCuenta,
        banco: tienda.banco,
        numeroCuenta: tienda.numeroCuenta,
        modalidadPagoActiva: tieneQr ? 'MODELO_B_DIRECTO' : 'MODELO_A_CUSTODIA',
      },
      billeteraCustodia: {
        saldoAcumulado: saldo,
        totalVentas,
        estadoLiquidacion: saldo > 0 ? 'DISPONIBLE_PARA_RETIRO' : 'SIN_FONDOS_PENDIENTES',
        descripcion: tieneQr
          ? 'Tu tienda está operando en MODELO B (Cobro Directo): Los clientes te transfieren directamente a tu QR bancario personal.'
          : 'Tu tienda está operando en MODELO A (Custodia Central AURA): Los fondos se recaudan en la cuenta oficial de AURA y se acreditan a tu saldo contable hasta que configures tu QR.',
      },
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

