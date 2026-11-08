jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductosController } from '../../src/modules/productos/products.controller';
import { IdempotencyInterceptor } from '../../src/common/idempotency/idempotency.interceptor';
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

describe('ProductosService offline creation (ids from the client)', () => {
  const TENANT = 'tenant-luna';
  const P = '11111111-1111-4111-8111-111111111111';
  const V = '22222222-2222-4222-8222-222222222222';
  const base = { nombre: 'Solera', precio: 100, categoriaId: 'cat-luna' };
  let products: any;
  let planLimits: any;
  let service: ProductosService;
  let manager: { find: jest.Mock };

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue(TENANT);
    manager = { find: jest.fn().mockResolvedValue([]) };
    products = {
      manager,
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };
    planLimits = { validarLimiteProductos: jest.fn().mockResolvedValue(undefined) };
    const categories = { count: jest.fn().mockResolvedValue(1) };
    service = new ProductosService(products, {} as any, {} as any, categories as any, {} as any, planLimits);
  });

  afterEach(() => jest.restoreAllMocks());

  it('hands the ids given by the client to the entity so they are inserted as they are', async () => {
    await service.crear({ ...base, id: P, variantes: [{ id: V, sku: 'SOL-M' }] });

    expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ id: P, variantes: [expect.objectContaining({ id: V })] }));
  });

  it('answers 409 PRODUCTO_EXISTENTE for an id already in the store, before save() could update it', async () => {
    products.count.mockResolvedValue(1);

    const error: any = await service.crear({ ...base, id: P }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({ codigo: 'PRODUCTO_EXISTENTE', productoId: P });
    expect(products.count).toHaveBeenCalledWith({ where: { id: P, tenantId: TENANT } });
    expect(products.save).not.toHaveBeenCalled();
  });

  it('also refuses a new product that reuses the id of an existing variant', async () => {
    manager.find.mockResolvedValue([{ id: V, productoId: 'otro' }]);

    const error: any = await service.crear({ ...base, id: P, variantes: [{ id: V, sku: 'X' }] }).catch((e) => e);

    expect(error.getResponse()).toMatchObject({ codigo: 'PRODUCTO_EXISTENTE', productoId: P });
    expect(products.save).not.toHaveBeenCalled();
  });

  it('turns the unique SKU violation into 409 SKU_DUPLICADO listing the colliding variants', async () => {
    const violation: any = new Error('duplicate key value violates unique constraint "uq_variante_tenant_sku"');
    violation.code = '23505';
    violation.constraint = 'uq_variante_tenant_sku';
    products.save.mockRejectedValue(violation);
    manager.find.mockResolvedValue([{ id: 'v-old', sku: 'SOL-M', productoId: 'p-old' }]);

    const error: any = await service.crear({ ...base, variantes: [{ sku: 'SOL-M' }] }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({
      codigo: 'SKU_DUPLICADO',
      items: [{ sku: 'SOL-M', varianteId: 'v-old', productoId: 'p-old' }],
    });
  });

  it('turns a primary key clash with another store into PRODUCTO_EXISTENTE', async () => {
    const violation: any = new Error('duplicate key');
    violation.code = '23505';
    violation.constraint = 'producto_pkey';
    products.save.mockRejectedValue(violation);

    const error: any = await service.crear({ ...base, id: P }).catch((e) => e);

    expect(error.getResponse()).toMatchObject({ codigo: 'PRODUCTO_EXISTENTE', productoId: P });
  });

  it('keeps other database errors as they are', async () => {
    const boom: any = new Error('connection lost');
    boom.code = '08006';
    products.save.mockRejectedValue(boom);

    await expect(service.crear(base)).rejects.toBe(boom);
  });

  it('answers 403 LIMITE_PLAN keeping the human message', async () => {
    planLimits.validarLimiteProductos.mockRejectedValue(new ForbiddenException('Has alcanzado el límite de 30 productos.'));

    const error: any = await service.crear(base).catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ codigo: 'LIMITE_PLAN', message: 'Has alcanzado el límite de 30 productos.' });
    expect(products.save).not.toHaveBeenCalled();
  });
});

describe('ProductosController creation', () => {
  it('applies the idempotency interceptor and stays limited to the admin roles', () => {
    const interceptors = Reflect.getMetadata('__interceptors__', ProductosController.prototype.crear);
    expect(interceptors).toContain(IdempotencyInterceptor);
    expect(Reflect.getMetadata('roles', ProductosController.prototype.crear)).toEqual(['ADMIN', 'SUPERADMIN', 'ADMINISTRADOR']);
  });
});
