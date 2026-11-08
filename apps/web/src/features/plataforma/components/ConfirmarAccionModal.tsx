import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FOCO } from './ui';

interface Props {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  etiquetaConfirmar: string;
  peligroso?: boolean;
  enviando?: boolean;
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** In-page confirmation dialog (the project does not use native confirm/alert). */
export const ConfirmarAccionModal: React.FC<Props> = ({
  abierto,
  titulo,
  descripcion,
  etiquetaConfirmar,
  peligroso,
  enviando,
  error,
  onConfirmar,
  onCancelar,
}) => {
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    cancelar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && !enviando && onCancelar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, enviando, onCancelar]);

  if (!abierto) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !enviando) onCancelar();
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="plat-confirm-titulo" aria-describedby="plat-confirm-desc" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 id="plat-confirm-titulo" className="font-serif text-xl text-stone-900">
          {titulo}
        </h3>
        <p id="plat-confirm-desc" className="mt-2 text-sm text-stone-600">
          {descripcion}
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelar}
            type="button"
            disabled={enviando}
            onClick={onCancelar}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50 ${FOCO}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={onConfirmar}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-50 ${
              peligroso ? 'bg-rose-700 hover:bg-rose-800' : 'bg-stone-900 hover:bg-stone-700'
            } ${FOCO}`}
          >
            {enviando ? 'Procesando...' : etiquetaConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
