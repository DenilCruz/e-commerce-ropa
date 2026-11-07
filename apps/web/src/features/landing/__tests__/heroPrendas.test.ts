import { describe, expect, it } from 'vitest';
import { elegirPrendasCarrusel } from '../heroPrendas';

const corte = (id: string, categoria: string) => ({
  id, nombre: id, precio: '120', activo: true, destacado: true,
  categoria: { id: categoria },
  imagenes: [{ url: `/uploads/${categoria}/${id}.webp`, principal: true }],
});

describe('prendas del carrusel de la landing', () => {
  it('muestra el ejemplo, con el abrigo primero, cuando no hay tienda suscrita', () => {
    const prendas = elegirPrendasCarrusel([], 'http://localhost:3000');
    expect(prendas.length).toBeGreaterThanOrEqual(3);
    expect(prendas[0]).toMatchObject({ id: 'ejemplo-abrigo', ejemplo: true });
    expect(prendas[0].imagen).toBe('/landing/abrigo.webp');
    expect(elegirPrendasCarrusel(null, '').every((p) => p.ejemplo)).toBe(true);
  });

  it('no usa fotos con fondo: sin recorte transparente sigue el ejemplo', () => {
    const prendas = elegirPrendasCarrusel([
      { id: 'a', nombre: 'Vestido', precio: '90', imagenes: [{ url: '/uploads/vestido.jpg', principal: true }] },
    ], '');
    expect(prendas[0].id).toBe('ejemplo-abrigo');
  });

  it('usa el catálogo real cuando hay al menos tres prendas recortadas', () => {
    const prendas = elegirPrendasCarrusel([
      corte('uno', 'abrigos'),
      corte('dos', 'vestidos'),
      corte('tres', 'camisas'),
    ], 'http://api');
    expect(prendas.map((p) => p.id)).toEqual(['uno', 'dos', 'tres']);
    expect(prendas.every((p) => !p.ejemplo)).toBe(true);
    expect(prendas[0].imagen).toBe('http://api/uploads/abrigos/uno.webp');
  });
});
