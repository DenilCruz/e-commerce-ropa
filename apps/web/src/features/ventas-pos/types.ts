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

/** Customer data a sale carries (C1): the server upserts it in the same transaction as the sale. */
export interface ClienteVenta {
  /** UUID v4 generated on this device. */
  id: string;
  nombre: string;
  apellido?: string;
  celular?: string;
  ci?: string;
  correo?: string;
}

export interface VentaLocal {
  /** UUID v4: it is also the Idempotency-Key of every attempt to sync this sale. */
  id: string;
  tenantId: string;
  usuarioId: string;
  items: ItemVentaLocal[];
  clienteNombre?: string;
  /** Customer chosen from the local customer list; its id may be remapped when the server merges it. */
  cliente?: ClienteVenta;
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

/** Fields every queued record (sale, customer, product) shares. */
export interface RegistroCola {
  id: string;
  tenantId: string;
  usuarioId: string;
  /** Position in the queue: records sync in the order they were made, even within the same millisecond. */
  secuencia: number;
  estado: EstadoVentaLocal;
  intentos: number;
  ultimoError?: string;
  creadoEn: string;
  sincronizadaEn?: string;
}

export interface ClienteExistente {
  id: string;
  nombre: string;
  ci?: string | null;
}

/**
 * A walk-in customer (no account). `id` is generated here and is also the id the server stores,
 * so it can be linked to sales before the server has ever seen it.
 */
export interface ClienteLocal extends RegistroCola, ClienteVenta {
  /** LOCAL: created on this device and shown in the queue; SERVIDOR: only a cached copy of the server list. */
  origen: 'LOCAL' | 'SERVIDOR';
  /** Set when the server already has a customer with the same ci. */
  conflicto?: ClienteExistente;
}

export interface VarianteNueva {
  /** UUID v4 generated on this device. */
  id: string;
  sku: string;
  stock: number;
  tallaId?: string;
  colorId?: string;
  tallaNombre?: string;
  colorNombre?: string;
}

export interface SkuDuplicado {
  sku: string;
  varianteId?: string;
  productoId?: string;
}

/** A product created on this device. Its id is the Idempotency-Key of every attempt to sync it. */
export interface ProductoLocal extends RegistroCola {
  nombre: string;
  descripcion?: string;
  precio: number;
  categoriaId: string;
  categoriaNombre: string;
  variantes: VarianteNueva[];
  conflicto?: SkuDuplicado[];
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
  categoriaId?: string;
  tallaId?: string;
  colorId?: string;
  imagen?: string;
  /** True for a variant created on this device that the server has not confirmed yet. */
  local?: boolean;
}
