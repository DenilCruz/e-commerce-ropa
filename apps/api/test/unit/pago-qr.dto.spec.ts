import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PagoQrDto } from '../../src/modules/pagos/dto/pago-qr.dto';

const base = {
  direccionEnvio: 'Av. Cristo Redentor #450, Santa Cruz',
  telefono: '77712345',
  nroComprobante: 'TRX-20260101-001',
};

const errorsOf = async (extra: Record<string, unknown> = {}, drop: string[] = []) => {
  const plain: Record<string, unknown> = { ...base, ...extra };
  drop.forEach((k) => delete plain[k]);
  const errors = await validate(plainToInstance(PagoQrDto, plain));
  return errors.map((e) => e.property);
};

describe('PagoQrDto', () => {
  it('accepts a complete request', async () => {
    expect(await errorsOf()).toEqual([]);
  });

  it('requires a receipt number: no proof, no order', async () => {
    expect(await errorsOf({}, ['nroComprobante'])).toContain('nroComprobante');
    expect(await errorsOf({ nroComprobante: '' })).toContain('nroComprobante');
    expect(await errorsOf({ nroComprobante: '   ' })).toContain('nroComprobante');
  });

  it.each(['123', 'x'.repeat(41), 'abc def', "1'; DROP TABLE pago;--", '<script>1</script>'])(
    'rejects the malformed receipt %j',
    async (nro) => {
      expect(await errorsOf({ nroComprobante: nro })).toContain('nroComprobante');
    },
  );

  it('requires delivery address and phone', async () => {
    expect(await errorsOf({}, ['direccionEnvio'])).toContain('direccionEnvio');
    expect(await errorsOf({}, ['telefono'])).toContain('telefono');
    expect(await errorsOf({ telefono: 'llámame' })).toContain('telefono');
  });

  it('caps the free-text fields', async () => {
    expect(await errorsOf({ direccionEnvio: 'a'.repeat(256) })).toContain('direccionEnvio');
    expect(await errorsOf({ notas: 'n'.repeat(501) })).toContain('notas');
  });

  it('only accepts a UUID as shipping method and coupon', async () => {
    expect(await errorsOf({ metodoEnvioId: 'cualquier-cosa' })).toContain('metodoEnvioId');
    expect(await errorsOf({ cuponId: 'DESCUENTO50' })).toContain('cuponId');
  });

  it('accepts the shipping type in any case but nothing else', async () => {
    expect(await errorsOf({ tipoEnvio: 'express' })).toEqual([]);
    expect(await errorsOf({ tipoEnvio: 'GRATIS' })).toContain('tipoEnvio');
  });

  it('keeps coordinates inside the planet', async () => {
    expect(await errorsOf({ latitud: -17.78, longitud: -63.18 })).toEqual([]);
    expect(await errorsOf({ latitud: 91 })).toContain('latitud');
    expect(await errorsOf({ longitud: -181 })).toContain('longitud');
    expect(await errorsOf({ latitud: 'norte' as any })).toContain('latitud');
  });
});
