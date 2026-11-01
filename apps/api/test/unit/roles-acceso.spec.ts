import { rolAutorizado } from '../../src/modules/autenticacion/roles-acceso';

describe('rolAutorizado', () => {
  it('lets the platform operator through every list', () => {
    expect(rolAutorizado('SUPERADMIN', ['ADMIN'])).toBe(true);
    expect(rolAutorizado('SUPERADMIN', ['CLIENTE'])).toBe(true);
  });

  it('treats a salesperson and the old cashier name as VENDEDOR', () => {
    expect(rolAutorizado('EMPLEADO', ['VENDEDOR'])).toBe(true);
    expect(rolAutorizado('CAJERO', ['ADMIN', 'VENDEDOR'])).toBe(true);
    expect(rolAutorizado('VENDEDOR', ['ADMIN'])).toBe(false);
  });

  it('treats ADMINISTRADOR as the store owner and does not promote CLIENTE', () => {
    expect(rolAutorizado('ADMINISTRADOR', ['ADMIN'])).toBe(true);
    expect(rolAutorizado('CLIENTE', ['ADMIN'])).toBe(false);
    expect(rolAutorizado('ADMIN', ['CLIENTE'])).toBe(false);
  });
});
