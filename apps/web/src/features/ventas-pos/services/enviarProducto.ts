import { api } from '../../../services/api';
import { ProductoLocal } from '../types';

/** Body of POST /productos for a queued product (C2): ids come from this device. */
export function cuerpoDeProducto(producto: ProductoLocal) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: producto.precio,
    categoriaId: producto.categoriaId,
    variantes: producto.variantes.map((v) => ({
      id: v.id,
      sku: v.sku,
      stock: v.stock,
      tallaId: v.tallaId,
      colorId: v.colorId,
    })),
  };
}

/** Posts one queued product. Its id is the Idempotency-Key, so a retry never creates it twice. */
export async function enviarProductoPorApi(producto: ProductoLocal): Promise<void> {
  await api.post('/productos', cuerpoDeProducto(producto), { headers: { 'Idempotency-Key': producto.id } });
}
