import React, { useId, useMemo, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { ClienteLocal } from '../types';
import { filtrarClientes, nombreCompleto } from '../services/clientesLocales';
import { cn } from '../../../lib/utils';
import { campo, etiqueta } from './ModalPos';

interface Props {
  clientes: ClienteLocal[];
  seleccionado: ClienteLocal | null;
  onElegir: (cliente: ClienteLocal | null) => void;
  onRegistrar: () => void;
}

/** Search over the customers kept on this device (synced and still pending), so it works offline. */
export const SelectorCliente: React.FC<Props> = ({ clientes, seleccionado, onElegir, onRegistrar }) => {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const idLista = useId();
  const resultados = useMemo(() => filtrarClientes(clientes, texto), [clientes, texto]);

  return (
    <div>
      <label htmlFor="pos-cliente" className={etiqueta}>Cliente (opcional)</label>
      {seleccionado ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E7E1D7] bg-[#FAF8F5] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-900">{nombreCompleto(seleccionado)}</p>
            <p className="truncate text-xs text-stone-500">
              {[seleccionado.ci && `CI ${seleccionado.ci}`, seleccionado.celular].filter(Boolean).join(' · ') || 'Sin más datos'}
              {seleccionado.estado !== 'SINCRONIZADA' && ' · pendiente de enviar'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onElegir(null)}
            aria-label="Quitar cliente de la venta"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9B7B54]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            id="pos-cliente"
            role="combobox"
            aria-expanded={abierto}
            aria-controls={idLista}
            aria-autocomplete="list"
            autoComplete="off"
            value={texto}
            maxLength={120}
            placeholder="Buscar por nombre, CI o celular"
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            onBlur={() => window.setTimeout(() => setAbierto(false), 120)}
            onKeyDown={(e) => e.key === 'Escape' && setAbierto(false)}
            className={campo}
          />
          {abierto && (
            <ul
              id={idLista}
              role="listbox"
              aria-label="Clientes guardados en este equipo"
              className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#E7E1D7] bg-white shadow-lg"
            >
              {resultados.length === 0 ? (
                <li className="px-3 py-3 text-xs text-stone-500" role="option" aria-selected="false" aria-disabled="true">
                  {clientes.length === 0 ? 'Aún no hay clientes guardados en este equipo.' : 'Ningún cliente coincide.'}
                </li>
              ) : (
                resultados.map((c) => (
                  <li key={c.id} role="option" aria-selected="false">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onElegir(c);
                        setTexto('');
                        setAbierto(false);
                      }}
                      className={cn('block w-full px-3 py-2 text-left hover:bg-[#FAF8F5] focus-visible:bg-[#FAF8F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9B7B54]')}
                    >
                      <span className="block truncate text-sm font-medium text-stone-900">{nombreCompleto(c)}</span>
                      <span className="block truncate text-xs text-stone-500">
                        {[c.ci && `CI ${c.ci}`, c.celular].filter(Boolean).join(' · ') || 'Sin más datos'}
                        {c.estado !== 'SINCRONIZADA' && ' · pendiente de enviar'}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onRegistrar}
        className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#7A5F3C] hover:bg-[#FAF8F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9B7B54]"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        Registrar cliente
      </button>
    </div>
  );
};
