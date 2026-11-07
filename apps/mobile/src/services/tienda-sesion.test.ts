import { expect, it } from 'vitest';
import { slugDeTienda, tiendasParaCambiar } from './tienda-sesion';

it('acepta el código o enlace de tienda y rechaza rutas sin tienda', () => {
  expect(slugDeTienda(' Luna ')).toBe('luna');
  expect(slugDeTienda('https://aura.daches.dev/t/luna-2/catalogo')).toBe('luna-2');
  expect(slugDeTienda('https://aura.daches.dev/')).toBeNull();
});

it('separa las tiendas administradas de las membresías de cliente', () => {
  const aura = { id: '1', nombre: 'AURA', slug: 'aura', plan: 'CORPORATIVO', rol: 'CLIENTE', esActiva: true };
  const luna = { ...aura, id: '2', nombre: 'Luna', slug: 'luna', rol: 'ADMIN', esActiva: false };
  expect(tiendasParaCambiar([aura, luna], 'CLIENTE')).toEqual([luna]);
  expect(tiendasParaCambiar([aura], 'CLIENTE')).toEqual([aura]);
  expect(tiendasParaCambiar([aura, luna], 'SUPERADMIN')).toEqual([aura, luna]);
});
