jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlataformaService, TIENDA_BASE_ID, calcularMrr } from '../../src/modules/plataforma/plataforma.service';
import { StoreEntity } from '../../src/modules/tiendas/entities/store.entity';

describe('calcularMrr', () => {
  it('sums monthly prices and counts an annual plan at its per-month price', () => {
    expect(
      calcularMrr([
        { plan: 'ESTANDAR', periodo: 'MENSUAL', cantidad: 2 }, // 2 x 20
        { plan: 'ESTANDAR', periodo: 'ANUAL', cantidad: 1 }, // 16
        { plan: 'CORPORATIVO', periodo: 'ANUAL', cantidad: 1 }, // 80
        { plan: 'CORPORATIVO', periodo: 'MENSUAL', cantidad: '1' as any }, // 100
      ]),
    ).toBe(236);
  });

  it('is zero with no paid subscriptions and ignores unknown plans', () => {
    expect(calcularMrr([])).toBe(0);
    expect(calcularMrr([{ plan: 'OTRO', periodo: 'MENSUAL', cantidad: 5 }])).toBe(0);
  });
});

describe('PlataformaService', () => {
  const OPERADOR = 'c0000000-0000-4000-8000-000000000009';
  const TIENDA = 'b0000000-0000-4000-8000-000000000001';
  let manager: any;
  let dataSource: any;
  let storeRepo: any;
  let resolver: any;
  let service: PlataformaService;

  beforeEach(() => {
    manager = { update: jest.fn().mockResolvedValue({}), query: jest.fn().mockResolvedValue([]) };
    dataSource = {
      query: jest.fn(),
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };
    storeRepo = { findOne: jest.fn() };
    resolver = { forget: jest.fn() };
    service = new PlataformaService(dataSource, storeRepo, resolver);
  });

  it('refuses to suspend the base store, before touching anything', async () => {
    await expect(service.suspender(TIENDA_BASE_ID, OPERADOR)).rejects.toThrow(BadRequestException);
    expect(storeRepo.findOne).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('suspends a store, writes the audit row and drops the slug cache', async () => {
    storeRepo.findOne.mockResolvedValue({ id: TIENDA, slug: 'luna', estado: 'ACTIVA' });
    await expect(service.suspender(TIENDA, OPERADOR)).resolves.toEqual({ id: TIENDA, estado: 'SUSPENDIDA' });

    expect(manager.update).toHaveBeenCalledWith(StoreEntity, { id: TIENDA }, { estado: 'SUSPENDIDA' });
    const [sql, params] = manager.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO plataforma_auditoria');
    expect(params.slice(0, 3)).toEqual([OPERADOR, 'SUSPENDER_TIENDA', TIENDA]);
    expect(JSON.parse(params[3])).toEqual({ estadoAnterior: 'ACTIVA', estadoNuevo: 'SUSPENDIDA', slug: 'luna' });
    expect(resolver.forget).toHaveBeenCalledWith(TIENDA);
  });

  it('reactivates a suspended store and audits it', async () => {
    storeRepo.findOne.mockResolvedValue({ id: TIENDA, slug: 'luna', estado: 'SUSPENDIDA' });
    await expect(service.reactivar(TIENDA, OPERADOR)).resolves.toEqual({ id: TIENDA, estado: 'ACTIVA' });
    expect(manager.update).toHaveBeenCalledWith(StoreEntity, { id: TIENDA }, { estado: 'ACTIVA' });
    expect(manager.query.mock.calls[0][1].slice(0, 3)).toEqual([OPERADOR, 'REACTIVAR_TIENDA', TIENDA]);
    expect(resolver.forget).toHaveBeenCalledWith(TIENDA);
  });

  it('rejects a no-op change and writes no audit row', async () => {
    storeRepo.findOne.mockResolvedValue({ id: TIENDA, slug: 'luna', estado: 'SUSPENDIDA' });
    await expect(service.suspender(TIENDA, OPERADOR)).rejects.toThrow(BadRequestException);
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown store', async () => {
    storeRepo.findOne.mockResolvedValue(null);
    await expect(service.reactivar(TIENDA, OPERADOR)).rejects.toThrow(NotFoundException);
  });

  it('builds the summary with MRR from the active subscriptions', async () => {
    dataSource.query.mockResolvedValue([
      {
        datos: {
          tiendasTotal: 3,
          porEstado: { ACTIVA: 2, SUSPENDIDA: 1 },
          porPlan: { ESTANDAR: 1, CORPORATIVO: 1, FREE_TRIAL: 1 },
          nuevas30d: 2,
          ingresosMesUsd: '120.00',
          suscripcionesVigentes: [
            { plan: 'ESTANDAR', periodo: 'MENSUAL', cantidad: 1 },
            { plan: 'CORPORATIVO', periodo: 'ANUAL', cantidad: 1 },
          ],
        },
      },
    ]);
    await expect(service.resumen()).resolves.toMatchObject({
      tiendasTotal: 3,
      porEstado: { ACTIVA: 2, SUSPENDIDA: 1 },
      nuevas30d: 2,
      mrrUsd: 100,
      ingresosMesUsd: 120,
      suscripcionesVigentes: 2,
    });
  });

  it('passes filters and paging to the store function and reports totals', async () => {
    dataSource.query.mockResolvedValue([
      { id: TIENDA, nombre: 'Luna', slug: 'luna', plan: 'ESTANDAR', estado: 'ACTIVA', propietario_correo: 'a@b.c', usuarios: '2', productos: '5', pedidos: '1', vence_en: null, creado_en: new Date(), total: '45' },
    ]);
    const page = await service.listarTiendas({ busqueda: ' lu ', plan: 'ESTANDAR', pagina: 3, limite: 20 });
    expect(dataSource.query.mock.calls[0][1]).toEqual(['lu', 'ESTANDAR', null, 20, 40]);
    expect(page).toMatchObject({ total: 45, pagina: 3, limite: 20, totalPaginas: 3 });
    expect(page.items[0]).toMatchObject({ usuarios: 2, productos: 5, pedidos: 1, esBase: false });
  });

  it('returns an empty page when there are no rows', async () => {
    dataSource.query.mockResolvedValue([]);
    await expect(service.listarSuscripciones({})).resolves.toMatchObject({ items: [], total: 0, totalPaginas: 1 });
  });
});
