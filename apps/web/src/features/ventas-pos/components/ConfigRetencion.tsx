import React, { useState } from 'react';
import { RETENCION_OFFLINE_MAX, RETENCION_OFFLINE_MIN, validarDiasRetencion } from '../services/retencion';
import { botonPrimario, campo } from './ModalPos';

interface Props {
  dias: number;
  isOnline: boolean;
  onGuardar: (dias: number) => Promise<number>;
}

/** Owner control: how many days data not synced yet stays on the devices of the store. */
export const ConfigRetencion: React.FC<Props> = ({ dias, isOnline, onGuardar }) => {
  const [valor, setValor] = useState(String(Math.round(dias)));
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = validarDiasRetencion(valor);
    if (n === null) {
      setMensaje({ tipo: 'error', texto: `Escribe un número entero de ${RETENCION_OFFLINE_MIN} a ${RETENCION_OFFLINE_MAX}.` });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const guardado = await onGuardar(n);
      setValor(String(guardado));
      setMensaje({ tipo: 'ok', texto: `Listo: lo guardado sin conexión se conserva ${guardado} día(s).` });
    } catch (err: any) {
      const detalle = err?.response?.data?.message;
      setMensaje({ tipo: 'error', texto: (Array.isArray(detalle) ? detalle.join(' ') : detalle) || 'No se pudo guardar. Revisa tu conexión.' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="flex flex-wrap items-end gap-3" noValidate>
      <div>
        <label htmlFor="pos-retencion" className="mb-1 block text-xs font-bold uppercase text-stone-600">
          Días que se guarda lo guardado sin conexión
        </label>
        <input
          id="pos-retencion"
          type="number"
          inputMode="numeric"
          min={RETENCION_OFFLINE_MIN}
          max={RETENCION_OFFLINE_MAX}
          step={1}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-describedby="pos-retencion-ayuda"
          className={`${campo} w-28`}
        />
      </div>
      <button type="submit" disabled={guardando || !isOnline} className={botonPrimario}>
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
      <p id="pos-retencion-ayuda" className="basis-full text-xs text-stone-500">
        {isOnline ? `De ${RETENCION_OFFLINE_MIN} a ${RETENCION_OFFLINE_MAX} días. Aplica a todos los equipos de la tienda.` : 'Necesitas conexión para cambiar este valor.'}
      </p>
      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={mensaje.tipo === 'error' ? 'basis-full text-sm text-red-800' : 'basis-full text-sm text-emerald-800'}>
          {mensaje.texto}
        </p>
      )}
    </form>
  );
};
