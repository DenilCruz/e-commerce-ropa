import { afterEach, describe, expect, it } from 'vitest';
import { decidirAccesoPlataforma, destinoEntradaAdmin, marcarEntradaATienda } from '../lib/acceso';

describe('acceso a la consola de plataforma', () => {
  it('manda a login a quien no tiene sesión, sea cual sea el rol guardado', () => {
    expect(decidirAccesoPlataforma({ isAuthenticated: false, rol: 'SUPERADMIN' })).toBe('login');
    expect(decidirAccesoPlataforma({ isAuthenticated: false })).toBe('login');
  });

  it.each(['ADMIN', 'ADMINISTRADOR', 'VENDEDOR', 'EMPLEADO', 'CAJERO', 'CLIENTE', '', undefined, null])(
    'devuelve al inicio a %s',
    (rol) => {
      expect(decidirAccesoPlataforma({ isAuthenticated: true, rol })).toBe('inicio');
    },
  );

  it('deja pasar solo al operador de plataforma', () => {
    expect(decidirAccesoPlataforma({ isAuthenticated: true, rol: 'SUPERADMIN' })).toBe('permitir');
    expect(decidirAccesoPlataforma({ isAuthenticated: true, rol: ' superadmin ' })).toBe('permitir');
  });
});

describe('destino de /admin', () => {
  afterEach(() => marcarEntradaATienda(false));

  it('el operador aterriza en la consola', () => {
    expect(destinoEntradaAdmin('SUPERADMIN', false)).toBe('plataforma');
  });

  it('el operador que entró a una tienda desde la consola ve el panel de esa tienda', () => {
    expect(destinoEntradaAdmin('SUPERADMIN', true)).toBe('dashboard');
  });

  it('un dueño de tienda nunca es enviado a la consola', () => {
    expect(destinoEntradaAdmin('ADMIN', false)).toBe('dashboard');
    expect(destinoEntradaAdmin('VENDEDOR', false)).toBe('dashboard');
  });

  it('sin sessionStorage disponible el operador sigue yendo a la consola', () => {
    expect(destinoEntradaAdmin('SUPERADMIN')).toBe('plataforma');
  });
});
