import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { Modal } from '../../../components/ui/Modal';
import { tiendasApi } from '../../tiendas/services/tiendas.api';
import { MiTienda } from '../../tiendas/types';
import { marcarEntradaATienda } from '../lib/acceso';
import { mensajeDeError } from '../services/plataforma.api';
import { ETIQUETA_PLAN } from '../lib/formato';
import { Cargando, FOCO } from './ui';

const CART_STORAGE_KEY = 'el-magnifico-cart-storage';

/** Lets the operator enter a store's admin panel (the operator sees every active store). */
export const IrATienda: React.FC = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState<string | null>(null);

  const { data: tiendas = [], isLoading } = useQuery<MiTienda[]>({
    queryKey: ['plataforma-ir-a-tienda'],
    queryFn: tiendasApi.listarMias,
    enabled: abierto,
  });

  const entrar = async (tienda: MiTienda) => {
    setError(null);
    setEntrando(tienda.id);
    try {
      const sesion = await tiendasApi.seleccionar(tienda.id);
      setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.setItem('tenant_slug', sesion.tienda?.slug || tienda.slug);
      marcarEntradaATienda(true);
      window.location.assign('/admin');
    } catch (err) {
      setError(mensajeDeError(err));
      setEntrando(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white text-stone-900 hover:bg-stone-200 ${FOCO}`}
      >
        <Store className="w-4 h-4" aria-hidden />
        Ir a una tienda
      </button>
      <Modal isOpen={abierto} onClose={() => setAbierto(false)} title="Ir a una tienda">
        <p className="text-sm text-stone-600 mb-3">Entra al panel de administración de la tienda que elijas.</p>
        {error && (
          <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </p>
        )}
        {isLoading ? (
          <Cargando />
        ) : tiendas.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">No hay tiendas activas.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y divide-stone-200 border border-stone-200 rounded-lg">
            {tiendas.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={entrando !== null}
                  onClick={() => entrar(t)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-stone-50 disabled:opacity-60 ${FOCO}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-stone-900 truncate">{t.nombre}</span>
                    <span className="block text-[11px] text-stone-500 truncate">/{t.slug}</span>
                  </span>
                  <span className="text-[11px] text-stone-500 shrink-0">
                    {entrando === t.id ? 'Entrando...' : ETIQUETA_PLAN[t.plan as keyof typeof ETIQUETA_PLAN] ?? t.plan}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
};
