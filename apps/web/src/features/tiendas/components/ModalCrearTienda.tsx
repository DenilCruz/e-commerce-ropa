import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { tiendasApi } from '../services/tiendas.api';
import { authApi } from '../../autenticacion/services/auth.api';
import { useAuthStore } from '../../../store/auth.store';
import { SesionTiendaResponse } from '../types';
import { Sparkles, Store } from 'lucide-react';

const CART_STORAGE_KEY = 'el-magnifico-cart-storage';

interface ModalCrearTiendaProps {
  isOpen: boolean;
  onClose: () => void;
  nombreInicial?: string;
}

export const ModalCrearTienda: React.FC<ModalCrearTiendaProps> = ({
  isOpen,
  onClose,
  nombreInicial = '',
}) => {
  const { setAuth } = useAuthStore();
  const [nombre, setNombre] = useState(nombreInicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinVerificar, setSinVerificar] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; enlace?: string } | null>(null);

  const aplicarSesion = (sesion: SesionTiendaResponse, destino: string) => {
    setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.setItem('tenant_slug', sesion.tienda?.slug || 'aura');
    window.location.assign(destino);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError(null);
    setEnviando(true);
    try {
      const res = await tiendasApi.crear({ nombre: nombre.trim() });
      aplicarSesion(res, '/admin');
    } catch (err: any) {
      const message = err?.response?.data?.message;
      const msg = Array.isArray(message) ? message.join('. ') : (message || 'No se pudo crear la tienda.');
      setError(msg);
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
    } catch (err: any) {
      setAviso(null);
      setError(err?.response?.data?.message || 'Error al reenviar verificación.');
    } finally {
      setReenviando(false);
    }
  };

  // Preview del slug en tiempo real
  const slugPreview = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Tu Propia Tienda de Moda">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-3.5 bg-[#FAF8F5] border border-[#E7E1D7] text-xs text-stone-700 space-y-1">
          <p className="font-semibold text-stone-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#9B7B54]" />
            <span>Plan Free Trial (14 días gratis)</span>
          </p>
          <p className="font-light">
            Tu tienda se creará de inmediato con aislamiento seguro PostgreSQL RLS. Tú serás el <strong>Administrador</strong> con control total del catálogo.
          </p>
        </div>

        <div>
          <label htmlFor="nombre-nueva-tienda" className="block text-xs font-semibold uppercase tracking-wider text-stone-800 mb-1.5">
            Nombre comercial de tu tienda
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Store className="w-4 h-4" />
            </div>
            <input
              id="nombre-nueva-tienda"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              minLength={3}
              maxLength={100}
              required
              placeholder="Ej. Boutique Paris, Moda Luna, Atelier Seda..."
              className="w-full pl-9 pr-3 py-2.5 border border-[#D5CCC0] focus:border-stone-900 focus:outline-none text-sm bg-white"
            />
          </div>
          {slugPreview && (
            <p className="mt-1.5 text-[11px] text-stone-500 font-mono">
              Enlace de tu tienda: <span className="text-[#9B7B54] font-semibold">{window.location.origin}/t/{slugPreview}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none">
            {error}
          </div>
        )}

        {sinVerificar && (
          <div className="space-y-2 border border-[#E7E1D7] bg-[#FAF8F5] p-3 text-xs">
            <p className="text-stone-700">
              Para crear una tienda necesitamos confirmar tu correo electrónico.
            </p>
            <Button type="button" variant="outline" className="text-xs py-1.5" onClick={reenviarVerificacion} disabled={reenviando}>
              {reenviando ? 'Enviando…' : 'Reenviar correo de verificación'}
            </Button>
            {aviso && (
              <div className="space-y-1">
                <p className="text-emerald-700 font-medium">{aviso.texto}</p>
                {aviso.enlace && (
                  <p className="text-stone-600">
                    Desarrollo:{' '}
                    <a href={aviso.enlace} className="underline text-[#9B7B54]">
                      activar cuenta directamente
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E7E1D7]">
          <Button type="button" variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando || nombre.trim().length < 3} className="bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs uppercase tracking-widest px-5">
            {enviando ? 'Aprovisionando Tienda…' : 'Crear Tienda'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
