import { cuentaDeLaPlataforma } from '../../src/modules/tiendas/platform-account';

describe('cuentaDeLaPlataforma', () => {
  const completo = {
    PLATFORM_PAYMENT_QR_URL: '/uploads/plataforma/qr.webp',
    PLATFORM_PAYMENT_HOLDER: 'Plataforma S.R.L.',
    PLATFORM_PAYMENT_BANK: 'Banco Ejemplo',
    PLATFORM_PAYMENT_ACCOUNT: '123456',
  };

  it('reads the account from the environment', () => {
    expect(cuentaDeLaPlataforma(completo)).toEqual({
      qrUrl: '/uploads/plataforma/qr.webp',
      titular: 'Plataforma S.R.L.',
      banco: 'Banco Ejemplo',
      numeroCuenta: '123456',
    });
  });

  it('offers nothing when the QR, the holder or the bank is missing', () => {
    expect(cuentaDeLaPlataforma({})).toBeNull();
    expect(cuentaDeLaPlataforma({ ...completo, PLATFORM_PAYMENT_QR_URL: '  ' })).toBeNull();
    expect(cuentaDeLaPlataforma({ ...completo, PLATFORM_PAYMENT_HOLDER: undefined })).toBeNull();
    expect(cuentaDeLaPlataforma({ ...completo, PLATFORM_PAYMENT_BANK: '' })).toBeNull();
  });

  it('does not need an account number: a QR alone can be paid', () => {
    expect(cuentaDeLaPlataforma({ ...completo, PLATFORM_PAYMENT_ACCOUNT: undefined })?.numeroCuenta).toBe('');
  });
});
