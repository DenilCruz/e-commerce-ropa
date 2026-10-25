export type EstadoVentaLocal = 'PENDIENTE' | 'SINCRONIZANDO' | 'SINCRONIZADA' | 'CONFLICTO' | 'ERROR';

export interface ItemVentaLocal {
  varianteId: string;
  nombre: string;
  talla: string;
  color: string;
  cantidad: number;
  /** Price shown to the seller when the sale was made; the server always charges the current one. */
  precio: number;
}

export interface ConflictoItem {
  varianteId: string;
  nombre: string | null;
  solicitado: number;
  disponible: number;
}

export interface VentaLocal {
  /** UUID v4: it is also the Idempotency-Key of every attempt to sync this sale. */
  id: string;
  tenantId: string;
  usuarioId: string;
  items: ItemVentaLocal[];
  clienteNombre?: string;
  notas?: string;
  total: number;
  creadoEn: string;
  /** Position in the queue: sales sync in the order they were made, even within the same millisecond. */
  secuencia: number;
  estado: EstadoVentaLocal;
  intentos: number;
  ultimoError?: string;
  conflicto?: ConflictoItem[];
  ordenId?: string;
  ordenNro?: string;
  sincronizadaEn?: string;
}

/** One variant of the catalog snapshot the seller works from when there is no connection. */
export interface VarianteCatalogo {
  /** `${tenantId}:${varianteId}` */
  clave: string;
  tenantId: string;
  varianteId: string;
  productoId: string;
  sku: string;
  nombre: string;
  talla: string;
  color: string;
  precio: number;
  /** Stock the server reported at the last snapshot. */
  stockServidor: number;
  /** What the seller can still sell on this device: server stock minus the sales not synced yet. */
  stockLocal: number;
  categoria?: string;
  imagen?: string;
}
