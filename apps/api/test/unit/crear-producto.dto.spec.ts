import { ValidationPipe } from '@nestjs/common';
import { CrearProductoDto } from '../../src/modules/productos/dto/crear-producto.dto';

describe('CrearProductoDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const metadata = { type: 'body' as const, metatype: CrearProductoDto };
  const base = {
    nombre: 'Solera de verano',
    precio: 100,
    categoriaId: '2b9b9e54-26a2-44fe-b6a2-049736b51119',
  };

  it('accepts the active flag sent by the admin form', async () => {
    const result = await pipe.transform({ ...base, activo: true, destacado: false }, metadata);
    expect(result.activo).toBe(true);
  });

  it('still rejects unknown properties', async () => {
    await expect(pipe.transform({ ...base, inventado: 1 }, metadata)).rejects.toThrow();
  });

  it('still accepts a product without the active flag', async () => {
    await expect(pipe.transform(base, metadata)).resolves.toBeDefined();
  });
});

describe('CrearProductoDto client ids', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const metadata = { type: 'body' as const, metatype: CrearProductoDto };
  const base = { nombre: 'Solera', precio: 100, categoriaId: '2b9b9e54-26a2-44fe-b6a2-049736b51119' };
  const P = '11111111-1111-4111-8111-111111111111';
  const V = '22222222-2222-4222-8222-222222222222';

  it('accepts a UUID v4 id on the product and on each variant', async () => {
    const result = await pipe.transform({ ...base, id: P, variantes: [{ id: V, sku: 'SOL-M' }] }, metadata);
    expect(result.id).toBe(P);
    expect(result.variantes?.[0].id).toBe(V);
  });

  it('rejects an id that is not a UUID v4, on the product or on a variant', async () => {
    await expect(pipe.transform({ ...base, id: 'abc' }, metadata)).rejects.toThrow();
    await expect(pipe.transform({ ...base, id: '11111111-1111-1111-8111-111111111111' }, metadata)).rejects.toThrow();
    await expect(pipe.transform({ ...base, variantes: [{ id: 'abc', sku: 'X' }] }, metadata)).rejects.toThrow();
  });
});
