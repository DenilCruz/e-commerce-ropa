import React, { useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline, checkConnection } = useNetworkStatus();
  const [comprobando, setComprobando] = useState(false);

  if (isOnline) {
    return null;
  }

  const handleReintentar = async () => {
    setComprobando(true);
    await checkConnection();
    setTimeout(() => {
      setComprobando(false);
    }, 600);
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-amber-900/95 text-amber-50 backdrop-blur-md border-b border-amber-800 shadow-md transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
          </span>
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
            <p className="font-light tracking-wide text-amber-100">
              <strong className="font-semibold text-white">Modo sin conexión activo:</strong>{' '}
              Estás navegando en catálogo guardado. Tu carrito y favoritos están disponibles desde la memoria local.
            </p>
          </div>
        </div>

        <button
          onClick={handleReintentar}
          disabled={comprobando}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-800/80 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-medium tracking-wider uppercase border border-amber-600/50 rounded transition-all shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${comprobando ? 'animate-spin' : ''}`} />
          <span>{comprobando ? 'Comprobando...' : 'Reintentar'}</span>
        </button>
      </div>
    </aside>
  );
};
