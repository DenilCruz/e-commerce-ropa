import React from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { useNotificaciones } from '../hooks/useNotificaciones';

const boton =
  'inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50';

export const BotonNotificaciones: React.FC = () => {
  const { estado, trabajando, activar, desactivar, probar } = useNotificaciones();

  const alActivar = async () => {
    try {
      await activar();
    } catch {
      toast.error('No se pudieron activar las notificaciones. Revisa la conexión e inténtalo de nuevo.');
    }
  };

  const alProbar = async () => {
    try {
      const n = await probar();
      toast[n > 0 ? 'success' : 'warning'](n > 0 ? 'Notificación de prueba enviada.' : 'No hay navegadores suscritos que reciban la prueba.');
    } catch {
      toast.error('No se pudo enviar la prueba.');
    }
  };

  if (estado === 'NO_SOPORTADO') {
    return <p className="text-xs text-gray-500">Este navegador no admite notificaciones.</p>;
  }
  if (estado === 'SIN_CONFIGURAR') {
    return <p className="text-xs text-gray-500">Notificaciones sin configurar en el servidor (faltan las claves VAPID).</p>;
  }
  if (estado === 'BLOQUEADO') {
    return (
      <p className="inline-flex items-center gap-2 text-xs text-amber-800">
        <BellOff className="h-4 w-4" aria-hidden />
        Notificaciones bloqueadas en el navegador. Permítelas desde el candado de la barra de direcciones.
      </p>
    );
  }
  if (estado === 'ACTIVAS') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
          <BellRing className="h-4 w-4" aria-hidden />
          Notificaciones activas
        </span>
        <button type="button" onClick={alProbar} className={cn(boton, 'border-gray-200 text-gray-700 hover:bg-gray-100')}>
          Enviar prueba
        </button>
        <button type="button" onClick={desactivar} disabled={trabajando} className={cn(boton, 'border-gray-200 text-gray-600 hover:bg-gray-100')}>
          Desactivar
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={alActivar} disabled={trabajando} className={cn(boton, 'border-gray-200 text-gray-700 hover:bg-gray-100')}>
      <Bell className="h-4 w-4" aria-hidden />
      Activar notificaciones
    </button>
  );
};
