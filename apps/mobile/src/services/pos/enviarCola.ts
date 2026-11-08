import { ClienteLocal, ProductoLocal } from './types';
import { ClientePost } from './enviarVenta';

/** Builds the sender of one queued customer. The server is idempotent by the customer id (same id -> 200). */
export function crearEnviarCliente(cliente: ClientePost) {
  return async (c: ClienteLocal): Promise<void> => {
    await cliente.post(
      '/clientes-mostrador',
      { id: c.id, nombre: c.nombre, apellido: c.apellido, celular: c.celular, ci: c.ci, correo: c.correo },
      { headers: { 'Idempotency-Key': c.id } },
    );
  };
}

/** Builds the sender of one queued product. Product and variant ids come from the device; the product id is the key. */
export function crearEnviarProducto(cliente: ClientePost) {
  return async (p: ProductoLocal): Promise<void> => {
    await cliente.post(
      '/productos',
      {
        id: p.id,
        categoriaId: p.categoriaId,
        nombre: p.nombre,
        precio: p.precio,
        variantes: [{ id: p.varianteId, sku: p.sku, stock: p.stockInicial }],
      },
      { headers: { 'Idempotency-Key': p.id } },
    );
  };
}
