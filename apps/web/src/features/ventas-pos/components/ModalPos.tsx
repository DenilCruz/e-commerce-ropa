import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props {
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: React.ReactNode;
}

const FOCALIZABLES = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** In-page dialog (the project does not use native alert/confirm/prompt): Escape closes, Tab stays inside, focus returns. */
export const ModalPos: React.FC<Props> = ({ titulo, descripcion, onCerrar, children }) => {
  const idTitulo = useId();
  const idDescripcion = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const primero = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>(FOCALIZABLES);
    primero?.focus();
    return () => anterior?.focus?.();
  }, []);

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCerrar();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const lista = [...panel.current.querySelectorAll<HTMLElement>(FOCALIZABLES)];
    if (!lista.length) return;
    const primero = lista[0];
    const ultimo = lista[lista.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idDescripcion : undefined}
        onKeyDown={alTeclear}
        className={cn(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#E7E1D7] bg-white shadow-xl sm:max-w-lg sm:rounded-2xl',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E7E1D7] px-5 py-4">
          <div>
            <h2 id={idTitulo} className="font-serif text-lg font-bold text-stone-900">{titulo}</h2>
            {descripcion && <p id={idDescripcion} className="mt-0.5 text-xs text-stone-500">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-[#FAF8F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B7B54]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

export const campo =
  'min-h-[44px] w-full rounded-xl border border-[#E7E1D7] px-3 text-sm focus:border-[#9B7B54] focus:ring-1 focus:ring-[#9B7B54] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B7B54]';
export const etiqueta = 'mb-1 block text-xs font-bold uppercase text-stone-600';
export const botonPrimario =
  'min-h-[44px] rounded-xl bg-stone-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B7B54]';
export const botonSecundario =
  'min-h-[44px] rounded-xl border border-[#E7E1D7] bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-[#FAF8F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B7B54]';
