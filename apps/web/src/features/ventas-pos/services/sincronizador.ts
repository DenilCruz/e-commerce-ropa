import { ClienteExistente, ClienteLocal, ConflictoItem, ProductoLocal, RegistroCola, SkuDuplicado, VentaLocal } from '../types';
import {
  listarClientes,
  marcarClienteConflicto,
  marcarClienteError,
  marcarClienteSincronizado,
  marcarClienteSincronizando,
  recuperarClientesInterrumpidos,
  remapearCliente,
  volverClienteACola,
} from './clientesLocales';
import {
  listarProductosLocales,
  marcarProductoConflicto,
  marcarProductoError,
  marcarProductoSincronizado,
  marcarProductoSincronizando,
  recuperarProductosInterrumpidos,
  volverProductoACola,
} from './productosLocales';
import {
  listarVentas,
  marcarConflicto,
  marcarError,
  marcarSincronizada,
  marcarSincronizando,
  recuperarInterrumpidas,
  volverACola,
} from './ventasLocales';

export interface SesionVendedor {
  tenantId: string;
  usuarioId: string;
}

export interface OrdenRegistrada {
  ordenId: string;
  nroOrden: string;
  /** Set when the server linked the sale to a customer that already existed with the same ci (C1). */
  clienteFusionado?: { de: string; a: string };
  /** Id of the customer the sale ended up linked to. */
  clienteId?: string | null;
  /** Name of the existing customer, when the server returns it. */
  clienteNombre?: string;
}

/** Sends one sale to the server. It must use `venta.id` as the Idempotency-Key. */
export type EnviarVenta = (venta: VentaLocal) => Promise<OrdenRegistrada>;
/** Sends one customer (POST /clientes-mostrador). Idempotent by `cliente.id`. */
export type EnviarCliente = (cliente: ClienteLocal) => Promise<void>;
/** Sends one product (POST /productos) with `producto.id` as the Idempotency-Key. */
export type EnviarProducto = (producto: ProductoLocal) => Promise<void>;

/** Senders of the records that go before the sales. A kind without a sender is not synced in this run. */
export interface Enviadores {
  cliente?: EnviarCliente;
  producto?: EnviarProducto;
}

export type MotivoInterrupcion = 'RED' | 'SERVIDOR' | 'SESION';

export interface ResultadoSync {
  /** Another sync was already running; nothing was done. */
  omitida: boolean;
  /** Sales registered by the server. */
  sincronizadas: number;
  clientesSincronizados: number;
  productosSincronizados: number;
  /** Conflicts of any kind (stock, duplicated ci, duplicated SKU). */
  conflictos: number;
  errores: number;
  /** Records that stay in the queue to be sent again. */
  pendientes: number;
  /** Sales of another store or user that this session must not send. */
  ajenas: number;
  interrumpida: boolean;
  motivo?: MotivoInterrupcion;
}

const vacio = (): ResultadoSync => ({
  omitida: false,
  sincronizadas: 0,
  clientesSincronizados: 0,
  productosSincronizados: 0,
  conflictos: 0,
  errores: 0,
  pendientes: 0,
  ajenas: 0,
  interrumpida: false,
});

type TipoRegistro = 'venta' | 'cliente' | 'producto';

type Fallo =
  | { tipo: 'CONFLICTO'; detalle: unknown }
  | { tipo: 'YA_EXISTE' }
  | { tipo: 'DEFINITIVO'; mensaje: string }
  | { tipo: 'REINTENTAR'; mensaje: string; interrumpe?: MotivoInterrupcion };

/** Decides what a failed request means for the record. */
export function clasificar(err: any, tipo: TipoRegistro = 'venta'): Fallo {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;
  const texto = (Array.isArray(data?.message) ? data.message.join(' ') : data?.message) || err?.message || 'Error desconocido';

  if (status === undefined) return { tipo: 'REINTENTAR', mensaje: texto, interrumpe: 'RED' };
  if (status === 409) {
    if (tipo === 'venta' && data?.codigo === 'STOCK_CONFLICT') return { tipo: 'CONFLICTO', detalle: data.items ?? [] };
    if (tipo === 'cliente' && data?.codigo === 'CLIENTE_DUPLICADO') return { tipo: 'CONFLICTO', detalle: data.existente };
    if (tipo === 'producto' && data?.codigo === 'SKU_DUPLICADO') return { tipo: 'CONFLICTO', detalle: data.items ?? [] };
    // The product id is already stored (its idempotency record was purged): the product exists, nothing to resend
    if (tipo === 'producto' && data?.codigo === 'PRODUCTO_EXISTENTE') return { tipo: 'YA_EXISTE' };
  }
  // 409 without a known code: the same key is still being processed by another request
  if (status === 409 || status === 408 || status === 429) return { tipo: 'REINTENTAR', mensaje: texto };
  if (status === 401) return { tipo: 'REINTENTAR', mensaje: 'La sesión expiró. Inicia sesión para sincronizar.', interrumpe: 'SESION' };
  if (status >= 500) return { tipo: 'REINTENTAR', mensaje: texto, interrumpe: 'SERVIDOR' };
  // 403 LIMITE_PLAN, 400, 422 and the rest: retrying will not fix it, the user has to read the message
  return { tipo: 'DEFINITIVO', mensaje: texto };
}

/** What differs between the three kinds of record; the loop that sends them is the same. */
interface Cola<T extends RegistroCola> {
  tipo: TipoRegistro;
  pendientes: T[];
  marcarSincronizando: (id: string) => Promise<unknown>;
  enviar: (r: T) => Promise<unknown>;
  alExito: (r: T, respuesta: any) => Promise<void>;
  marcarConflicto: (id: string, detalle: any) => Promise<unknown>;
  marcarError: (id: string, mensaje: string) => Promise<unknown>;
  volverACola: (id: string, mensaje?: string) => Promise<unknown>;
}

/** Sends the records of one queue in order. Returns false when the whole run has to stop. */
async function vaciar<T extends RegistroCola>(cola: Cola<T>, resultado: ResultadoSync): Promise<boolean> {
  for (const registro of cola.pendientes) {
    await cola.marcarSincronizando(registro.id);
    try {
      const respuesta = await cola.enviar(registro);
      await cola.alExito(registro, respuesta);
    } catch (err) {
      const fallo = clasificar(err, cola.tipo);
      if (fallo.tipo === 'YA_EXISTE') {
        await cola.alExito(registro, undefined);
      } else if (fallo.tipo === 'CONFLICTO') {
        await cola.marcarConflicto(registro.id, fallo.detalle);
        resultado.conflictos += 1;
      } else if (fallo.tipo === 'DEFINITIVO') {
        await cola.marcarError(registro.id, fallo.mensaje);
        resultado.errores += 1;
      } else {
        await cola.volverACola(registro.id, fallo.mensaje);
        if (fallo.interrumpe) {
          // Keep the order of the queue and do not hammer a server or a network that is down
          resultado.interrumpida = true;
          resultado.motivo = fallo.interrumpe;
          return false;
        }
      }
    }
  }
  return true;
}

async function correr(sesion: SesionVendedor, enviar: EnviarVenta, enviadores: Enviadores): Promise<ResultadoSync> {
  const resultado = vacio();
  await Promise.all([recuperarInterrumpidas(), recuperarClientesInterrumpidos(), recuperarProductosInterrumpidos()]);

  const suyo = <T extends RegistroCola>(lista: T[]) => lista.filter((r) => r.usuarioId === sesion.usuarioId);
  const pendientesDe = <T extends RegistroCola>(lista: T[]) => suyo(lista).filter((r) => r.estado === 'PENDIENTE');

  // 1. customers (a sale may point at them), 2. products (a sale may sell them), 3. sales
  let sigue = true;
  if (enviadores.cliente) {
    const enviarCliente = enviadores.cliente;
    sigue = await vaciar<ClienteLocal>(
      {
        tipo: 'cliente',
        pendientes: pendientesDe(await listarClientes(sesion.tenantId)),
        marcarSincronizando: marcarClienteSincronizando,
        enviar: enviarCliente,
        alExito: async (c) => {
          await marcarClienteSincronizado(c.id);
          resultado.clientesSincronizados += 1;
        },
        marcarConflicto: (id, existente: ClienteExistente) => marcarClienteConflicto(id, existente),
        marcarError: marcarClienteError,
        volverACola: volverClienteACola,
      },
      resultado,
    );
  }

  if (sigue && enviadores.producto) {
    const enviarProducto = enviadores.producto;
    sigue = await vaciar<ProductoLocal>(
      {
        tipo: 'producto',
        pendientes: pendientesDe(await listarProductosLocales(sesion.tenantId)),
        marcarSincronizando: marcarProductoSincronizando,
        enviar: enviarProducto,
        alExito: async (p) => {
          await marcarProductoSincronizado(p.id);
          resultado.productosSincronizados += 1;
        },
        marcarConflicto: (id, items: SkuDuplicado[]) => marcarProductoConflicto(id, items),
        marcarError: marcarProductoError,
        volverACola: volverProductoACola,
      },
      resultado,
    );
  }

  const todas = await listarVentas(sesion.tenantId);
  resultado.ajenas = todas.length - suyo(todas).length;
  if (sigue) {
    await vaciar<VentaLocal>(
      {
        tipo: 'venta',
        pendientes: pendientesDe(todas),
        marcarSincronizando,
        enviar,
        alExito: async (v, orden: OrdenRegistrada | undefined) => {
          await marcarSincronizada(v.id, { ordenId: orden?.ordenId ?? '', ordenNro: orden?.nroOrden ?? '' });
          resultado.sincronizadas += 1;
          const fusion = orden?.clienteFusionado;
          if (fusion && fusion.de !== fusion.a) {
            await remapearCliente(sesion.tenantId, fusion.de, { id: fusion.a, nombre: orden?.clienteNombre ?? v.clienteNombre ?? '' });
          }
        },
        marcarConflicto: (id, items: ConflictoItem[]) => marcarConflicto(id, items),
        marcarError,
        volverACola,
      },
      resultado,
    );
  }

  const [v, c, p] = await Promise.all([listarVentas(sesion.tenantId), listarClientes(sesion.tenantId), listarProductosLocales(sesion.tenantId)]);
  resultado.pendientes = [...v, ...c, ...p].filter((r) => r.usuarioId === sesion.usuarioId && r.estado === 'PENDIENTE').length;
  return resultado;
}

let enCursoEnEstaPestana = false;

/**
 * Sends the pending customers, then products, then sales of the active store and user, one at a time and in order.
 * Only one sync runs at a time, across tabs when the browser has Web Locks.
 */
export async function sincronizar(sesion: SesionVendedor, enviar: EnviarVenta, enviadores: Enviadores = {}): Promise<ResultadoSync> {
  if (enCursoEnEstaPestana) return { ...vacio(), omitida: true };
  enCursoEnEstaPestana = true;
  try {
    const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined;
    if (locks?.request) {
      const resultado = await locks.request('aura-pos-sync', { ifAvailable: true }, async (lock: unknown) =>
        lock ? correr(sesion, enviar, enviadores) : { ...vacio(), omitida: true },
      );
      return resultado as ResultadoSync;
    }
    return await correr(sesion, enviar, enviadores);
  } finally {
    enCursoEnEstaPestana = false;
  }
}

/** Milliseconds to wait before the next automatic attempt after `fallosSeguidos` failed runs: 5s doubling up to 60s. */
export function esperaReintento(fallosSeguidos: number): number {
  return Math.min(5000 * 2 ** Math.max(0, fallosSeguidos), 60000);
}
