import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { AddressEntity } from './entities/address.entity';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearDireccionDto } from './dto/crear-direccion.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repositorioUsuario: Repository<UserEntity>,
    @InjectRepository(AddressEntity)
    private readonly repositorioDireccion: Repository<AddressEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // GESTIÓN DE PERFIL DE USUARIO
  // ==========================================

  async obtenerPerfil(usuarioId: string): Promise<UserEntity> {
    const usuario = await this.repositorioUsuario.findOne({
      where: { id: usuarioId },
      relations: ['rol', 'direcciones'],
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${usuarioId} no encontrado.`);
    }

    // Por seguridad, no devolvemos la contraseña al frontend
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

  // ==========================================
  // GESTIÓN DE DIRECCIONES
  // ==========================================

  async obtenerDirecciones(usuarioId: string): Promise<AddressEntity[]> {
    // Verificamos que el usuario exista
    await this.obtenerPerfil(usuarioId);

    return await this.repositorioDireccion.find({
      where: { usuarioId },
      order: { predeterminada: 'DESC', creadoEn: 'DESC' }, // Las predeterminadas salen primero
    });
  }

  async agregarDireccion(usuarioId: string, datos: CrearDireccionDto): Promise<AddressEntity> {
    await this.obtenerPerfil(usuarioId); // Validar que existe

    // Iniciar una transacción para asegurar que los datos sean consistentes
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Si esta nueva dirección es predeterminada, debemos quitar el "predeterminada" a las demás
      if (datos.predeterminada) {
        await queryRunner.manager.update(
          AddressEntity,
          { usuarioId, predeterminada: true },
          { predeterminada: false }
        );
      } else {
        // Si no mandaron predeterminada, pero es su primera dirección, la hacemos predeterminada por defecto
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

  async eliminarDireccion(usuarioId: string, direccionId: string): Promise<void> {
    const direccion = await this.repositorioDireccion.findOne({
      where: { id: direccionId, usuarioId },
    });

    if (!direccion) {
      throw new NotFoundException('Dirección no encontrada o no pertenece a este usuario.');
    }

    await this.repositorioDireccion.remove(direccion);
  }
}
