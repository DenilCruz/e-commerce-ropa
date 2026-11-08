jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { ConflictException, ValidationPipe } from '@nestjs/common';
import { ClientesMostradorService } from '../../src/modules/clientes-mostrador/clientes-mostrador.service';
import { ClientesMostradorController } from '../../src/modules/clientes-mostrador/clientes-mostrador.controller';
import { ClienteMostradorDto } from '../../src/modules/clientes-mostrador/dto/cliente-mostrador.dto';
import { upsertarClienteMostrador } from '../../src/modules/clientes-mostrador/cliente-mostrador.upsert';
import { TenantContext } from '../../src/common/tenant/tenant-context';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const row = (id: string, ci: string | null = '1234567', nombre = 'Ana') => ({
  id, nombre, apellido: null, celular: null, ci, correo: null, creadoEn: new Date('2026-11-01T00:00:00Z'),
});

/** A manager whose query() answers by statement kind, in the order the shared rule issues them. */
const managerWith = (opts: { byId?: any[][]; insert?: any[]; byCi?: any[] }) => {
  const byId = [...(opts.byId ?? [[]])];
  const query = jest.fn(async (sql: string) => {
    if (/^\s*INSERT/.test(sql)) return opts.insert ?? [];
    if (/WHERE tenant_id = \$1 AND id = \$2/.test(sql)) return byId.length > 1 ? byId.shift() : byId[0];
    if (/AND ci = \$2/.test(sql)) return opts.byCi ?? [];
    throw new Error(`unexpected SQL ${sql}`);
  });
  return { query } as any;
};

describe('upsertarClienteMostrador (shared rule)', () => {
  it('creates a customer that is new', async () => {
    const manager = managerWith({ insert: [row(A)] });

    const result = await upsertarClienteMostrador(manager, 't1', { id: A, nombre: ' Ana ', ci: ' 1234567 ' });

    expect(result).toMatchObject({ tipo: 'CREADO', cliente: { id: A } });
    const insert = manager.query.mock.calls.find(([sql]: [string]) => /INSERT/.test(sql));
    expect(insert[1]).toEqual([A, 't1', 'Ana', null, null, '1234567', null]);
    expect(insert[0]).toMatch(/ON CONFLICT DO NOTHING/);
  });

  it('is idempotent by id: the same id answers with the stored row and writes nothing', async () => {
    const manager = managerWith({ byId: [[row(A)]] });

    const result = await upsertarClienteMostrador(manager, 't1', { id: A, nombre: 'Otro nombre' });

    expect(result).toMatchObject({ tipo: 'EXISTENTE', cliente: { id: A, nombre: 'Ana' } });
    expect(manager.query.mock.calls.some(([sql]: [string]) => /INSERT/.test(sql))).toBe(false);
  });

  it('reports the existing owner when another id already has the ci', async () => {
    const manager = managerWith({ byId: [[]], insert: [], byCi: [row(B)] });

    const result = await upsertarClienteMostrador(manager, 't1', { id: A, nombre: 'Ana', ci: '1234567' });

    expect(result).toMatchObject({ tipo: 'CI_DUPLICADO', cliente: { id: B } });
  });

  it('treats a concurrent insert of the same id as the existing customer', async () => {
    const manager = managerWith({ byId: [[], [row(A)]], insert: [] });

    const result = await upsertarClienteMostrador(manager, 't1', { id: A, nombre: 'Ana' });

    expect(result).toMatchObject({ tipo: 'EXISTENTE', cliente: { id: A } });
  });

  it('stores a blank ci as null so it never collides', async () => {
    const manager = managerWith({ insert: [row(A, null)] });

    await upsertarClienteMostrador(manager, 't1', { id: A, nombre: 'Ana', ci: '   ' });

    const insert = manager.query.mock.calls.find(([sql]: [string]) => /INSERT/.test(sql));
    expect(insert[1][5]).toBeNull();
  });
});

describe('ClientesMostradorService', () => {
  let service: ClientesMostradorService;
  let manager: any;

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('t1');
  });
  afterEach(() => jest.restoreAllMocks());

  const build = (m: any) => {
    manager = m;
    service = new ClientesMostradorService({ manager } as any);
  };

  it('answers created=true for a new customer and created=false for a replay', async () => {
    build(managerWith({ insert: [row(A)] }));
    await expect(service.crear({ id: A, nombre: 'Ana' })).resolves.toMatchObject({ creado: true });

    build(managerWith({ byId: [[row(A)]] }));
    await expect(service.crear({ id: A, nombre: 'Ana' })).resolves.toMatchObject({ creado: false });
  });

  it('answers 409 CLIENTE_DUPLICADO with the existing customer when the ci belongs to another id', async () => {
    build(managerWith({ byId: [[]], insert: [], byCi: [row(B, '1234567', 'Beto')] }));

    const error: any = await service.crear({ id: A, nombre: 'Ana', ci: '1234567' }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({
      codigo: 'CLIENTE_DUPLICADO',
      existente: { id: B, nombre: 'Beto', ci: '1234567' },
    });
  });

  it('caps the page size at 200 and searches inside the active store', async () => {
    const qb: any = {
      where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]),
    };
    service = new ClientesMostradorService({ createQueryBuilder: () => qb } as any);

    await service.listar('an%a', 9999);

    expect(qb.where).toHaveBeenCalledWith('c.tenantId = :tid', { tid: 't1' });
    expect(qb.limit).toHaveBeenCalledWith(200);
    expect(qb.andWhere.mock.calls[0][1]).toEqual({ q: '%an\\%a%' });
  });
});

describe('ClientesMostradorController', () => {
  it('replies 201 when the customer is new and 200 when the id already existed', async () => {
    const crear = jest.fn().mockResolvedValueOnce({ creado: true, cliente: { id: A } }).mockResolvedValueOnce({ creado: false, cliente: { id: A } });
    const controller = new ClientesMostradorController({ crear } as any);
    const res = { status: jest.fn() };

    await expect(controller.crear({ id: A, nombre: 'Ana' }, res)).resolves.toEqual({ id: A });
    expect(res.status).toHaveBeenLastCalledWith(201);
    await controller.crear({ id: A, nombre: 'Ana' }, res);
    expect(res.status).toHaveBeenLastCalledWith(200);
  });

  it('is limited to ADMIN, VENDEDOR and SUPERADMIN', () => {
    expect(Reflect.getMetadata('roles', ClientesMostradorController.prototype.crear)).toEqual(['ADMIN', 'VENDEDOR', 'SUPERADMIN']);
    expect(Reflect.getMetadata('roles', ClientesMostradorController.prototype.listar)).toEqual(['ADMIN', 'VENDEDOR', 'SUPERADMIN']);
  });
});

describe('ClienteMostradorDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const metadata = { type: 'body' as const, metatype: ClienteMostradorDto };

  it('requires a client-generated UUID v4 id and a name', async () => {
    await expect(pipe.transform({ nombre: 'Ana' }, metadata)).rejects.toThrow();
    await expect(pipe.transform({ id: 'no-uuid', nombre: 'Ana' }, metadata)).rejects.toThrow();
    await expect(pipe.transform({ id: A, nombre: 'Ana' }, metadata)).resolves.toBeDefined();
  });

  it('enforces the field lengths and accepts blank optional fields', async () => {
    await expect(pipe.transform({ id: A, nombre: 'x'.repeat(81) }, metadata)).rejects.toThrow();
    await expect(pipe.transform({ id: A, nombre: 'Ana', celular: '1'.repeat(21) }, metadata)).rejects.toThrow();
    const ok = await pipe.transform({ id: A, nombre: 'Ana', ci: '', correo: '' }, metadata);
    expect(ok.ci).toBeUndefined();
    expect(ok.correo).toBeUndefined();
  });
});
