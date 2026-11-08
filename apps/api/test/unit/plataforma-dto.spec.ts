import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListarSuscripcionesQueryDto, ListarTiendasQueryDto } from '../../src/modules/plataforma/dto/consulta-plataforma.dto';

const check = async (cls: any, plain: object) => {
  const dto = plainToInstance(cls, plain);
  return { dto, errors: await validate(dto as object, { whitelist: true, forbidNonWhitelisted: true }) };
};

describe('platform query validation', () => {
  it('accepts an empty query', async () => {
    expect((await check(ListarTiendasQueryDto, {})).errors).toHaveLength(0);
  });

  it('coerces paging strings to numbers', async () => {
    const { dto, errors } = await check(ListarTiendasQueryDto, { pagina: '2', limite: '50', plan: 'ESTANDAR', estado: 'SUSPENDIDA' });
    expect(errors).toHaveLength(0);
    expect(dto).toMatchObject({ pagina: 2, limite: 50 });
  });

  it.each([
    [{ plan: 'GRATIS' }],
    [{ estado: 'BORRADA' }],
    [{ pagina: '0' }],
    [{ limite: '101' }],
    [{ limite: 'abc' }],
    [{ busqueda: 'x'.repeat(101) }],
    [{ extra: 1 }],
  ])('rejects invalid store query %j', async (plain) => {
    expect((await check(ListarTiendasQueryDto, plain)).errors.length).toBeGreaterThan(0);
  });

  it.each([[{ estado: 'ACTIVA' }], [{ estado: 'PENDIENTE_PAGO', pagina: '3' }]])('accepts subscription query %j', async (plain) => {
    expect((await check(ListarSuscripcionesQueryDto, plain)).errors).toHaveLength(0);
  });

  it('rejects an unknown subscription state', async () => {
    expect((await check(ListarSuscripcionesQueryDto, { estado: 'VIGENTE' })).errors.length).toBeGreaterThan(0);
  });
});
