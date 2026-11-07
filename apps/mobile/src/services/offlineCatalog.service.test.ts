import { beforeEach, expect, it, vi } from 'vitest';
import { catalogoOfflineDeTienda } from './offlineCatalog.service';

const datos = vi.hoisted(() => new Map<string, unknown>());
vi.mock('./storage', () => ({
  storage: {
    get: async (clave: string) => datos.get(clave),
    set: async (clave: string, valor: unknown) => { datos.set(clave, valor); },
  },
}));

beforeEach(() => datos.clear());

it('separa las categorías, los productos y su detalle por tienda', async () => {
  const aura = catalogoOfflineDeTienda('aura');
  const luna = catalogoOfflineDeTienda('luna');
  const vestido = { id: 'vestido', nombre: 'Vestido AURA', descripcion: '', precio: 100 };
  await aura.saveCategories([{ id: 'vestidos', nombre: 'Vestidos' }]);
  await aura.saveProducts([vestido]);
  await aura.saveRelatedProducts('abrigo', [vestido]);

  expect(await luna.getCachedCategories()).toEqual([]);
  expect(await luna.getCachedProducts()).toEqual([]);
  expect(await luna.getCachedProductDetail(vestido.id)).toBeNull();
  expect(await luna.getCachedRelatedProducts('abrigo')).toEqual([]);
  expect(await aura.getCachedProductDetail(vestido.id)).toEqual(vestido);
});
