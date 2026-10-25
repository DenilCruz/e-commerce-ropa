jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../src/modules/autenticacion/auth.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('AuthService (multi-store)', () => {
  const TENANT = 'tenant-aura';
  const CLIENTE = { id: 'role-cliente', nombre: 'CLIENTE' };
  const ADMIN = { id: 'role-admin', nombre: 'ADMIN' };
  const PASSWORD = 'Secreta2026!';

  let service: AuthService;
  let userRepo: any;
  let roleRepo: any;
  let tokenRepo: any;
  let membershipRepo: any;
  let jwtService: any;
  let mailService: any;
  let manager: any;
  let runner: any;
  let signedPayloads: any[];
  let usuario: any;

  /** Runs the test body as a request of the given store. */
  const enStore = <T>(fn: () => Promise<T>, tenantId = TENANT) =>
    TenantContext.run(async () => {
      TenantContext.set(tenantId);
      return fn();
    });

  beforeEach(() => {
    signedPayloads = [];
    usuario = {
      id: 'user-1',
      nombre: 'Ana',
      apellido: 'Luna',
      correo: 'ana@luna.test',
      contrasena: bcrypt.hashSync(PASSWORD, 4),
      activo: true,
      emailVerificado: true,
      rol: CLIENTE,
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue(usuario),
      save: jest.fn(async (u: any) => u),
    };
    roleRepo = { findOne: jest.fn().mockResolvedValue(CLIENTE) };
    tokenRepo = {
      create: jest.fn((t: any) => t),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    membershipRepo = { exist: jest.fn().mockResolvedValue(false), findOne: jest.fn() };
    jwtService = {
      signAsync: jest.fn(async (payload: any) => {
        signedPayloads.push(payload);
        return `token-${signedPayloads.length}`;
      }),
      verifyAsync: jest.fn(),
    };
    manager = {
      create: jest.fn((_entity: any, data: any) => ({ ...data })),
      save: jest.fn(async (e: any) => e),
      query: jest.fn(),
    };
    runner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    };

    mailService = { enviarEmailVerificacion: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      userRepo,
      roleRepo,
      tokenRepo,
      membershipRepo,
      jwtService,
      { get: jest.fn() } as any,
      mailService,
      { createQueryRunner: jest.fn(() => runner) } as any,
      {} as any,
    );
  });

  describe('registro with an email that already has an account', () => {
    const dto: any = { nombre: 'Ana', apellido: 'Luna', correo: 'ana@luna.test', contrasena: PASSWORD };

    it('joins the store as CLIENTE when the account password is correct', async () => {
      const result = await enStore(() => service.registro(dto));

      expect(result.message).toContain('se unió a esta tienda');
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 'user-1', tiendaId: TENANT, rolId: CLIENTE.id }),
      );
      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO cliente'), ['user-1', TENANT]);
      expect(runner.commitTransaction).toHaveBeenCalled();
    });

    it('does not create a second account nor join with a wrong password', async () => {
      await expect(enStore(() => service.registro({ ...dto, contrasena: 'Otra2026!' }))).rejects.toThrow(
        BadRequestException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('reports an email already registered when the user already belongs to the store', async () => {
      membershipRepo.exist.mockResolvedValue(true);

      await expect(enStore(() => service.registro(dto))).rejects.toThrow('ya se encuentra registrado');
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('registro of a brand new account', () => {
    const originalFlag = process.env.EXPOSE_VERIFICATION_LINK;
    const dto: any = { nombre: 'Nuevo', apellido: 'Usuario', correo: 'nuevo@luna.test', contrasena: PASSWORD };

    beforeEach(() => {
      userRepo.findOne.mockResolvedValue(null);
      mailService.enviarEmailBienvenida = jest.fn().mockResolvedValue(undefined);
      manager.save.mockImplementation(async (e: any) => ({ id: 'new-user', ...e }));
    });
    afterEach(() => {
      if (originalFlag === undefined) delete process.env.EXPOSE_VERIFICATION_LINK;
      else process.env.EXPOSE_VERIFICATION_LINK = originalFlag;
    });

    it('does not return the verification token by default: it only travels by email', async () => {
      delete process.env.EXPOSE_VERIFICATION_LINK;

      const result: any = await enStore(() => service.registro(dto));

      expect(result.tokenVerificacion).toBeUndefined();
      expect(result.enlaceVerificacion).toBeUndefined();
      expect(mailService.enviarEmailVerificacion).toHaveBeenCalledWith(
        'nuevo@luna.test',
        'Nuevo',
        expect.any(String),
      );
    });

    it('does not open the shortcut because NODE_ENV is unset or unusual', async () => {
      delete process.env.EXPOSE_VERIFICATION_LINK;
      process.env.NODE_ENV = 'staging';

      const result: any = await enStore(() => service.registro(dto));

      expect(result.tokenVerificacion).toBeUndefined();
      expect(result.enlaceVerificacion).toBeUndefined();
    });

    it('returns the token and link only when the development shortcut is explicitly enabled', async () => {
      process.env.EXPOSE_VERIFICATION_LINK = 'true';

      const result: any = await enStore(() => service.registro(dto));

      expect(result.tokenVerificacion).toEqual(expect.any(String));
      expect(result.enlaceVerificacion).toContain('/verificar-email?token=');
    });
  });

  describe('login', () => {
    it('refuses a user who is not a member of the store being logged into', async () => {
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(
        enStore(() => service.login({ correo: usuario.correo, contrasena: PASSWORD })),
      ).rejects.toThrow(UnauthorizedException);
      expect(signedPayloads).toHaveLength(0);
    });

    it('signs tokens that carry the store and the role the user holds in it', async () => {
      membershipRepo.findOne.mockResolvedValue({ rol: ADMIN });

      const result = await enStore(() => service.login({ correo: usuario.correo, contrasena: PASSWORD }));

      expect(signedPayloads.length).toBeGreaterThan(0);
      for (const payload of signedPayloads) {
        expect(payload).toMatchObject({ sub: 'user-1', tid: TENANT, role: 'ADMIN' });
      }
      expect(result.usuario).toMatchObject({ rol: 'ADMIN', tenantId: TENANT });
    });
  });

  describe('reenviarVerificacion', () => {
    const originalFlag = process.env.EXPOSE_VERIFICATION_LINK;
    afterEach(() => {
      if (originalFlag === undefined) delete process.env.EXPOSE_VERIFICATION_LINK;
      else process.env.EXPOSE_VERIFICATION_LINK = originalFlag;
    });

    let recentQuery: { getOne: jest.Mock };

    beforeEach(() => {
      usuario.emailVerificado = false;
      recentQuery = { getOne: jest.fn().mockResolvedValue(null) };
      const chain: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: recentQuery.getOne,
      };
      tokenRepo.createQueryBuilder = jest.fn().mockReturnValue(chain);
    });

    it('refuses when the email is already verified', async () => {
      usuario.emailVerificado = true;

      await expect(service.reenviarVerificacion('user-1')).rejects.toThrow('ya está verificado');
      expect(mailService.enviarEmailVerificacion).not.toHaveBeenCalled();
    });

    it('answers 429 when a link was already sent less than a minute ago', async () => {
      recentQuery.getOne.mockResolvedValue({ valor: 'reciente' });

      const error: any = await service.reenviarVerificacion('user-1').catch((e) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(mailService.enviarEmailVerificacion).not.toHaveBeenCalled();
    });

    it('invalidates the previous links, stores a new 24 hour token and emails it', async () => {
      delete process.env.EXPOSE_VERIFICATION_LINK;

      const result = await service.reenviarVerificacion('user-1');

      expect(tokenRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 'user-1', usado: false }),
        { usado: true },
      );
      const stored = tokenRepo.save.mock.calls[0][0];
      expect(stored.tipo).toBe('VERIFICACION_EMAIL');
      expect(stored.expiraEn.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(mailService.enviarEmailVerificacion).toHaveBeenCalledWith(usuario.correo, usuario.nombre, stored.valor);
      expect(result.message).toContain(usuario.correo);
    });

    it('returns the link only when the development shortcut is explicitly enabled', async () => {
      process.env.EXPOSE_VERIFICATION_LINK = 'true';
      const open = await service.reenviarVerificacion('user-1');
      expect(open.enlaceVerificacion).toContain('/verificar-email?token=');

      delete process.env.EXPOSE_VERIFICATION_LINK;
      process.env.NODE_ENV = 'development';
      const closed = await service.reenviarVerificacion('user-1');
      expect(closed.enlaceVerificacion).toBeUndefined();
    });
  });

  describe('renovarToken', () => {
    const refresh = 'refresh-token';

    beforeEach(() => {
      tokenRepo.findOne.mockResolvedValue({ valor: refresh, usado: false });
    });

    it('rejects a refresh token issued before stores existed (no store inside)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });

      await expect(service.renovarToken({ refreshToken: refresh } as any)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects the renewal when the membership was revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', tid: TENANT });
      membershipRepo.findOne.mockResolvedValue(null);

      await expect(service.renovarToken({ refreshToken: refresh } as any)).rejects.toThrow(UnauthorizedException);
      expect(signedPayloads).toHaveLength(0);
    });

    it('keeps the store of the token when the membership is still active', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', tid: TENANT });
      membershipRepo.findOne.mockResolvedValue({ rol: CLIENTE });

      await service.renovarToken({ refreshToken: refresh } as any);

      expect(signedPayloads[0]).toMatchObject({ tid: TENANT, role: 'CLIENTE' });
    });
  });
});
