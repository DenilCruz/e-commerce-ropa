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

/** What identifies a counter customer (C1). `id` is generated on the device. */
export interface ClienteVenta {
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
  /** Registered customer of this sale; the server upserts it in the same transaction as the sale. */
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
  imagen?: string;
}

export interface SesionVendedor {
  tenantId: string;
  usuarioId: string;
}

/** Fields every queued record (sale, customer, product) shares. */
export interface RegistroCola {
  id: string;
  tenantId: string;
  usuarioId: string;
  creadoEn: string;
  secuencia: number;
  estado: EstadoVentaLocal;
  intentos: number;
  ultimoError?: string;
  sincronizadaEn?: string;
}

export interface ExistenteCliente {
  id: string;
  nombre: string;
  ci?: string | null;
}

/** A customer registered on this device; synced with POST /clientes-mostrador. */
export interface ClienteLocal extends RegistroCola, ClienteVenta {
  /** The server already has another customer with this ci. */
  conflicto?: { existente: ExistenteCliente };
  /** Set when the server (or the user) merged this customer into an existing one. */
  fusionadoCon?: string;
}

export interface SkuDuplicado {
  sku: string;
  varianteId?: string;
  productoId?: string;
}

/** A product registered on this device with one variant; synced with POST /productos. */
export interface ProductoLocal extends RegistroCola {
  nombre: string;
  precio: number;
  categoriaId: string;
  categoriaNombre?: string;
  sku: string;
  /** Generated on the device so the product can be sold before it reaches the server. */
  varianteId: string;
  stockInicial: number;
  conflicto?: { items: SkuDuplicado[] };
}
