import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Plus, Store } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { tiendasApi } from '../services/tiendas.api';
import { MiTienda, SesionTiendaResponse } from '../types';

const ETIQUETA_ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  CLIENTE: 'Cliente',
};

const ETIQUETA_PLAN: Record<string, string> = {
  FREE_TRIAL: 'Prueba gratis',
  ESTANDAR: 'Estándar',
  CORPORATIVO: 'Corporativo',
};

const CART_STORAGE_KEY = 'el-magnifico-cart-storage';

/** Message of a failed request, whether the API sent one text or a list of validation messages. */
const mensajeDeError = (err: any): string => {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join('. ');
  return message || 'No se pudo completar la operación. Inténtalo de nuevo.';
};

export const StoreSwitcher: React.FC = () => {
  const { user, setAuth } = useAuthStore();
  const [abierto, setAbierto] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  const { data: tiendas = [] } = useQuery<MiTienda[]>({
    queryKey: ['mis-tiendas', user?.id, user?.tenantId],
    queryFn: tiendasApi.listarMias,
    enabled: !!user,
  });

  useEffect(() => {
    const alHacerClicFuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alHacerClicFuera);
    return () => document.removeEventListener('mousedown', alHacerClicFuera);
  }, []);

  if (!user) return null;

  const activa = tiendas.find((t) => t.esActiva);

  /** Stores the new session and reloads, so no data of the previous store stays in memory or in the cart. */
  const aplicarSesion = (sesion: SesionTiendaResponse, destino: string) => {
    setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
    localStorage.removeItem(CART_STORAGE_KEY);
    window.location.assign(destino);
  };

  const cambiarDeTienda = async (tienda: MiTienda) => {
    if (tienda.esActiva) {
      setAbierto(false);
      return;
    }
    try {
      aplicarSesion(await tiendasApi.seleccionar(tienda.id), '/');
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const crearTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      aplicarSesion(await tiendasApi.crear({ nombre: nombre.trim() }), '/admin');
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-900 transition-colors py-1"
        title="Cambiar de tienda"
      >
        <Store className="w-4 h-4" />
        <span className="font-medium hidden md:inline tracking-wide max-w-[140px] truncate">
          {activa?.nombre || 'Mi tienda'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E7E1D7] shadow-lg z-50">
          <div className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-stone-500 border-b border-[#E7E1D7]">
            Mis tiendas
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {tiendas.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => cambiarDeTienda(t)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#FAF8F5] transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-stone-900 truncate">{t.nombre}</span>
                    <span className="block text-[11px] text-stone-500">
                      {ETIQUETA_ROL[t.rol] || t.rol} · {ETIQUETA_PLAN[t.plan] || t.plan}
                    </span>
                  </span>
                  {t.esActiva && <Check className="w-4 h-4 text-[#9B7B54] shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          {error && !modalCrear && <p className="px-4 py-2 text-xs text-red-600">{error}</p>}
          <button
            onClick={() => {
              setAbierto(false);
              setError(null);
              setModalCrear(true);
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest text-[#9B7B54] font-semibold border-t border-[#E7E1D7] hover:bg-[#FAF8F5] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear una tienda
          </button>
        </div>
      )}

      <Modal isOpen={modalCrear} onClose={() => setModalCrear(false)} title="Crear una tienda nueva">
        <form onSubmit={crearTienda} className="space-y-4">
          <p className="text-sm text-stone-600">
            Tu tienda empieza con el plan de prueba gratis y tú serás su administrador. Podrás cambiar entre tus tiendas
            cuando quieras usando el mismo correo.
          </p>
          <div>
            <label htmlFor="nombre-tienda" className="block text-sm font-medium text-stone-800 mb-1">
              Nombre de la tienda
            </label>
            <input
              id="nombre-tienda"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              minLength={3}
              maxLength={100}
              required
              placeholder="Moda Luna"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalCrear(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || nombre.trim().length < 3}>
              {enviando ? 'Creando…' : 'Crear tienda'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
