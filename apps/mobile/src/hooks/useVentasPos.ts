import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { useNetworkStore } from '../store/network.store';
import { Db } from '../services/pos/db';
import { abrirDb } from '../services/pos/dbExpo';
import { ajustarAlDisponible } from '../services/pos/conflictos';
import { crearEnviarVenta } from '../services/pos/enviarVenta';
import { crearEnviarCliente, crearEnviarProducto } from '../services/pos/enviarCola';
import {
  ClienteCache,
  NuevoClienteLocal,
  NuevoProductoLocal,
  borrarSincronizadosRegistros,
  cambiarSkuProducto,
  cancelarClienteLocal,
  cancelarProductoLocal,
  clientesElegibles,
  crearClienteLocal,
  crearProductoLocal,
  guardarClientesCache,
  leerClientesCache,
  listarClientesLocales,
  listarProductosLocales,
  reintentarRegistro,
  usarClienteExistente,
} from '../services/pos/colasLocales';
import { RETENCION_DIAS, catalogoVencido, guardarRetencionDias, leerRetencionDias } from '../services/pos/retencion';
import { leerSesion } from '../services/pos/sesion';
import { esperaReintento, sincronizar } from '../services/pos/sincronizador';
import { ClienteLocal, ClienteVenta, ProductoLocal, VarianteCatalogo, VentaLocal } from '../services/pos/types';
import {
  LineaVenta,
  borrarSincronizadas,
  cancelarVenta,
  crearVenta,
  guardarCatalogo,
  leerActualizacionCatalogo,
  leerCatalogo,
  listarVentas,
  reemplazarItems,
  reintentarVenta,
} from '../services/pos/ventasLocales';

export const MENSAJE_INTERRUPCION = {
  RED: 'Sin conexión con el servidor. Las ventas siguen guardadas y se enviarán solas.',
  SERVIDOR: 'El servidor no respondió. Las ventas siguen guardadas y se reintentará solo.',
  SESION: 'Tu sesión expiró. Inicia sesión de nuevo para enviar las ventas guardadas.',
} as const;

export interface Aviso {
  tipo: 'ok' | 'aviso' | 'error';
  texto: string;
}

const enviarVentaPorApi = crearEnviarVenta(api);
const enviadores = { cliente: crearEnviarCliente(api), producto: crearEnviarProducto(api) };

export function useVentasPos() {
  const token = useAuthStore((s) => s.token);
  const sesion = useMemo(() => leerSesion(token), [token]);
  const isOnline = useNetworkStore((s) => s.isConnected);

  const [db, setDb] = useState<Db | null>(null);
  const [errorDb, setErrorDb] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<VarianteCatalogo[]>([]);
  const [ventas, setVentas] = useState<VentaLocal[]>([]);
  const [clientes, setClientes] = useState<ClienteLocal[]>([]);
  const [productos, setProductos] = useState<ProductoLocal[]>([]);
  const [clientesCache, setClientesCache] = useState<ClienteCache[]>([]);
  const [retencionDias, setRetencionDias] = useState(RETENCION_DIAS);
  const [sincronizando, setSincronizando] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ronda, setRonda] = useState(0);
  const fallosSeguidos = useRef(0);

  useEffect(() => {
    let vivo = true;
    abrirDb()
      .then((d) => vivo && setDb(d))
      .catch(() => vivo && setErrorDb('No se pudo abrir la base de datos local de este dispositivo.'));
    return () => {
      vivo = false;
    };
  }, []);

  const recargar = useCallback(async () => {
    if (!db || !sesion) return;
    const [c, v, a, cl, pr, cache, dias] = await Promise.all([
      leerCatalogo(db, sesion.tenantId),
      listarVentas(db, sesion.tenantId),
      leerActualizacionCatalogo(db, sesion.tenantId),
      listarClientesLocales(db, sesion.tenantId),
      listarProductosLocales(db, sesion.tenantId),
      leerClientesCache(db, sesion.tenantId),
      leerRetencionDias(db, sesion.tenantId),
    ]);
    setCatalogo(c);
    setVentas(v);
    setActualizadoEn(a);
    setClientes(cl);
    setProductos(pr);
    setClientesCache(cache);
    setRetencionDias(dias);
  }, [db, sesion]);

  const refrescarCatalogo = useCallback(async () => {
    if (!db || !sesion || !isOnline) return;
    try {
      const { data } = await api.get('/productos');
      const lista = Array.isArray(data) ? data : data?.data;
      if (Array.isArray(lista)) await guardarCatalogo(db, sesion.tenantId, lista);
    } catch {
      /* offline or server down: keep working from the last snapshot */
    }
    // The retention of the store and the customer list are kept for offline use; each one fails on its own
    try {
      const { data } = await api.get('/auth/tiendas/plan-limites');
      const limites = data?.data ?? data;
      if (limites?.retencionOfflineDias !== undefined) await guardarRetencionDias(db, sesion.tenantId, limites.retencionOfflineDias);
    } catch {
      /* the saved value (or 7 days) keeps applying */
    }
    try {
      const { data } = await api.get('/clientes-mostrador', { params: { limite: 200 } });
      const lista = Array.isArray(data) ? data : data?.data;
      if (Array.isArray(lista)) await guardarClientesCache(db, sesion.tenantId, lista);
    } catch {
      /* the last cached list keeps working */
    }
    await recargar();
  }, [db, sesion, isOnline, recargar]);

  const sincronizarAhora = useCallback(
    async (manual = false) => {
      if (!db || !sesion) return;
      setSincronizando(true);
      try {
        const r = await sincronizar(db, sesion, enviarVentaPorApi, enviadores);
        if (r.omitida) return;
        fallosSeguidos.current = r.interrumpida || r.pendientes > 0 ? fallosSeguidos.current + 1 : 0;
        await recargar();
        if (r.errores) setAviso({ tipo: 'error', texto: `${r.errores} registro(s) fueron rechazados por el servidor. Revísalos en la cola.` });
        else if (r.conflictos) setAviso({ tipo: 'aviso', texto: `${r.conflictos} registro(s) en conflicto (stock, SKU o cliente repetido). Revísalos en la cola.` });
        else if (r.interrumpida && manual && r.motivo) setAviso({ tipo: 'error', texto: MENSAJE_INTERRUPCION[r.motivo] });
        else if (r.sincronizadas) setAviso({ tipo: 'ok', texto: `${r.sincronizadas} registro(s) sincronizado(s) con el servidor.` });
        if (r.sincronizadas || r.conflictos) await refrescarCatalogo();
      } finally {
        setSincronizando(false);
        setRonda((n) => n + 1);
      }
    },
    [db, sesion, recargar, refrescarCatalogo],
  );

  const porEnviar = (r: { estado: string }) => r.estado === 'PENDIENTE' || r.estado === 'SINCRONIZANDO';
  const pendientes = ventas.filter(porEnviar).length + clientes.filter(porEnviar).length + productos.filter(porEnviar).length;

  // First load: what is on the device
  useEffect(() => {
    void recargar();
  }, [recargar]);

  // Back online with nothing queued: renew the snapshot (with sales queued, the sync does it afterwards)
  useEffect(() => {
    if (db && isOnline && sesion && pendientes === 0) void refrescarCatalogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, isOnline, sesion]);

  // Send the queue as soon as there is a connection, backing off while it keeps failing
  useEffect(() => {
    if (!db || !isOnline || !sesion || sincronizando || pendientes === 0) return;
    const espera = fallosSeguidos.current === 0 ? 0 : esperaReintento(fallosSeguidos.current - 1);
    const timer = setTimeout(() => void sincronizarAhora(false), espera);
    return () => clearTimeout(timer);
  }, [db, isOnline, sesion, sincronizando, pendientes, ronda, sincronizarAhora]);

  const vender = useCallback(
    async (items: LineaVenta[], clienteNombre?: string, notas?: string, cliente?: ClienteVenta) => {
      if (!db || !sesion) throw new Error('No hay una sesión de vendedor activa.');
      fallosSeguidos.current = 0;
      const venta = await crearVenta(db, { ...sesion, items, clienteNombre, notas, cliente }, { enLinea: isOnline });
      await recargar();
      setRonda((n) => n + 1);
      return venta;
    },
    [db, sesion, isOnline, recargar],
  );

  const accion = useCallback(
    async (fn: (d: Db) => Promise<unknown>) => {
      if (!db) return;
      await fn(db);
      fallosSeguidos.current = 0;
      await recargar();
      setRonda((n) => n + 1);
    },
    [db, recargar],
  );

  return {
    sesion,
    listo: db !== null,
    errorDb,
    isOnline,
    catalogo,
    ventas,
    pendientes,
    sincronizando,
    actualizadoEn,
    /** Offline with a snapshot past the retention limit: new sales are refused until the device reconnects. */
    catalogoVencido: !isOnline && catalogo.length > 0 && catalogoVencido(actualizadoEn, new Date(), retencionDias),
    /** Days the device keeps data (store setting, 7 by default). */
    retencionDias,
    clientes,
    productos,
    /** Customers a seller can pick (server cache + registered here), filtered by the search text. */
    clientesParaElegir: (busqueda: string) => clientesElegibles(clientesCache, clientes, busqueda),
    aviso,
    descartarAviso: () => setAviso(null),
    vender,
    sincronizarAhora: () => sincronizarAhora(true),
    registrarCliente: async (datos: Omit<NuevoClienteLocal, 'tenantId' | 'usuarioId'>) => {
      if (!db || !sesion) throw new Error('No hay una sesión de vendedor activa.');
      const cliente = await crearClienteLocal(db, { ...sesion, ...datos });
      fallosSeguidos.current = 0;
      await recargar();
      setRonda((n) => n + 1);
      return cliente;
    },
    registrarProducto: async (datos: Omit<NuevoProductoLocal, 'tenantId' | 'usuarioId'>) => {
      if (!db || !sesion) throw new Error('No hay una sesión de vendedor activa.');
      const producto = await crearProductoLocal(db, { ...sesion, ...datos });
      fallosSeguidos.current = 0;
      await recargar();
      setRonda((n) => n + 1);
      return producto;
    },
    reintentarCliente: (id: string) => accion((d) => reintentarRegistro(d, 'clientes', id)),
    usarClienteExistente: (id: string) => accion((d) => usarClienteExistente(d, id)),
    cancelarCliente: (id: string) => accion((d) => cancelarClienteLocal(d, id)),
    reintentarProducto: (id: string) => accion((d) => reintentarRegistro(d, 'productos', id)),
    cambiarSkuProducto: (id: string, sku: string) => accion((d) => cambiarSkuProducto(d, id, sku)),
    cancelarProducto: (id: string) => accion((d) => cancelarProductoLocal(d, id)),
    cancelar: (id: string) => accion((d) => cancelarVenta(d, id)),
    reintentar: (id: string) => accion((d) => reintentarVenta(d, id)),
    ajustar: (venta: VentaLocal) => accion((d) => reemplazarItems(d, venta.id, ajustarAlDisponible(venta))),
    limpiarSincronizadas: () =>
      accion(async (d) => {
        if (!sesion) return;
        await borrarSincronizadas(d, sesion.tenantId);
        await borrarSincronizadosRegistros(d, 'clientes', sesion.tenantId);
        await borrarSincronizadosRegistros(d, 'productos', sesion.tenantId);
      }),
    /** ADMIN: PATCH /auth/tiendas/mi-config-offline and keep the value for offline use. */
    guardarRetencion: async (dias: number) => {
      if (!db || !sesion) throw new Error('No hay una sesión de vendedor activa.');
      const { data } = await api.patch('/auth/tiendas/mi-config-offline', { retencionOfflineDias: dias });
      const cuerpo = data?.data ?? data;
      const guardados = await guardarRetencionDias(db, sesion.tenantId, cuerpo?.retencionOfflineDias);
      setRetencionDias(guardados);
      return guardados;
    },
  };
}
