import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const FOCO = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B7B54]';

export const Cargando: React.FC<{ texto?: string }> = ({ texto = 'Cargando...' }) => (
  <div role="status" className="flex items-center justify-center gap-3 py-16 text-stone-500">
    <RefreshCw className="w-5 h-5 animate-spin motion-reduce:animate-none text-[#9B7B54]" aria-hidden />
    <span className="text-xs uppercase tracking-widest font-medium">{texto}</span>
  </div>
);

export const ErrorCarga: React.FC<{ mensaje: string; onReintentar: () => void }> = ({ mensaje, onReintentar }) => (
  <div role="alert" className="flex flex-col items-center gap-3 py-14 text-center">
    <AlertTriangle className="w-6 h-6 text-rose-600" aria-hidden />
    <p className="text-sm text-stone-700 max-w-md">{mensaje}</p>
    <button
      type="button"
      onClick={onReintentar}
      className={`px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-700 ${FOCO}`}
    >
      Reintentar
    </button>
  </div>
);

export const SinResultados: React.FC<{ texto: string }> = ({ texto }) => (
  <p className="py-14 text-center text-sm text-stone-500">{texto}</p>
);

const COLORES: Record<string, string> = {
  verde: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rojo: 'bg-rose-50 text-rose-800 border-rose-200',
  ambar: 'bg-amber-50 text-amber-800 border-amber-200',
  gris: 'bg-stone-100 text-stone-700 border-stone-200',
  dorado: 'bg-[#F3EBDD] text-[#6F5434] border-[#E3D3B8]',
};

export const Etiqueta: React.FC<{ color: keyof typeof COLORES; children: React.ReactNode }> = ({ color, children }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${COLORES[color]}`}>{children}</span>
);

interface PaginadorProps {
  pagina: number;
  totalPaginas: number;
  resumen: string;
  onCambiar: (pagina: number) => void;
}

export const Paginador: React.FC<PaginadorProps> = ({ pagina, totalPaginas, resumen, onCambiar }) => (
  <nav aria-label="Paginación" className="flex items-center justify-between gap-3 px-4 py-3 border-t border-stone-200 text-xs text-stone-600">
    <span>{resumen}</span>
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
        className={`px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 ${FOCO}`}
      >
        Anterior
      </button>
      <span aria-live="polite">
        Página {pagina} de {totalPaginas}
      </span>
      <button
        type="button"
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
        className={`px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 ${FOCO}`}
      >
        Siguiente
      </button>
    </div>
  </nav>
);
