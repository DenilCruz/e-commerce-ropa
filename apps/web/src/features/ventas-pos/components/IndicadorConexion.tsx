import React from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { RETENCION_DIAS, catalogoVencido } from '../services/retencion';

interface Props {
  isOnline: boolean;
  pendientes: number;
  sincronizando: boolean;
  actualizadoEn: string | null;
  onSincronizar: () => void;
}

function hace(iso: string | null): string {
  if (!iso) return 'nunca';
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  return horas < 24 ? `hace ${horas} h` : `hace ${Math.round(horas / 24)} d`;
}

export const IndicadorConexion: React.FC<Props> = ({ isOnline, pendientes, sincronizando, actualizadoEn, onSincronizar }) => (
  <div className="flex flex-wrap items-center gap-3">
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
        isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900',
      )}
    >
      {isOnline ? <Cloud className="h-4 w-4" aria-hidden /> : <CloudOff className="h-4 w-4" aria-hidden />}
      {isOnline ? 'En línea' : 'Sin conexión'}
      {pendientes > 0 && (
        <span className="ml-1 rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
          {pendientes} por enviar
        </span>
      )}
    </div>
    <p className={cn('text-xs', catalogoVencido(actualizadoEn) ? 'font-medium text-amber-800' : 'text-gray-500')}>
      Catálogo guardado en este equipo: <span className="font-medium">{hace(actualizadoEn)}</span>
      {catalogoVencido(actualizadoEn) && actualizadoEn
        ? ` (vencido: se conserva hasta ${RETENCION_DIAS} día(s); conéctate para renovarlo)`
        : ''}
    </p>
    <button
      type="button"
      onClick={onSincronizar}
      disabled={!isOnline || sincronizando}
      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RefreshCw className={cn('h-4 w-4', sincronizando && 'animate-spin')} aria-hidden />
      {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
    </button>
  </div>
);
