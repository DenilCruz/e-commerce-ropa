import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { UserEntity } from '../usuarios/entities/user.entity';
import { RoleEntity } from '../usuarios/entities/role.entity';
import { TokenEntity, TipoToken } from './entities/token.entity';
import { MailService } from '../mail/mail.service';

import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { RecuperarPasswordDto } from './dto/recuperar-password.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerificarEmailDto } from './dto/verificar-email.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(TokenEntity)
    private readonly tokenRepo: Repository<TokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // HU-01: REGISTRO DE VISITANTE
  // =========================================================================
  async registro(dto: RegistroDto) {
    const correoNormalizado = dto.correo.toLowerCase().trim();

    // 1. Validar que no exista un usuario con ese correo
    const existe = await this.userRepo.findOne({ where: { correo: correoNormalizado } });
    if (existe) {
      throw new BadRequestException('El correo electrónico ya se encuentra registrado.');
    }

    // 2. Buscar o asignar rol por defecto 'CLIENTE'
    let rolCliente = await this.roleRepo.findOne({ where: { nombre: 'CLIENTE' } });
    if (!rolCliente) {
      // Si no existe rol CLIENTE, buscar cualquiera o crearlo
      const primerRol = await this.roleRepo.findOne({ where: {} });
      if (primerRol) {
        rolCliente = primerRol;
      } else {
        rolCliente = await this.roleRepo.save(
          this.roleRepo.create({
            nombre: 'CLIENTE',
            descripcion: 'Rol de cliente para compras y gestión de perfil',
          }),
        );
      }
    }

    // 3. Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const contrasenaHash = await bcrypt.hash(dto.contrasena, salt);

    // 4. Iniciar transacción para crear usuario, cliente y token
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoUsuario = queryRunner.manager.create(UserEntity, {
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        correo: correoNormalizado,
        contrasena: contrasenaHash,
        celular: dto.celular || null,
        ci: dto.ci || null,
        rolId: rolCliente.id,
        emailVerificado: false,
        activo: true,
      });

      const usuarioGuardado = await queryRunner.manager.save(nuevoUsuario);

      // Crear registro en tabla cliente si aplica
      await queryRunner.manager.query(
        `INSERT INTO cliente (usuario_id) VALUES ($1) ON CONFLICT (usuario_id) DO NOTHING`,
        [usuarioGuardado.id],
      );

      // 5. Generar token de verificación de email (válido por 24 horas)
      const tokenValor = crypto.randomUUID();
      const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const tokenVerificacion = queryRunner.manager.create(TokenEntity, {
        usuarioId: usuarioGuardado.id,
        tipo: TipoToken.VERIFICACION_EMAIL,
        valor: tokenValor,
        expiraEn,
        usado: false,
      });

      await queryRunner.manager.save(tokenVerificacion);
      await queryRunner.commitTransaction();

      // 6. Enviar correo de bienvenida y verificación con Mailtrap (HU-84 y HU-87)
      this.mailService
        .enviarEmailVerificacion(usuarioGuardado.correo, usuarioGuardado.nombre, tokenValor)
        .catch((err) => this.logger.error('Error enviando email de verificación:', err));

      this.mailService
        .enviarEmailBienvenida({ correo: usuarioGuardado.correo, nombre: usuarioGuardado.nombre })
        .catch((err) => this.logger.error('Error enviando email de bienvenida:', err));

      return {
        message: 'Usuario registrado exitosamente. Se ha enviado un correo con el enlace de verificación.',
        usuario: {
          id: usuarioGuardado.id,
          nombre: usuarioGuardado.nombre,
          apellido: usuarioGuardado.apellido,
          correo: usuarioGuardado.correo,
          rol: rolCliente.nombre,
          emailVerificado: usuarioGuardado.emailVerificado,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error en el registro de usuario:', error);
      throw new BadRequestException('No se pudo completar el registro: ' + (error?.message || 'Error del servidor'));
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // HU-02: INICIO DE SESIÓN
  // =========================================================================
  async login(dto: LoginDto) {
    const correoNormalizado = dto.correo.toLowerCase().trim();

    const usuario = await this.userRepo.findOne({
      where: { correo: correoNormalizado },
      relations: ['rol'],
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales de acceso incorrectas.');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Tu cuenta se encuentra inactiva o bloqueada. Contacta al soporte.');
    }

    const contrasenaValida = await bcrypt.compare(dto.contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      throw new UnauthorizedException('Credenciales de acceso incorrectas.');
    }

    // Actualizar último login
    usuario.ultimoLogin = new Date();
    await this.userRepo.save(usuario);

    // Generar Access Token y Refresh Token
    const tokens = await this.generarTokens(usuario);

    return {
      message: 'Inicio de sesión exitoso.',
      ...tokens,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol?.nombre || 'CLIENTE',
        emailVerificado: usuario.emailVerificado,
      },
    };
  }

  // =========================================================================
  // HU-03: CIERRE DE SESIÓN
  // =========================================================================
  async logout(usuarioId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.tokenRepo.update(
        { valor: refreshToken, tipo: TipoToken.REFRESH },
        { usado: true },
      );
    } else if (usuarioId) {
      // Invalida todos los refresh tokens activos del usuario
      await this.tokenRepo.update(
        { usuarioId, tipo: TipoToken.REFRESH, usado: false },
        { usado: true },
      );
    }

    return { message: 'Sesión cerrada exitosamente.' };
  }

  // =========================================================================
  // HU-04: RECUPERAR CONTRASEÑA POR EMAIL
  // =========================================================================
  async recuperarPassword(dto: RecuperarPasswordDto) {
    const correoNormalizado = dto.correo.toLowerCase().trim();
    const usuario = await this.userRepo.findOne({ where: { correo: correoNormalizado } });

    // Mensaje estándar de seguridad (no revela si el correo existe o no)
    const respuestaEstandar = {
      message: 'Si el correo electrónico está registrado, recibirás un enlace de recuperación en los próximos minutos.',
    };

    if (!usuario || !usuario.activo) {
      return respuestaEstandar;
    }

    // Invalidar tokens previos de recuperación para este usuario
    await this.tokenRepo.update(
      { usuarioId: usuario.id, tipo: TipoToken.RECUPERAR_PASSWORD, usado: false },
      { usado: true },
    );

    // Crear token con validez de 1 hora
    const tokenValor = crypto.randomUUID();
    const expiraEn = new Date(Date.now() + 60 * 60 * 1000);

    const tokenRecuperacion = this.tokenRepo.create({
      usuarioId: usuario.id,
      tipo: TipoToken.RECUPERAR_PASSWORD,
      valor: tokenValor,
      expiraEn,
      usado: false,
    });

    await this.tokenRepo.save(tokenRecuperacion);

    // Enviar correo con Mailtrap
    this.mailService
      .enviarEmailRecuperacion(usuario.correo, usuario.nombre, tokenValor)
      .catch((err) => this.logger.error('Error enviando email de recuperación:', err));

    return respuestaEstandar;
  }

  // =========================================================================
  // HU-05: RESTABLECER CONTRASEÑA CON TOKEN SEGURO
  // =========================================================================
  async restablecerPassword(dto: RestablecerPasswordDto) {
    const tokenRecord = await this.tokenRepo.findOne({
      where: {
        valor: dto.token,
        tipo: TipoToken.RECUPERAR_PASSWORD,
        usado: false,
        expiraEn: MoreThan(new Date()),
      },
      relations: ['usuario'],
    });

    if (!tokenRecord || !tokenRecord.usuario) {
      throw new BadRequestException('El token de recuperación es inválido, ya fue utilizado o ha expirado.');
    }

    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const nuevaContrasenaHash = await bcrypt.hash(dto.nuevaContrasena, salt);

    // Actualizar usuario
    tokenRecord.usuario.contrasena = nuevaContrasenaHash;
    await this.userRepo.save(tokenRecord.usuario);

    // Marcar token como usado
    tokenRecord.usado = true;
    await this.tokenRepo.save(tokenRecord);

    // Invalidar todas las sesiones previas (refresh tokens)
    await this.tokenRepo.update(
      { usuarioId: tokenRecord.usuario.id, tipo: TipoToken.REFRESH, usado: false },
      { usado: true },
    );

    return {
      message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
    };
  }

  // =========================================================================
  // HU-06: RENOVAR TOKEN (REFRESH TOKEN)
  // =========================================================================
  async renovarToken(dto: RefreshTokenDto) {
    // 1. Buscar el refresh token en la base de datos
    const tokenRecord = await this.tokenRepo.findOne({
      where: {
        valor: dto.refreshToken,
        tipo: TipoToken.REFRESH,
        usado: false,
        expiraEn: MoreThan(new Date()),
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('El token de renovación es inválido, ya fue utilizado o ha expirado.');
    }

    // 2. Verificar el token criptográfico con JwtService
    let payload: any;
    try {
      const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || 'jwt_refresh_secret';
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch (error) {
      // Marcar como usado si falló la verificación
      tokenRecord.usado = true;
      await this.tokenRepo.save(tokenRecord);
      throw new UnauthorizedException('El token de renovación no es válido.');
    }

    // 3. Buscar el usuario correspondiente
    const usuario = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['rol'],
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no válido o inactivo.');
    }

    // 4. Marcar el token anterior como usado (rotación de tokens)
    tokenRecord.usado = true;
    await this.tokenRepo.save(tokenRecord);

    // 5. Generar nuevos tokens
    const tokens = await this.generarTokens(usuario);

    return {
      message: 'Tokens renovados exitosamente.',
      ...tokens,
    };
  }

  // =========================================================================
  // HU-07: VERIFICAR EMAIL
  // =========================================================================
  async verificarEmail(dto: VerificarEmailDto) {
    const tokenRecord = await this.tokenRepo.findOne({
      where: {
        valor: dto.token,
        tipo: TipoToken.VERIFICACION_EMAIL,
        usado: false,
        expiraEn: MoreThan(new Date()),
      },
      relations: ['usuario'],
    });

    if (!tokenRecord || !tokenRecord.usuario) {
      throw new BadRequestException('El enlace o token de verificación es inválido, ya fue utilizado o ha expirado.');
    }

    // Actualizar usuario a verificado
    tokenRecord.usuario.emailVerificado = true;
    await this.userRepo.save(tokenRecord.usuario);

    // Marcar token como usado
    tokenRecord.usado = true;
    await this.tokenRepo.save(tokenRecord);

    return {
      message: '¡Correo electrónico verificado exitosamente! Tu cuenta está completamente activa.',
      usuario: {
        id: tokenRecord.usuario.id,
        correo: tokenRecord.usuario.correo,
        emailVerificado: true,
      },
    };
  }

  // =========================================================================
  // MÉTODOS AUXILIARES
  // =========================================================================
  private async generarTokens(usuario: UserEntity) {
    const payload = {
      sub: usuario.id,
      email: usuario.correo,
      role: usuario.rol?.nombre || 'CLIENTE',
      jti: crypto.randomUUID(),
    };

    const jwtSecret = this.configService.get<string>('jwt.secret') || 'jwt_secret';
    const jwtExpiresIn = this.configService.get<string>('jwt.expiresIn') || '1d';
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || 'jwt_refresh_secret';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' },
        {
          secret: jwtSecret,
          expiresIn: jwtExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    // Guardar el refresh token en la base de datos (7 días de validez)
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenEntity = this.tokenRepo.create({
      usuarioId: usuario.id,
      tipo: TipoToken.REFRESH,
      valor: refreshToken,
      expiraEn,
      usado: false,
    });

    await this.tokenRepo.save(tokenEntity);

    return {
      accessToken,
      refreshToken,
    };
  }
}
