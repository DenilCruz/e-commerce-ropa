import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Plus, Store, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/auth.store';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { authApi } from '../../autenticacion/services/auth.api';
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

interface StoreSwitcherProps {
  variant?: 'navbar' | 'sidebar';
}

export const StoreSwitcher: React.FC<StoreSwitcherProps> = ({ variant = 'navbar' }) => {
  const { user, setAuth } = useAuthStore();
  const [abierto, setAbierto] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sinVerificar, setSinVerificar] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; enlace?: string } | null>(null);
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

  // En "Mis Tiendas" solo deben aparecer las tiendas que el usuario gestiona/administra
  const tiendasGestionables = tiendas.filter((t) => t.rol !== 'CLIENTE');

  // Si no administra ninguna tienda, no se muestra el selector de comerciante
  if (tiendasGestionables.length === 0) return null;

  const activa = tiendasGestionables.find((t) => t.esActiva) || tiendasGestionables[0];

  /** Stores the new session and reloads, so no data of the previous store stays in memory or in the cart. */
  const aplicarSesion = (sesion: SesionTiendaResponse, destino: string, fallbackSlug?: string) => {
    setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.setItem('tenant_slug', sesion.tienda?.slug || fallbackSlug || 'aura');
    window.location.assign(destino);
  };

  const cambiarDeTienda = async (tienda: MiTienda) => {
    if (tienda.esActiva) {
      setAbierto(false);
      return;
    }
    try {
      aplicarSesion(await tiendasApi.seleccionar(tienda.id), '/admin', tienda.slug);
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
    } catch (err: any) {
      setError(mensajeDeError(err));
      setSinVerificar(err?.response?.status === 403);
      setEnviando(false);
    }
  };

  const reenviarVerificacion = async () => {
    setReenviando(true);
    setAviso(null);
    try {
      const res = await authApi.reenviarVerificacion();
      setError(null);
      setAviso({ texto: res.message, enlace: res.enlaceVerificacion });
    } catch (err) {
      setAviso(null);
      setError(mensajeDeError(err));
    } finally {
      setReenviando(false);
    }
  };

  const esSidebar = variant === 'sidebar';

  return (
    <div className={`relative ${esSidebar ? 'w-full' : ''}`} ref={contenedor}>
      {esSidebar ? (
        <button
          onClick={() => setAbierto(!abierto)}
          className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-[#211E1B] hover:bg-[#2A2723] border border-[#2E2A25] transition-all text-left group cursor-pointer"
          title="Cambiar de tienda activa"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-[#9B7B54] text-white flex items-center justify-center font-serif font-bold text-xs shrink-0 shadow-xs">
              {(activa?.nombre || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white tracking-wide truncate group-hover:text-[#C5A781] transition-colors">
                {activa?.nombre || 'Mi tienda'}
              </div>
              <div className="text-[10px] text-stone-400 font-mono tracking-wider truncate">
                {ETIQUETA_PLAN[activa?.plan] || activa?.plan || 'Plan'}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-400 group-hover:text-white transition-transform shrink-0 ${
              abierto ? 'rotate-180' : ''
            }`}
          />
        </button>
      ) : (
        <button
          onClick={() => setAbierto(!abierto)}
          className="flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-900 transition-colors py-1 cursor-pointer"
          title="Cambiar de tienda"
        >
          <Store className="w-4 h-4" />
          <span className="font-medium hidden md:inline tracking-wide max-w-[140px] truncate">
            {activa?.nombre || 'Mi tienda'}
          </span>
          <ChevronDown className="w-3 h-3" />
        </button>
      )}

      {abierto && (
        <div
          className={`absolute mt-2 bg-white border border-[#E7E1D7] shadow-2xl z-50 rounded-lg overflow-hidden ${
            esSidebar ? 'left-0 w-full min-w-[220px]' : 'right-0 w-72'
          }`}
        >
          <div className="px-3.5 py-2 text-[10px] uppercase tracking-widest text-stone-500 border-b border-[#E7E1D7] flex items-center justify-between bg-[#FAF8F5]">
            <span className="font-semibold">Mis tiendas</span>
            {activa && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(`${window.location.origin}/t/${activa.slug}`);
                  toast.success(`Enlace de ${activa.nombre} copiado al portapapeles`);
                }}
                className="text-[#9B7B54] hover:text-stone-900 flex items-center gap-1 font-semibold normal-case text-[10px] cursor-pointer"
                title="Copiar link para tus clientes"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar link</span>
              </button>
            )}
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-[#E7E1D7]/40">
            {tiendasGestionables.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => cambiarDeTienda(t)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                    t.esActiva ? 'bg-[#FAF8F5]' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span
                      className={`block text-xs truncate ${
                        t.esActiva ? 'text-stone-900 font-bold' : 'text-stone-700 font-medium'
                      }`}
                    >
                      {t.nombre}
                    </span>
                    <span className="block text-[10px] text-stone-500 font-mono">
                      {ETIQUETA_ROL[t.rol] || t.rol} · {ETIQUETA_PLAN[t.plan] || t.plan}
                    </span>
                  </span>
                  {t.esActiva && <Check className="w-3.5 h-3.5 text-[#9B7B54] shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          {error && !modalCrear && <p className="px-3 py-1.5 text-xs text-red-600">{error}</p>}
          <button
            onClick={() => {
              setAbierto(false);
              setError(null);
              setModalCrear(true);
            }}
            className="w-full flex items-center gap-1.5 px-3.5 py-2.5 text-[10px] uppercase tracking-widest text-[#9B7B54] font-bold border-t border-[#E7E1D7] hover:bg-[#FAF8F5] transition-colors bg-white cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Crear una tienda</span>
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
          {sinVerificar && (
            <div className="space-y-2 rounded-lg border border-[#E7E1D7] bg-[#FAF8F5] p-3">
              <p className="text-sm text-stone-700">
                Para crear una tienda necesitamos confirmar que tu correo es real. Te enviamos un enlace de verificación.
              </p>
              <Button type="button" variant="outline" onClick={reenviarVerificacion} disabled={reenviando}>
                {reenviando ? 'Enviando…' : 'Enviar correo de verificación'}
              </Button>
              {aviso && (
                <div className="space-y-1">
                  <p className="text-sm text-green-700">{aviso.texto}</p>
                  {aviso.enlace && (
                    <p className="text-xs text-stone-600">
                      Entorno de desarrollo:{' '}
                      <a href={aviso.enlace} className="underline text-[#9B7B54]">
                        abrir el enlace de verificación
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
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
