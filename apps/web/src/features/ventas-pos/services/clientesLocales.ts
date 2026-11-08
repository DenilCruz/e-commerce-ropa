import { ClienteExistente, ClienteLocal, ClienteVenta, VentaLocal } from '../types';
import {
  listarDe,
  marcarConflictoEn,
  marcarErrorEn,
  marcarSincronizadaEn,
  marcarSincronizandoEn,
  recuperarInterrumpidasEn,
  reintentarEn,
  siguienteSecuencia,
  volverAColaEn,
} from './cola';
import { STORE_CLIENTES, STORE_META, STORE_VENTAS, pedido, transaccion, uuidV4 } from './posDb';

export interface NuevoClienteLocal {
  tenantId: string;
  usuarioId: string;
  nombre: string;
  apellido?: string;
  celular?: string;
  ci?: string;
  correo?: string;
}

/** Customer as `GET /clientes-mostrador` returns it. */
export interface ClienteDelServidor {
  id: string;
  nombre: string;
  apellido?: string | null;
  celular?: string | null;
  ci?: string | null;
  correo?: string | null;
}

export class ClienteInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ClienteInvalidoError';
  }
}

const claveActualizacion = (tenantId: string) => `clientes-actualizado:${tenantId}`;
const limpio = (v?: string | null) => v?.trim() || undefined;

/** Registers a customer on this device and queues it. Works offline; its id is the id the server will store. */
export async function crearCliente(datos: NuevoClienteLocal): Promise<ClienteLocal> {
  const nombre = datos.nombre?.trim();
  if (!nombre) throw new ClienteInvalidoError('El nombre del cliente es obligatorio.');
  if (nombre.length > 80) throw new ClienteInvalidoError('El nombre admite hasta 80 caracteres.');
  const correo = limpio(datos.correo);
  if (correo && !/^\S+@\S+\.\S+$/.test(correo)) throw new ClienteInvalidoError('El correo no es válido.');

  return transaccion([STORE_CLIENTES], 'readwrite', async (tx) => {
    const cliente: ClienteLocal = {
      id: uuidV4(),
      tenantId: datos.tenantId,
      usuarioId: datos.usuarioId,
      nombre,
      apellido: limpio(datos.apellido),
      celular: limpio(datos.celular),
      ci: limpio(datos.ci),
      correo,
      origen: 'LOCAL',
      creadoEn: new Date().toISOString(),
      secuencia: await siguienteSecuencia(tx, STORE_CLIENTES),
      estado: 'PENDIENTE',
      intentos: 0,
    };
    tx.objectStore(STORE_CLIENTES).put(cliente);
    return cliente;
  });
}

export const listarClientes = (tenantId: string) => listarDe<ClienteLocal>(STORE_CLIENTES, tenantId);

/** What a sale carries about its customer. */
export const comoClienteVenta = (c: ClienteVenta): ClienteVenta => ({
  id: c.id,
  nombre: c.nombre,
  apellido: c.apellido,
  celular: c.celular,
  ci: c.ci,
  correo: c.correo,
});

/** Name shown for a customer. */
export const nombreCompleto = (c: Pick<ClienteVenta, 'nombre' | 'apellido'>) =>
  [c.nombre, c.apellido].filter(Boolean).join(' ');

/** Customers matching the text (name, last name, ci, phone), newest local ones first. */
export function filtrarClientes<T extends ClienteVenta>(clientes: T[], texto: string, max = 8): T[] {
  const q = texto.trim().toLowerCase();
  const lista = q
    ? clientes.filter((c) => `${c.nombre} ${c.apellido ?? ''} ${c.ci ?? ''} ${c.celular ?? ''}`.toLowerCase().includes(q))
    : clientes;
  return lista.slice(0, max);
}

/** Replaces the cached copy of the server list; customers still waiting in the queue are kept untouched. */
export async function guardarClientes(tenantId: string, lista: ClienteDelServidor[]): Promise<void> {
  await transaccion([STORE_CLIENTES, STORE_META], 'readwrite', async (tx) => {
    tx.objectStore(STORE_META).put({ clave: claveActualizacion(tenantId), valor: new Date().toISOString() });
    const store = tx.objectStore(STORE_CLIENTES);
    const actuales: ClienteLocal[] = await pedido(store.index('tenantId').getAll(tenantId));
    const enCola = new Set(actuales.filter((c) => c.estado !== 'SINCRONIZADA').map((c) => c.id));
    for (const c of actuales) if (c.estado === 'SINCRONIZADA' && !enCola.has(c.id)) store.delete(c.id);
    for (const s of lista) {
      if (enCola.has(s.id)) continue;
      const cliente: ClienteLocal = {
        id: s.id,
        tenantId,
        usuarioId: '',
        nombre: s.nombre,
        apellido: limpio(s.apellido),
        celular: limpio(s.celular),
        ci: limpio(s.ci),
        correo: limpio(s.correo),
        origen: 'SERVIDOR',
        creadoEn: new Date(0).toISOString(),
        secuencia: 0,
        estado: 'SINCRONIZADA',
        intentos: 0,
      };
      store.put(cliente);
    }
  });
}

export async function leerActualizacionClientes(tenantId: string): Promise<string | null> {
  const fila = await transaccion([STORE_META], 'readonly', (tx) => pedido(tx.objectStore(STORE_META).get(claveActualizacion(tenantId))));
  return fila?.valor ?? null;
}

export const marcarClienteSincronizando = (id: string) => marcarSincronizandoEn(STORE_CLIENTES, id);
export const marcarClienteSincronizado = (id: string) => marcarSincronizadaEn(STORE_CLIENTES, id);
export const marcarClienteConflicto = (id: string, existente: ClienteExistente) => marcarConflictoEn(STORE_CLIENTES, id, existente);
export const marcarClienteError = (id: string, mensaje: string) => marcarErrorEn(STORE_CLIENTES, id, mensaje);
export const volverClienteACola = (id: string, mensaje?: string) => volverAColaEn(STORE_CLIENTES, id, mensaje);
export const reintentarCliente = (id: string) => reintentarEn(STORE_CLIENTES, id);
export const recuperarClientesInterrumpidos = () => recuperarInterrumpidasEn(STORE_CLIENTES);

/**
 * Points everything on this device that used customer `de` to the customer the server already has (`a`):
 * the local record is replaced by a plain cached copy and the sales still waiting carry the right id.
 * Sales already registered are left alone; the server linked them itself.
 */
export async function remapearCliente(tenantId: string, de: string, a: ClienteExistente): Promise<void> {
  if (de === a.id) return;
  await transaccion([STORE_CLIENTES, STORE_VENTAS], 'readwrite', async (tx) => {
    const clientes = tx.objectStore(STORE_CLIENTES);
    const local: ClienteLocal | undefined = await pedido(clientes.get(de));
    clientes.delete(de);
    const yaEsta: ClienteLocal | undefined = await pedido(clientes.get(a.id));
    if (!yaEsta) {
      clientes.put({
        id: a.id,
        tenantId,
        usuarioId: '',
        nombre: a.nombre,
        apellido: undefined,
        celular: local?.celular,
        ci: a.ci ?? local?.ci ?? undefined,
        correo: local?.correo,
        origen: 'SERVIDOR',
        creadoEn: new Date(0).toISOString(),
        secuencia: 0,
        estado: 'SINCRONIZADA',
        intentos: 0,
      } satisfies ClienteLocal);
    }

    const ventas = tx.objectStore(STORE_VENTAS);
    const todas: VentaLocal[] = await pedido(ventas.index('tenantId').getAll(tenantId));
    for (const v of todas) {
      if (v.cliente?.id !== de || v.estado === 'SINCRONIZADA') continue;
      ventas.put({
        ...v,
        clienteNombre: a.nombre,
        cliente: { id: a.id, nombre: a.nombre, ci: a.ci ?? v.cliente.ci ?? undefined },
      } satisfies VentaLocal);
    }
  });
}

/** Conflict resolution "use the existing one": the pending record is dropped and its sales point to the server's. */
export async function usarClienteExistente(id: string): Promise<void> {
  const actual = await transaccion([STORE_CLIENTES], 'readonly', (tx) => pedido(tx.objectStore(STORE_CLIENTES).get(id)));
  const local = actual as ClienteLocal | undefined;
  if (!local?.conflicto) throw new Error('Este cliente no tiene un duplicado que resolver.');
  await remapearCliente(local.tenantId, id, local.conflicto);
}

/** Drops a customer that was never registered by the server. Sales that carried it keep the typed name only. */
export async function cancelarCliente(id: string): Promise<void> {
  await transaccion([STORE_CLIENTES, STORE_VENTAS], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_CLIENTES);
    const cliente: ClienteLocal | undefined = await pedido(store.get(id));
    if (!cliente) return;
    if (cliente.estado === 'SINCRONIZANDO' || cliente.estado === 'SINCRONIZADA') {
      throw new Error(`Un cliente ${cliente.estado.toLowerCase()} no se puede cancelar.`);
    }
    store.delete(id);
    // The sale still goes out: without the customer object it is a plain cash sale with the typed name
    const ventas = tx.objectStore(STORE_VENTAS);
    const todas: VentaLocal[] = await pedido(ventas.index('tenantId').getAll(cliente.tenantId));
    for (const v of todas) {
      if (v.cliente?.id === id && v.estado !== 'SINCRONIZADA') ventas.put({ ...v, cliente: undefined } satisfies VentaLocal);
    }
  });
}

/** The queue panel lists the customers made here; this hides the finished ones and keeps them as cache. */
export async function archivarClientesSincronizados(tenantId: string): Promise<number> {
  return transaccion([STORE_CLIENTES], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORE_CLIENTES);
    const filas: ClienteLocal[] = await pedido(store.index('tenantId').getAll(tenantId));
    const hechas = filas.filter((c) => c.origen === 'LOCAL' && c.estado === 'SINCRONIZADA');
    for (const c of hechas) store.put({ ...c, origen: 'SERVIDOR' } satisfies ClienteLocal);
    return hechas.length;
  });
}
