jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsuariosService } from '../../src/modules/usuarios/users.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('UsuariosService.cambiarRol and the plan user quota', () => {
  const TENANT = 'tenant-aura';
  const USER = 'user-1';
  const CLIENTE = { id: 'role-cliente', nombre: 'CLIENTE' };
  const VENDEDOR = { id: 'role-vendedor', nombre: 'VENDEDOR' };
  const ADMIN = { id: 'role-admin', nombre: 'ADMIN' };
  const SUPERADMIN = { id: 'role-super', nombre: 'SUPERADMIN' };

  let service: UsuariosService;
  let membresiaRepo: any;
  let rolRepo: any;
  let planLimits: { validarLimiteUsuarios: jest.Mock };

  const enStore = <T>(fn: () => Promise<T>) =>
    TenantContext.run(async () => {
      TenantContext.set(TENANT);
      return fn();
    });

  const membresiaConRol = (rol: any, activo = true) => ({ usuarioId: USER, tiendaId: TENANT, rol, rolId: rol.id, activo });

  beforeEach(() => {
    membresiaRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue(undefined) };
    rolRepo = { findOne: jest.fn() };
    planLimits = { validarLimiteUsuarios: jest.fn().mockResolvedValue(undefined) };
    service = new UsuariosService({} as any, {} as any, rolRepo, membresiaRepo, {} as any, planLimits as any);
    jest.spyOn(service, 'obtenerPerfil').mockResolvedValue({ id: USER } as any);
  });

  it('refuses promoting a shopper to staff when the store is at its user quota', async () => {
    membresiaRepo.findOne.mockResolvedValue(membresiaConRol(CLIENTE));
    rolRepo.findOne.mockResolvedValue(VENDEDOR);
    planLimits.validarLimiteUsuarios.mockRejectedValue(new ForbiddenException('límite de usuarios'));

    await expect(enStore(() => service.cambiarRol(USER, 'VENDEDOR'))).rejects.toThrow(ForbiddenException);
    expect(planLimits.validarLimiteUsuarios).toHaveBeenCalledWith(TENANT);
    expect(membresiaRepo.update).not.toHaveBeenCalled();
  });

  it('promotes a shopper to staff while the quota has room', async () => {
    membresiaRepo.findOne.mockResolvedValue(membresiaConRol(CLIENTE));
    rolRepo.findOne.mockResolvedValue(VENDEDOR);

    await enStore(() => service.cambiarRol(USER, 'VENDEDOR'));

    expect(membresiaRepo.update).toHaveBeenCalledWith({ usuarioId: USER, tiendaId: TENANT }, { rolId: VENDEDOR.id });
  });

  it('does not check the quota when staff changes between staff roles', async () => {
    membresiaRepo.findOne.mockResolvedValue(membresiaConRol(VENDEDOR));
    rolRepo.findOne.mockResolvedValue(ADMIN);

    await enStore(() => service.cambiarRol(USER, 'ADMIN'));

    expect(planLimits.validarLimiteUsuarios).not.toHaveBeenCalled();
    expect(membresiaRepo.update).toHaveBeenCalled();
  });

  it('does not check the quota when staff goes back to shopper', async () => {
    membresiaRepo.findOne.mockResolvedValue(membresiaConRol(VENDEDOR));
    rolRepo.findOne.mockResolvedValue(CLIENTE);

    await enStore(() => service.cambiarRol(USER, 'CLIENTE'));

    expect(planLimits.validarLimiteUsuarios).not.toHaveBeenCalled();
  });

  it('never grants the platform SUPERADMIN role from inside a store', async () => {
    membresiaRepo.findOne.mockResolvedValue(membresiaConRol(CLIENTE));
    rolRepo.findOne.mockResolvedValue(SUPERADMIN);

    await expect(enStore(() => service.cambiarRol(USER, 'SUPERADMIN'))).rejects.toThrow(BadRequestException);
    expect(membresiaRepo.update).not.toHaveBeenCalled();
  });
});
