import { Db } from './db';
import { ConflictoItem, SesionVendedor, VentaLocal } from './types';
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
}

/** Sends one sale to the server. It must use `venta.id` as the Idempotency-Key. */
export type EnviarVenta = (venta: VentaLocal) => Promise<OrdenRegistrada>;

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
}

const vacio = (): ResultadoSync => ({
  omitida: false, sincronizadas: 0, conflictos: 0, errores: 0, pendientes: 0, ajenas: 0, interrumpida: false,
});

type Fallo =
  | { tipo: 'CONFLICTO'; items: ConflictoItem[] }
  | { tipo: 'DEFINITIVO'; mensaje: string }
  | { tipo: 'REINTENTAR'; mensaje: string; interrumpe?: MotivoInterrupcion };

/** Decides what a failed request means for the sale. */
function clasificar(err: any): Fallo {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data;
  const texto = (Array.isArray(data?.message) ? data.message.join(' ') : data?.message) || err?.message || 'Error desconocido';

  if (status === undefined) return { tipo: 'REINTENTAR', mensaje: texto, interrumpe: 'RED' };
  if (status === 409 && data?.codigo === 'STOCK_CONFLICT') return { tipo: 'CONFLICTO', items: data.items ?? [] };
  // 409 without the stock code: the same key is still being processed by another request
  if (status === 409 || status === 408 || status === 429) return { tipo: 'REINTENTAR', mensaje: texto };
  if (status === 401) return { tipo: 'REINTENTAR', mensaje: 'La sesión expiró. Inicia sesión para sincronizar.', interrumpe: 'SESION' };
  if (status >= 500) return { tipo: 'REINTENTAR', mensaje: texto, interrumpe: 'SERVIDOR' };
  return { tipo: 'DEFINITIVO', mensaje: texto };
}

async function correr(db: Db, sesion: SesionVendedor, enviar: EnviarVenta): Promise<ResultadoSync> {
  const resultado = vacio();
  await recuperarInterrumpidas(db);

  const todas = await listarVentas(db, sesion.tenantId);
  const suyas = todas.filter((v) => v.usuarioId === sesion.usuarioId);
  resultado.ajenas = todas.length - suyas.length;

  for (const venta of suyas.filter((v) => v.estado === 'PENDIENTE')) {
    await marcarSincronizando(db, venta.id);
    try {
      const orden = await enviar(venta);
      await marcarSincronizada(db, venta.id, { ordenId: orden.ordenId, ordenNro: orden.nroOrden });
      resultado.sincronizadas += 1;
    } catch (err) {
      const fallo = clasificar(err);
      if (fallo.tipo === 'CONFLICTO') {
        await marcarConflicto(db, venta.id, fallo.items);
        resultado.conflictos += 1;
      } else if (fallo.tipo === 'DEFINITIVO') {
        await marcarError(db, venta.id, fallo.mensaje);
        resultado.errores += 1;
      } else {
        await volverACola(db, venta.id, fallo.mensaje);
        if (fallo.interrumpe) {
          // Keep the order of the queue and do not hammer a server or a network that is down
          resultado.interrumpida = true;
          resultado.motivo = fallo.interrumpe;
          break;
        }
      }
    }
  }

  resultado.pendientes = (await listarVentas(db, sesion.tenantId)).filter(
    (v) => v.usuarioId === sesion.usuarioId && v.estado === 'PENDIENTE',
  ).length;
  return resultado;
}

let enCurso = false;

/** Sends the pending sales of the active store and user, one at a time and in order. Only one sync runs at a time. */
export async function sincronizar(db: Db, sesion: SesionVendedor, enviar: EnviarVenta): Promise<ResultadoSync> {
  if (enCurso) return { ...vacio(), omitida: true };
  enCurso = true;
  try {
    return await correr(db, sesion, enviar);
  } finally {
    enCurso = false;
  }
}

/** Milliseconds to wait before the next automatic attempt after `fallosSeguidos` failed runs: 5s doubling up to 60s. */
export function esperaReintento(fallosSeguidos: number): number {
  return Math.min(5000 * 2 ** Math.max(0, fallosSeguidos), 60000);
}
