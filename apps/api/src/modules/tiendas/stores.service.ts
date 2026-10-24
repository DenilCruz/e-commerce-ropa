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
   * Subscribes a new store: creates the tenant, makes the user its ADMIN and
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
  private async aprovisionar(usuarioId: string, rolAdminId: string, nombre: string, slug: string): Promise<StoreEntity> {
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
            plan: PLAN_INICIAL,
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
}
