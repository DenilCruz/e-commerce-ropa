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
