import { storage } from './storage';
import { Categoria, Producto, FiltrosProductos } from './catalogo.api';

const KEY_CATEGORIES = '@aura_cache_categories';
const KEY_PRODUCTS = '@aura_cache_all_products';
const PREFIX_PRODUCT = '@aura_cache_product_';
const PREFIX_RELATED = '@aura_cache_related_';

export const offlineCatalogService = {
  async saveCategories(categories: Categoria[]): Promise<void> {
    if (!categories || categories.length === 0) return;
    await storage.set(KEY_CATEGORIES, categories);
  },

  async getCachedCategories(): Promise<Categoria[]> {
    const cached = await storage.get<Categoria[]>(KEY_CATEGORIES);
    return cached || [];
  },

  async saveProducts(products: Producto[]): Promise<void> {
    if (!products || products.length === 0) return;
    // Guardar lista completa
    await storage.set(KEY_PRODUCTS, products);

    // Guardar en caché individual cada producto para navegación instantánea
    for (const prod of products) {
      if (prod.id) {
        await storage.set(`${PREFIX_PRODUCT}${prod.id}`, prod);
      }
    }
  },

  async getCachedProducts(): Promise<Producto[]> {
    const cached = await storage.get<Producto[]>(KEY_PRODUCTS);
    return cached || [];
  },

  async saveProductDetail(product: Producto): Promise<void> {
    if (!product || !product.id) return;
    await storage.set(`${PREFIX_PRODUCT}${product.id}`, product);

    // Si aún no está en la lista general, agregarlo
    const all = await this.getCachedProducts();
    const index = all.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      all[index] = product;
    } else {
      all.push(product);
    }
    await storage.set(KEY_PRODUCTS, all);
  },

  async getCachedProductDetail(id: string): Promise<Producto | null> {
    const individual = await storage.get<Producto>(`${PREFIX_PRODUCT}${id}`);
    if (individual) return individual;

    const all = await this.getCachedProducts();
    return all.find((p) => p.id === id) || null;
  },

  async saveRelatedProducts(productId: string, related: Producto[]): Promise<void> {
    if (!productId || !related) return;
    await storage.set(`${PREFIX_RELATED}${productId}`, related);
  },

  async getCachedRelatedProducts(productId: string): Promise<Producto[]> {
    const cached = await storage.get<Producto[]>(`${PREFIX_RELATED}${productId}`);
    if (cached && cached.length > 0) return cached;

    // Si no hay relacionados específicos guardados, tomar 3 productos diferentes de la caché
    const all = await this.getCachedProducts();
    return all.filter((p) => p.id !== productId).slice(0, 3);
  },

  /**
   * Filtra productos en memoria a partir de la caché local cuando no hay conexión.
   */
  async filterCachedProducts(filtros?: FiltrosProductos | string): Promise<Producto[]> {
    const all = await this.getCachedProducts();

    if (!filtros) return all;

    if (typeof filtros === 'string') {
      return all.filter((p) => p.categoria?.id === filtros);
    }

    let result = [...all];

    // Filtro por categoría
    if (filtros.categoriaId) {
      result = result.filter((p) => p.categoria?.id === filtros.categoriaId);
    }

    // Búsqueda por texto (nombre o descripción)
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q) ||
          p.categoria?.nombre?.toLowerCase().includes(q)
      );
    }

    // Filtro por talla
    if (filtros.tallaId) {
      result = result.filter((p) =>
        p.variantes?.some((v) => v.talla?.id === filtros.tallaId)
      );
    }

    // Filtro por color
    if (filtros.colorId) {
      result = result.filter((p) =>
        p.variantes?.some((v) => v.color?.id === filtros.colorId)
      );
    }

    // Filtro por precio
    if (filtros.precioMin !== undefined) {
      result = result.filter((p) => Number(p.precio) >= filtros.precioMin!);
    }
    if (filtros.precioMax !== undefined) {
      result = result.filter((p) => Number(p.precio) <= filtros.precioMax!);
    }

    // Ordenamiento
    if (filtros.ordenarPor === 'precio_asc') {
      result.sort((a, b) => Number(a.precio) - Number(b.precio));
    } else if (filtros.ordenarPor === 'precio_desc') {
      result.sort((a, b) => Number(b.precio) - Number(a.precio));
    } else if (filtros.ordenarPor === 'popularidad') {
      result.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    }

    return result;
  },
};
