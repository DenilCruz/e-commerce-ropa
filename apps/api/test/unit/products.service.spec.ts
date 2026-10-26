jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductosService } from '../../src/modules/productos/products.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

describe('ProductosService references (Unit Tests)', () => {
  const TENANT = 'tenant-luna';
  const OWN_CATEGORY = 'cat-luna';
  const OWN_BRAND = 'brand-luna';
  const FOREIGN_CATEGORY = 'cat-aura';
  const FOREIGN_BRAND = 'brand-aura';

  let products: any;
  let categories: any;
  let brands: any;
  let service: ProductosService;

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue(TENANT);

    products = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'prod-1', ...entity })),
      merge: jest.fn((entity, dto) => ({ ...entity, ...dto })),
      findOne: jest.fn().mockResolvedValue({ id: 'prod-1', tenantId: TENANT, categoriaId: OWN_CATEGORY }),
    };
    // A row only exists for ids that belong to the active store
    categories = { count: jest.fn(({ where }) => Promise.resolve(where.id === OWN_CATEGORY && where.tenantId === TENANT ? 1 : 0)) };
    brands = { count: jest.fn(({ where }) => Promise.resolve(where.id === OWN_BRAND && where.tenantId === TENANT ? 1 : 0)) };
    const planLimits = { validarLimiteProductos: jest.fn().mockResolvedValue(undefined) };

    service = new ProductosService(products, {} as any, {} as any, categories, brands, planLimits as any);
  });


  afterEach(() => jest.restoreAllMocks());

  const base = { nombre: 'Solera', precio: 100, categoriaId: OWN_CATEGORY };

  it('creates a product that uses the category and brand of the active store', async () => {
    const created = await service.crear({ ...base, marcaId: OWN_BRAND });

    expect(created.id).toBe('prod-1');
    expect(products.save).toHaveBeenCalledTimes(1);
  });

  it('creates a product without a brand', async () => {
    await expect(service.crear(base)).resolves.toBeDefined();
    expect(brands.count).not.toHaveBeenCalled();
  });

  it('rejects a category that belongs to another store', async () => {
    await expect(service.crear({ ...base, categoriaId: FOREIGN_CATEGORY })).rejects.toThrow(BadRequestException);
    expect(products.save).not.toHaveBeenCalled();
  });

  it('rejects a brand that belongs to another store', async () => {
    await expect(service.crear({ ...base, marcaId: FOREIGN_BRAND })).rejects.toThrow(BadRequestException);
    expect(products.save).not.toHaveBeenCalled();
  });

  it('rejects moving an existing product to a category of another store', async () => {
    await expect(service.actualizar('prod-1', { categoriaId: FOREIGN_CATEGORY })).rejects.toThrow(BadRequestException);
    expect(products.save).not.toHaveBeenCalled();
  });

  it('rejects giving an existing product a brand of another store', async () => {
    await expect(service.actualizar('prod-1', { marcaId: FOREIGN_BRAND })).rejects.toThrow(BadRequestException);
    expect(products.save).not.toHaveBeenCalled();
  });

  it('updates a product without touching references when none are sent', async () => {
    await service.actualizar('prod-1', { nombre: 'Nuevo nombre' });

    expect(categories.count).not.toHaveBeenCalled();
    expect(brands.count).not.toHaveBeenCalled();
    expect(products.save).toHaveBeenCalledTimes(1);
  });

  it('keeps answering 404 when the product to update is not in the active store', async () => {
    products.findOne.mockResolvedValue(null);

    await expect(service.actualizar('otro', { nombre: 'X' })).rejects.toThrow(NotFoundException);
  });
});
