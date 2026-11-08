import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { getImageUrl } from '../../../lib/utils';
import { useAuthStore } from '../../../store/auth.store';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { planesApi } from '../../tiendas/services/planes.api';
import { ClienteLocal, ClienteVenta, ProductoLocal, VarianteCatalogo, VentaLocal } from '../types';
import { enviarVentaPorApi } from '../services/enviarVenta';
import { enviarClientePorApi } from '../services/enviarCliente';
import { enviarProductoPorApi } from '../services/enviarProducto';
import { listarClientesDelServidor } from '../services/clientesApi';
import {
  NuevoClienteLocal,
  archivarClientesSincronizados,
  cancelarCliente,
  crearCliente,
  guardarClientes,
  listarClientes,
  reintentarCliente,
  usarClienteExistente,
} from '../services/clientesLocales';
import {
  NuevoProductoLocal,
  borrarProductosSincronizados,
  cambiarSkuYReintentar,
  cancelarProducto,
  crearProductoLocal,
  listarProductosLocales,
  reintentarProducto,
} from '../services/productosLocales';
import { precargarImagenes } from '../services/imagenes';
import { leerSesion } from '../services/sesion';
import { ajustarAlDisponible } from '../services/conflictos';
import { CatalogoVencidoError, RETENCION_DIAS, catalogoVencido, guardarRetencionDias, leerRetencionDias } from '../services/retencion';
import { esperaReintento, sincronizar } from '../services/sincronizador';
import {
  LineaVenta,
  StockLocalInsuficienteError,
  borrarSincronizadas,
  cancelarVenta,
  crearVenta,
  guardarCatalogo,
  leerActualizacionCatalogo,
  leerCatalogo,
  listarVentas,
  reemplazarItems,
  reintentarVenta,
} from '../services/ventasLocales';

const MENSAJE_INTERRUPCION = {
  RED: 'Sin conexión con el servidor. Las ventas siguen guardadas y se enviarán solas.',
  SERVIDOR: 'El servidor no respondió. Las ventas siguen guardadas y se reintentará solo.',
  SESION: 'Tu sesión expiró. Inicia sesión de nuevo para enviar las ventas guardadas.',
} as const;

export function useVentasPos() {
  const token = useAuthStore((s) => s.accessToken);
  const sesion = useMemo(() => leerSesion(token), [token]);
  const { isOnline } = useNetworkStatus();

  const [catalogo, setCatalogo] = useState<VarianteCatalogo[]>([]);
  const [ventas, setVentas] = useState<VentaLocal[]>([]);
  const [clientes, setClientes] = useState<ClienteLocal[]>([]);
  const [productos, setProductos] = useState<ProductoLocal[]>([]);
  const [retencionDias, setRetencionDias] = useState<number>(RETENCION_DIAS);
  const [sincronizando, setSincronizando] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [ronda, setRonda] = useState(0);
  const fallosSeguidos = useRef(0);

  const recargar = useCallback(async () => {
    if (!sesion) return;
    const [c, v, fecha, cl, pr, dias] = await Promise.all([
      leerCatalogo(sesion.tenantId),
      listarVentas(sesion.tenantId),
      leerActualizacionCatalogo(sesion.tenantId),
      listarClientes(sesion.tenantId),
      listarProductosLocales(sesion.tenantId),
      leerRetencionDias(sesion.tenantId),
    ]);
    setCatalogo(c);
    setVentas(v);
    setActualizadoEn(fecha);
    setClientes(cl);
    setProductos(pr);
    setRetencionDias(dias);
  }, [sesion]);

  const refrescarCatalogo = useCallback(async () => {
    if (!sesion || !navigator.onLine) return;
    try {
      const { data } = await api.get('/productos');
      const lista = Array.isArray(data) ? data : data?.data;
      if (!Array.isArray(lista)) return;
      await guardarCatalogo(sesion.tenantId, lista);
      await recargar();
      // Photos are not needed to sell, so they download in the background
      void precargarImagenes(
        lista.flatMap((p: any) => {
          const principal = p.imagenes?.find((i: any) => i.principal || i.esPrincipal) ?? p.imagenes?.[0];
          return principal ? [getImageUrl(principal.url)] : [];
        }),
      );
    } catch {
      /* offline or server down: keep working from the last snapshot */
    }
  }, [sesion, recargar]);

  /** Customer list and the store's retention setting, renewed whenever there is a connection. */
  const refrescarClientes = useCallback(async () => {
    if (!sesion || !navigator.onLine) return;
    try {
      await guardarClientes(sesion.tenantId, await listarClientesDelServidor(200));
      await recargar();
    } catch {
      /* offline or server down: the cached list stays */
    }
  }, [sesion, recargar]);

  const refrescarRetencion = useCallback(async () => {
    if (!sesion || !navigator.onLine) return;
    try {
      const { retencionOfflineDias } = await planesApi.obtenerConsumoYLimites();
      if (typeof retencionOfflineDias === 'number' && retencionOfflineDias > 0) {
        await guardarRetencionDias(sesion.tenantId, retencionOfflineDias);
        setRetencionDias(retencionOfflineDias);
      }
    } catch {
      /* offline, or a role without access to the plan: keep the saved value */
    }
  }, [sesion]);

  const sincronizarAhora = useCallback(
    async (manual = false) => {
      if (!sesion) return;
      setSincronizando(true);
      try {
        const r = await sincronizar(sesion, enviarVentaPorApi, { cliente: enviarClientePorApi, producto: enviarProductoPorApi });
        if (r.omitida) return;
        fallosSeguidos.current = r.interrumpida || r.pendientes > 0 ? fallosSeguidos.current + 1 : 0;
        await recargar();
        if (r.clientesSincronizados) toast.success(`${r.clientesSincronizados} cliente(s) sincronizado(s) con el servidor.`);
        if (r.productosSincronizados) toast.success(`${r.productosSincronizados} producto(s) sincronizado(s) con el servidor.`);
        if (r.sincronizadas) toast.success(`${r.sincronizadas} venta(s) sincronizada(s) con el servidor.`);
        if (r.conflictos) toast.warning(`${r.conflictos} registro(s) en conflicto. Revísalos en la cola.`);
        if (r.errores) toast.error(`${r.errores} registro(s) fueron rechazados por el servidor. Revísalos en la cola.`);
        if (r.interrumpida && manual && r.motivo) toast.error(MENSAJE_INTERRUPCION[r.motivo]);
        if (r.sincronizadas || r.conflictos || r.productosSincronizados) await refrescarCatalogo();
        if (r.clientesSincronizados) await refrescarClientes();
      } finally {
        setSincronizando(false);
        setRonda((n) => n + 1);
      }
    },
    [sesion, recargar, refrescarCatalogo, refrescarClientes],
  );

  const enCola = (e: string) => e === 'PENDIENTE' || e === 'SINCRONIZANDO';
  const pendientes =
    ventas.filter((v) => enCola(v.estado)).length +
    clientes.filter((c) => enCola(c.estado)).length +
    productos.filter((p) => enCola(p.estado)).length;

  // First load: what is on the device, then the server snapshot if there is a connection
  useEffect(() => {
    if (!sesion) return;
    void recargar();
  }, [sesion, recargar]);

  // Back online with nothing queued: renew the snapshot (with sales queued, the sync does it afterwards)
  useEffect(() => {
    if (isOnline && sesion) {
      void refrescarRetencion();
      void refrescarClientes();
      if (pendientes === 0) void refrescarCatalogo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, sesion]);

  // Send the queue as soon as there is a connection, backing off while it keeps failing
  useEffect(() => {
    if (!isOnline || !sesion || sincronizando || pendientes === 0) return;
    const espera = fallosSeguidos.current === 0 ? 0 : esperaReintento(fallosSeguidos.current - 1);
    const timer = window.setTimeout(() => void sincronizarAhora(false), espera);
    return () => window.clearTimeout(timer);
  }, [isOnline, sesion, sincronizando, pendientes, ronda, sincronizarAhora]);

  const vender = useCallback(
    async (items: LineaVenta[], clienteNombre?: string, notas?: string, cliente?: ClienteVenta) => {
      if (!sesion) throw new Error('No hay una sesión de vendedor activa.');
      // Online the snapshot is renewed on its own; offline an expired one is stock data nobody can trust
      if (!isOnline && catalogoVencido(actualizadoEn, Date.now(), retencionDias)) throw new CatalogoVencidoError(retencionDias);
      fallosSeguidos.current = 0;
      const venta = await crearVenta({ ...sesion, items, clienteNombre, cliente, notas });
      await recargar();
      setRonda((n) => n + 1);
      return venta;
    },
    [sesion, recargar, isOnline, actualizadoEn, retencionDias],
  );

  const accion = useCallback(
    async (fn: () => Promise<unknown>) => {
      await fn();
      fallosSeguidos.current = 0;
      await recargar();
      setRonda((n) => n + 1);
    },
    [recargar],
  );

  return {
    sesion,
    isOnline,
    catalogo,
    ventas,
    clientes,
    productos,
    retencionDias,
    pendientes,
    sincronizando,
    actualizadoEn,
    vender,
    sincronizarAhora: () => sincronizarAhora(true),
    refrescarCatalogo,
    cancelar: (id: string) => accion(() => cancelarVenta(id)),
    reintentar: (id: string) => accion(() => reintentarVenta(id)),
    ajustar: (venta: VentaLocal) => accion(() => reemplazarItems(venta.id, ajustarAlDisponible(venta))),
    limpiarSincronizadas: () =>
      accion(async () => {
        if (!sesion) return;
        await Promise.all([borrarSincronizadas(sesion.tenantId), archivarClientesSincronizados(sesion.tenantId), borrarProductosSincronizados(sesion.tenantId)]);
      }),
    registrarCliente: async (datos: Omit<NuevoClienteLocal, 'tenantId' | 'usuarioId'>) => {
      if (!sesion) throw new Error('No hay una sesión de vendedor activa.');
      const cliente = await crearCliente({ ...sesion, ...datos });
      fallosSeguidos.current = 0;
      await recargar();
      setRonda((n) => n + 1);
      return cliente;
    },
    crearProductoRapido: async (datos: Omit<NuevoProductoLocal, 'tenantId' | 'usuarioId'>) => {
      if (!sesion) throw new Error('No hay una sesión de vendedor activa.');
      const producto = await crearProductoLocal({ ...sesion, ...datos });
      fallosSeguidos.current = 0;
      await recargar();
      setRonda((n) => n + 1);
      return producto;
    },
    reintentarCliente: (id: string) => accion(() => reintentarCliente(id)),
    cancelarCliente: (id: string) => accion(() => cancelarCliente(id)),
    usarClienteExistente: (id: string) => accion(() => usarClienteExistente(id)),
    reintentarProducto: (id: string) => accion(() => reintentarProducto(id)),
    cancelarProducto: (id: string) => accion(() => cancelarProducto(id)),
    cambiarSku: (id: string, varianteId: string, sku: string) => accion(() => cambiarSkuYReintentar(id, varianteId, sku)),
    guardarRetencion: async (dias: number) => {
      const { retencionOfflineDias } = await planesApi.actualizarConfigOffline(dias);
      if (sesion) await guardarRetencionDias(sesion.tenantId, retencionOfflineDias);
      setRetencionDias(retencionOfflineDias);
      return retencionOfflineDias;
    },
  };
}

export { CatalogoVencidoError, StockLocalInsuficienteError };
