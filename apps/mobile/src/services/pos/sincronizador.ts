import { Db } from './db';
import { ClienteLocal, ConflictoItem, ExistenteCliente, ProductoLocal, RegistroCola, SesionVendedor, SkuDuplicado, VentaLocal } from './types';
import {
  TablaCola,
  fusionarCliente,
  listarRegistros,
  marcarConflictoRegistro,
  marcarErrorRegistro,
  marcarSincronizadoRegistro,
  marcarSincronizandoRegistro,
  recuperarInterrumpidosRegistros,
  volverAColaRegistro,
} from './colasLocales';
import {
  listarVentas,
  marcarConflicto,
  marcarError,
  marcarSincronizada,
  marcarSincronizando,
  recuperarInterrumpidas,
  volverACola,
} from './ventasLocales';

export type { SesionVendedor };

export interface OrdenRegistrada {
  ordenId: string;
  nroOrden: string;
  /** The server linked the sale to an existing customer with the same ci. */
  clienteFusionado?: { de: string; a: string };
}

/** Sends one sale to the server. It must use `venta.id` as the Idempotency-Key. */
export type EnviarVenta = (venta: VentaLocal) => Promise<OrdenRegistrada>;

/** Sends one queued customer (POST /clientes-mostrador) / product (POST /productos). Throws the axios error on failure. */
export type EnviarCliente = (cliente: ClienteLocal) => Promise<unknown>;
export type EnviarProducto = (producto: ProductoLocal) => Promise<unknown>;

export interface Enviadores {
  cliente?: EnviarCliente;
  producto?: EnviarProducto;
}

export type TipoCola = 'clientes' | 'productos' | 'ventas';

export interface DetalleCola {
  sincronizadas: number;
  conflictos: number;
  errores: number;
  pendientes: number;
}

export type MotivoInterrupcion = 'RED' | 'SERVIDOR' | 'SESION';

export interface ResultadoSync {
  /** Another sync was already running; nothing was done. */
  omitida: boolean;
  sincronizadas: number;
  conflictos: number;
  errores: number;
  /** Sales that stay in the queue to be sent again. */
  pendientes: number;
  /** Sales of another store or user that this session must not send. */
  ajenas: number;
  interrumpida: boolean;
  motivo?: MotivoInterrupcion;
  /** The same counters per queue; the totals above add them up. */
  detalle: Record<TipoCola, DetalleCola>;
}

const detalleVacio = (): DetalleCola => ({ sincronizadas: 0, conflictos: 0, errores: 0, pendientes: 0 });

const vacio = (): ResultadoSync => ({
  omitida: false, sincronizadas: 0, conflictos: 0, errores: 0, pendientes: 0, ajenas: 0, interrumpida: false,
  detalle: { clientes: detalleVacio(), productos: detalleVacio(), ventas: detalleVacio() },
});

type Fallo =
  | { tipo: 'CONFLICTO'; items: ConflictoItem[] }
  | { tipo: 'CONFLICTO_CLIENTE'; existente: ExistenteCliente }
  | { tipo: 'CONFLICTO_SKU'; items: SkuDuplicado[] }
  | { tipo: 'YA_EXISTE' }
  | { tipo: 'DEFINITIVO'; mensaje: string }
  | { tipo: 'REINTENTAR'; mensaje: string; interrumpe?: MotivoInterrupcion };

/** Decides what a failed request means for the record (same stop rules for every queue). */
function clasificar(err: any, cola: TipoCola): Fallo {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;
  const texto = (Array.isArray(data?.message) ? data.message.join(' ') : data?.message) || err?.message || 'Error desconocido';

  if (status === undefined) return { tipo: 'REINTENTAR', mensaje: texto, interrumpe: 'RED' };
  if (status === 409 && cola === 'ventas' && data?.codigo === 'STOCK_CONFLICT') return { tipo: 'CONFLICTO', items: data.items ?? [] };
  if (status === 409 && cola === 'clientes' && data?.codigo === 'CLIENTE_DUPLICADO' && data.existente) {
    return { tipo: 'CONFLICTO_CLIENTE', existente: data.existente };
  }
  if (status === 409 && cola === 'productos' && data?.codigo === 'SKU_DUPLICADO') return { tipo: 'CONFLICTO_SKU', items: data.items ?? [] };
  // The product id is already in the store without our key: an earlier attempt did create it
  if (status === 409 && cola === 'productos' && data?.codigo === 'PRODUCTO_EXISTENTE') return { tipo: 'YA_EXISTE' };
  // 409 without a known code: the same key is still being processed by another request
  if (status === 409 || status === 408 || status === 429) return { tipo: 'REINTENTAR', mensaje: texto };
  if (status === 401) return { tipo: 'REINTENTAR', mensaje: 'La sesión expiró. Inicia sesión para sincronizar.', interrumpe: 'SESION' };
  if (status >= 500) return { tipo: 'REINTENTAR', mensaje: texto, interrumpe: 'SERVIDOR' };
  if (status === 403 && data?.codigo === 'LIMITE_PLAN') {
    return { tipo: 'DEFINITIVO', mensaje: data?.message || 'Tu plan alcanzó el límite de productos. Mejora el plan para registrar más.' };
  }
  return { tipo: 'DEFINITIVO', mensaje: texto };
}

/** What a queue needs from its storage; sales and the generic queues implement it differently. */
interface Fase<T extends RegistroCola> {
  cola: TipoCola;
  recuperar(): Promise<void>;
  listar(): Promise<T[]>;
  enviar(item: T): Promise<unknown>;
  sincronizando(id: string): Promise<unknown>;
  ok(item: T, respuesta: unknown): Promise<void>;
  conflicto(id: string, fallo: Extract<Fallo, { tipo: 'CONFLICTO' | 'CONFLICTO_CLIENTE' | 'CONFLICTO_SKU' }>): Promise<unknown>;
  error(id: string, mensaje: string): Promise<unknown>;
  volver(id: string, mensaje?: string): Promise<unknown>;
}

async function correrFase<T extends RegistroCola>(fase: Fase<T>, sesion: SesionVendedor, resultado: ResultadoSync): Promise<void> {
  const d = resultado.detalle[fase.cola];
  await fase.recuperar();
  const todas = await fase.listar();
  const suyas = todas.filter((r) => r.usuarioId === sesion.usuarioId);
  resultado.ajenas += todas.length - suyas.length;

  for (const item of suyas.filter((r) => r.estado === 'PENDIENTE')) {
    await fase.sincronizando(item.id);
    try {
      await fase.ok(item, await fase.enviar(item));
      d.sincronizadas += 1;
    } catch (err) {
      const fallo = clasificar(err, fase.cola);
      if (fallo.tipo === 'YA_EXISTE') {
        await fase.ok(item, undefined);
        d.sincronizadas += 1;
      } else if (fallo.tipo === 'CONFLICTO' || fallo.tipo === 'CONFLICTO_CLIENTE' || fallo.tipo === 'CONFLICTO_SKU') {
        await fase.conflicto(item.id, fallo);
        d.conflictos += 1;
      } else if (fallo.tipo === 'DEFINITIVO') {
        await fase.error(item.id, fallo.mensaje);
        d.errores += 1;
      } else {
        await fase.volver(item.id, fallo.mensaje);
        if (fallo.interrumpe) {
          // Keep the order of the queue and do not hammer a server or a network that is down
          resultado.interrumpida = true;
          resultado.motivo = fallo.interrumpe;
          break;
        }
      }
    }
  }
  d.pendientes = (await fase.listar()).filter((r) => r.usuarioId === sesion.usuarioId && r.estado === 'PENDIENTE').length;
}

function faseGenerica<T extends RegistroCola>(
  db: Db,
  sesion: SesionVendedor,
  tabla: TablaCola,
  enviar: (item: T) => Promise<unknown>,
): Fase<T> {
  return {
    cola: tabla,
    recuperar: () => recuperarInterrumpidosRegistros(db, tabla),
    listar: () => listarRegistros<T>(db, tabla, sesion.tenantId),
    enviar,
    sincronizando: (id) => marcarSincronizandoRegistro(db, tabla, id),
    ok: async (item) => {
      await marcarSincronizadoRegistro(db, tabla, item.id);
    },
    conflicto: (id, fallo) =>
      marcarConflictoRegistro(db, tabla, id, fallo.tipo === 'CONFLICTO_CLIENTE' ? { existente: fallo.existente } : { items: (fallo as any).items }),
    error: (id, mensaje) => marcarErrorRegistro(db, tabla, id, mensaje),
    volver: (id, mensaje) => volverAColaRegistro(db, tabla, id, mensaje),
  };
}

function faseVentas(db: Db, sesion: SesionVendedor, enviar: EnviarVenta): Fase<VentaLocal> {
  return {
    cola: 'ventas',
    recuperar: () => recuperarInterrumpidas(db),
    listar: () => listarVentas(db, sesion.tenantId),
    enviar,
    sincronizando: (id) => marcarSincronizando(db, id),
    ok: async (venta, respuesta) => {
      const orden = respuesta as OrdenRegistrada;
      await marcarSincronizada(db, venta.id, { ordenId: orden.ordenId, ordenNro: orden.nroOrden });
      // The server linked the sale to an existing customer: other queued sales and the local record follow it
      if (orden.clienteFusionado) {
        await fusionarCliente(db, sesion.tenantId, orden.clienteFusionado.de, {
          id: orden.clienteFusionado.a,
          nombre: venta.cliente?.nombre ?? '',
        });
      }
    },
    conflicto: (id, fallo) => marcarConflicto(db, id, (fallo as { items: ConflictoItem[] }).items),
    error: (id, mensaje) => marcarError(db, id, mensaje),
    volver: (id, mensaje) => volverACola(db, id, mensaje),
  };
}

/** Customers first, then products, then sales, so a sale never reaches the server before what it refers to. */
async function correr(db: Db, sesion: SesionVendedor, enviar: EnviarVenta, enviadores: Enviadores): Promise<ResultadoSync> {
  const resultado = vacio();
  const fases: (() => Promise<void>)[] = [];
  if (enviadores.cliente) fases.push(() => correrFase(faseGenerica<ClienteLocal>(db, sesion, 'clientes', enviadores.cliente!), sesion, resultado));
  if (enviadores.producto) fases.push(() => correrFase(faseGenerica<ProductoLocal>(db, sesion, 'productos', enviadores.producto!), sesion, resultado));
  fases.push(() => correrFase(faseVentas(db, sesion, enviar), sesion, resultado));

  for (const fase of fases) {
    await fase();
    if (resultado.interrumpida) break; // a network, server or session failure stops the whole run
  }

  for (const d of Object.values(resultado.detalle)) {
    resultado.sincronizadas += d.sincronizadas;
    resultado.conflictos += d.conflictos;
    resultado.errores += d.errores;
    resultado.pendientes += d.pendientes;
  }
  return resultado;
}

let enCurso = false;

/**
 * Sends the pending customers, products and sales of the active store and user, one at a time and in order.
 * Only one sync runs at a time. Without `enviadores` only the sales are sent (the original behavior).
 */
export async function sincronizar(
  db: Db,
  sesion: SesionVendedor,
  enviar: EnviarVenta,
  enviadores: Enviadores = {},
): Promise<ResultadoSync> {
  if (enCurso) return { ...vacio(), omitida: true };
  enCurso = true;
  try {
    return await correr(db, sesion, enviar, enviadores);
  } finally {
    enCurso = false;
  }
}

/** Milliseconds to wait before the next automatic attempt after `fallosSeguidos` failed runs: 5s doubling up to 60s. */
export function esperaReintento(fallosSeguidos: number): number {
  return Math.min(5000 * 2 ** Math.max(0, fallosSeguidos), 60000);
}
