import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { AddressEntity } from './entities/address.entity';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearDireccionDto } from './dto/crear-direccion.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repositorioUsuario: Repository<UserEntity>,
    @InjectRepository(AddressEntity)
    private readonly repositorioDireccion: Repository<AddressEntity>,
    @InjectRepository(RoleEntity)
    private readonly repositorioRol: Repository<RoleEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // GESTIÓN DE PERFIL DE USUARIO (HU-09, HU-10, HU-11)
  // ==========================================

  async obtenerPerfil(usuarioId: string): Promise<UserEntity> {
    const usuario = await this.repositorioUsuario.findOne({
      where: { id: usuarioId },
      relations: ['rol', 'direcciones'],
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }

    delete usuario.contrasena;
    return usuario;
  }

  async actualizarPerfil(usuarioId: string, datos: ActualizarUsuarioDto): Promise<UserEntity> {
    const usuario = await this.repositorioUsuario.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }

    Object.assign(usuario, datos);
    await this.repositorioUsuario.save(usuario);
    
    return this.obtenerPerfil(usuarioId);
  }

  async cambiarContrasena(usuarioId: string, dto: CambiarContrasenaDto): Promise<{ message: string }> {
    const usuario = await this.repositorioUsuario.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException(`Usuario no encontrado.`);
    }

    const esValida = await bcrypt.compare(dto.contrasenaActual, usuario.contrasena);
    if (!esValida) {
      throw new BadRequestException('La contraseña actual ingresada es incorrecta.');
    }

    const salt = await bcrypt.genSalt(10);
    usuario.contrasena = await bcrypt.hash(dto.nuevaContrasena, salt);
    await this.repositorioUsuario.save(usuario);

    return { message: 'Contraseña actualizada exitosamente.' };
  }

  // ==========================================
  // GESTIÓN DE DIRECCIONES (HU-12, HU-13, HU-14)
  // ==========================================

  async obtenerDirecciones(usuarioId: string): Promise<AddressEntity[]> {
    await this.obtenerPerfil(usuarioId);

    return await this.repositorioDireccion.find({
      where: { usuarioId },
      order: { predeterminada: 'DESC', creadoEn: 'DESC' },
    });
  }

  async agregarDireccion(usuarioId: string, datos: CrearDireccionDto): Promise<AddressEntity> {
    await this.obtenerPerfil(usuarioId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (datos.predeterminada) {
        await queryRunner.manager.update(
          AddressEntity,
          { usuarioId, predeterminada: true },
          { predeterminada: false }
        );
      } else {
        const cantidadDirecciones = await queryRunner.manager.count(AddressEntity, { where: { usuarioId } });
        if (cantidadDirecciones === 0) {
          datos.predeterminada = true;
        }
      }

      const nuevaDireccion = queryRunner.manager.create(AddressEntity, {
        ...datos,
        usuarioId,
      });

      const direccionGuardada = await queryRunner.manager.save(nuevaDireccion);
      
      await queryRunner.commitTransaction();
      return direccionGuardada;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error al guardar la dirección.');
    } finally {
      await queryRunner.release();
    }
  }

  async marcarPredeterminada(usuarioId: string, direccionId: string): Promise<AddressEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existe = await queryRunner.manager.findOne(AddressEntity, {
        where: { id: direccionId, usuarioId }
      });
      if (!existe) {
        throw new NotFoundException('Dirección no encontrada');
      }

      // 1. Desmarcar todas del usuario
      await queryRunner.manager.update(
        AddressEntity,
        { usuarioId },
        { predeterminada: false }
      );

      // 2. Marcar la deseada
      await queryRunner.manager.update(
        AddressEntity,
        { id: direccionId, usuarioId },
        { predeterminada: true }
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof NotFoundException ? error : new BadRequestException('Error al actualizar dirección predeterminada');
    } finally {
      await queryRunner.release();
    }

    return this.obtenerDirecciones(usuarioId);
  }

  async eliminarDireccion(usuarioId: string, direccionId: string): Promise<void> {
    const direccion = await this.repositorioDireccion.findOne({
      where: { id: direccionId, usuarioId },
    });

    if (!direccion) {
      throw new NotFoundException('Dirección no encontrada o no pertenece a este usuario.');
    }

    await this.repositorioDireccion.remove(direccion);
  }

  // ==========================================
  // PANEL ADMINISTRATIVO (HU-15, HU-16, HU-17)
  // ==========================================

  async listarUsuarios(pagina = 1, limite = 10, busqueda = ''): Promise<{
    usuarios: UserEntity[];
    total: number;
    pagina: number;
    totalPaginas: number;
  }> {
    const qb = this.repositorioUsuario
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .orderBy('usuario.creadoEn', 'DESC');

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim().toLowerCase()}%`;
      qb.where(
        'LOWER(usuario.nombre) LIKE :term OR LOWER(usuario.apellido) LIKE :term OR LOWER(usuario.correo) LIKE :term',
        { term }
      );
    }

    const skip = (pagina - 1) * limite;
    qb.skip(skip).take(limite);

    const [usuarios, total] = await qb.getManyAndCount();

    // Eliminar contraseñas del resultado
    usuarios.forEach(u => delete u.contrasena);

    return {
      usuarios,
      total,
      pagina: Number(pagina),
      totalPaginas: Math.ceil(total / limite),
    };
  }

  async toggleBloqueo(usuarioId: string): Promise<UserEntity> {
    const usuario = await this.repositorioUsuario.findOne({
      where: { id: usuarioId },
      relations: ['rol'],
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }

    usuario.activo = !usuario.activo;
    await this.repositorioUsuario.save(usuario);

    delete usuario.contrasena;
    return usuario;
  }

  async cambiarRol(usuarioId: string, nuevoRol: string): Promise<UserEntity> {
    const usuario = await this.repositorioUsuario.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }

    // Buscar rol por nombre (ej: ADMIN, CLIENTE) o por ID
    const rol = await this.repositorioRol.findOne({
      where: [{ id: nuevoRol }, { nombre: nuevoRol.toUpperCase() }],
    });

    if (!rol) {
      throw new BadRequestException(`El rol '${nuevoRol}' no existe en el sistema.`);
    }

    usuario.rolId = rol.id;
    await this.repositorioUsuario.save(usuario);

    return this.obtenerPerfil(usuarioId);
  }

  async obtenerRoles(): Promise<RoleEntity[]> {
    return await this.repositorioRol.find();
  }
}
