import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { getImageUrl } from '../../../lib/utils';
import { useAuthStore } from '../../../store/auth.store';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { VarianteCatalogo, VentaLocal } from '../types';
import { enviarVentaPorApi } from '../services/enviarVenta';
import { precargarImagenes } from '../services/imagenes';
import { leerSesion } from '../services/sesion';
import { ajustarAlDisponible } from '../services/conflictos';
import { CatalogoVencidoError, catalogoVencido } from '../services/retencion';
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
  const [sincronizando, setSincronizando] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [ronda, setRonda] = useState(0);
  const fallosSeguidos = useRef(0);

  const recargar = useCallback(async () => {
    if (!sesion) return;
    const [c, v, fecha] = await Promise.all([
      leerCatalogo(sesion.tenantId),
      listarVentas(sesion.tenantId),
      leerActualizacionCatalogo(sesion.tenantId),
    ]);
    setCatalogo(c);
    setVentas(v);
    setActualizadoEn(fecha);
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

  const sincronizarAhora = useCallback(
    async (manual = false) => {
      if (!sesion) return;
      setSincronizando(true);
      try {
        const r = await sincronizar(sesion, enviarVentaPorApi);
        if (r.omitida) return;
        fallosSeguidos.current = r.interrumpida || r.pendientes > 0 ? fallosSeguidos.current + 1 : 0;
        await recargar();
        if (r.sincronizadas) toast.success(`${r.sincronizadas} venta(s) sincronizada(s) con el servidor.`);
        if (r.conflictos) toast.warning(`${r.conflictos} venta(s) en conflicto por falta de stock. Revísalas en la cola.`);
        if (r.errores) toast.error(`${r.errores} venta(s) fueron rechazadas por el servidor. Revísalas en la cola.`);
        if (r.interrumpida && manual && r.motivo) toast.error(MENSAJE_INTERRUPCION[r.motivo]);
        if (r.sincronizadas || r.conflictos) await refrescarCatalogo();
      } finally {
        setSincronizando(false);
        setRonda((n) => n + 1);
      }
    },
    [sesion, recargar, refrescarCatalogo],
  );

  const pendientes = ventas.filter((v) => v.estado === 'PENDIENTE' || v.estado === 'SINCRONIZANDO').length;

  // First load: what is on the device, then the server snapshot if there is a connection
  useEffect(() => {
    if (!sesion) return;
    void recargar();
  }, [sesion, recargar]);

  // Back online with nothing queued: renew the snapshot (with sales queued, the sync does it afterwards)
  useEffect(() => {
    if (isOnline && sesion && pendientes === 0) void refrescarCatalogo();
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
    async (items: LineaVenta[], clienteNombre?: string, notas?: string) => {
      if (!sesion) throw new Error('No hay una sesión de vendedor activa.');
      // Online the snapshot is renewed on its own; offline an expired one is stock data nobody can trust
      if (!isOnline && catalogoVencido(actualizadoEn)) throw new CatalogoVencidoError();
      fallosSeguidos.current = 0;
      const venta = await crearVenta({ ...sesion, items, clienteNombre, notas });
      await recargar();
      setRonda((n) => n + 1);
      return venta;
    },
    [sesion, recargar, isOnline, actualizadoEn],
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
    pendientes,
    sincronizando,
    actualizadoEn,
    vender,
    sincronizarAhora: () => sincronizarAhora(true),
    refrescarCatalogo,
    cancelar: (id: string) => accion(() => cancelarVenta(id)),
    reintentar: (id: string) => accion(() => reintentarVenta(id)),
    ajustar: (venta: VentaLocal) => accion(() => reemplazarItems(venta.id, ajustarAlDisponible(venta))),
    limpiarSincronizadas: () => accion(() => (sesion ? borrarSincronizadas(sesion.tenantId) : Promise.resolve(0))),
  };
}

export { CatalogoVencidoError, StockLocalInsuficienteError };
