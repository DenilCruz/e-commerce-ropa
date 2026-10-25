import { describe, expect, it, vi } from 'vitest';
import { precargarImagenes } from '../services/imagenes';

const fakeCache = (ya: string[] = []) => {
  const guardadas = new Set(ya);
  return {
    guardadas,
    cache: {
      match: vi.fn(async (url: string) => (guardadas.has(url) ? ({} as Response) : undefined)),
      put: vi.fn(async (url: string) => { guardadas.add(url); }),
    },
  };
};

describe('precargarImagenes', () => {
  it('downloads each distinct photo once into the cache the service worker serves from', async () => {
    const { cache, guardadas } = fakeCache();
    const abrir = vi.fn(async () => cache);
    const traer = vi.fn(async () => ({}) as Response);

    const n = await precargarImagenes(['/a.jpg', '/b.jpg', '/a.jpg', ''], { abrir, traer });

    expect(abrir).toHaveBeenCalledWith('aura-imagenes');
    expect([...guardadas].sort()).toEqual(['/a.jpg', '/b.jpg']);
    expect(traer).toHaveBeenCalledTimes(2);
    expect(traer).toHaveBeenCalledWith('/a.jpg', { mode: 'no-cors' });
    expect(n).toBe(2);
  });

  it('skips the photos that are already there', async () => {
    const { cache } = fakeCache(['/a.jpg']);
    const traer = vi.fn(async () => ({}) as Response);

    expect(await precargarImagenes(['/a.jpg', '/b.jpg'], { abrir: async () => cache, traer })).toBe(1);
    expect(traer).toHaveBeenCalledTimes(1);
  });

  it('keeps going when a photo fails, and never rejects', async () => {
    const { cache } = fakeCache();
    const traer = vi.fn(async (url: string) => { if (url === '/mala.jpg') throw new Error('sin red'); return {} as Response; });

    await expect(precargarImagenes(['/mala.jpg', '/buena.jpg'], { abrir: async () => cache, traer })).resolves.toBe(1);
  });

  it('does nothing where there is no Cache Storage', async () => {
    const traer = vi.fn();

    expect(await precargarImagenes(['/a.jpg'], { abrir: undefined, traer })).toBe(0);
    expect(traer).not.toHaveBeenCalled();
  });

  it('never downloads more than a few photos at once', async () => {
    const { cache } = fakeCache();
    let activas = 0;
    let maximo = 0;
    const traer = vi.fn(async () => {
      activas += 1;
      maximo = Math.max(maximo, activas);
      await new Promise((r) => setTimeout(r, 2));
      activas -= 1;
      return {} as Response;
    });

    await precargarImagenes(Array.from({ length: 20 }, (_, i) => `/f${i}.jpg`), { abrir: async () => cache, traer });

    expect(maximo).toBeLessThanOrEqual(6);
  });
});
