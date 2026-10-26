import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowUpRight, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import { usePlanLimites } from '../hooks/usePlanLimites';
import { toast } from 'sonner';

export const AdminPlanBadge: React.FC = () => {
  const { metricas, cargando } = usePlanLimites();
  const [copiado, setCopiado] = useState(false);

  if (cargando || !metricas) {
    return null;
  }

  const { plan, consumo, tienda } = metricas;
  const esFreeTrial = plan.id === 'FREE_TRIAL';
  const slug = tienda?.slug || 'aura';
  const publicUrl = `${window.location.origin}/t/${slug}`;

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiado(true);
      toast.success('¡Enlace de tu tienda copiado al portapapeles!');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error('No se pudo copiar el enlace al portapapeles.');
    }
  };

  return (
    <div className="mx-4 mb-4 p-3.5 rounded-xl bg-gradient-to-b from-gray-900 to-black border border-gray-800 text-white space-y-3 shadow-lg">
      {/* Plan Header */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#9B7B54]" />
          <span className="text-xs font-bold tracking-tight text-white">{plan.nombre}</span>
        </div>
        <Link
          to="/planes#planes"
          className="text-[10px] font-bold uppercase text-[#9B7B54] hover:text-[#B5966E] flex items-center gap-0.5 tracking-wider"
          title="Ver planes y precios"
        >
          <span>Upgrade</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Barras de Consumo */}
      <div className="space-y-2 text-[11px]">
        {/* Productos */}
        <div>
          <div className="flex items-center justify-between text-gray-400 font-mono text-[10px]">
            <span>Productos</span>
            <span className={consumo.productos.superado ? 'text-rose-400 font-bold' : 'text-gray-300'}>
              {consumo.productos.actual}/{consumo.productos.limite}
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-0.5">
            <div
              className={`h-full transition-all duration-300 ${
                consumo.productos.superado ? 'bg-rose-500' : 'bg-[#9B7B54]'
              }`}
              style={{ width: `${Math.min(100, consumo.productos.porcentaje)}%` }}
            />
          </div>
        </div>

        {/* Personal / Usuarios */}
        <div>
          <div className="flex items-center justify-between text-gray-400 font-mono text-[10px]">
            <span>Personal</span>
            <span className={consumo.usuarios.superado ? 'text-rose-400 font-bold' : 'text-gray-300'}>
              {consumo.usuarios.actual}/{consumo.usuarios.limite}
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-0.5">
            <div
              className={`h-full transition-all duration-300 ${
                consumo.usuarios.superado ? 'bg-rose-500' : 'bg-stone-400'
              }`}
              style={{ width: `${Math.min(100, consumo.usuarios.porcentaje)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Enlace Público para Clientes */}
      <div className="pt-2 border-t border-gray-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span className="uppercase tracking-wider font-medium text-[9px]">Link para tus clientes</span>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9B7B54] hover:underline flex items-center gap-0.5 text-[10px]"
            title="Abrir tienda en nueva pestaña"
          >
            <span>Ver</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <button
          onClick={copiarEnlace}
          type="button"
          className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded bg-gray-850 hover:bg-gray-800 transition-colors text-[10px] text-gray-200 border border-gray-800"
          title="Copiar link para enviar a tus clientes"
        >
          <span className="truncate font-mono text-gray-300">/t/{slug}</span>
          {copiado ? (
            <span className="flex items-center gap-0.5 text-emerald-400 font-bold shrink-0">
              <Check className="w-3 h-3" />
              <span>Copiado</span>
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[#9B7B54] font-medium shrink-0">
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </span>
          )}
        </button>
      </div>

      {esFreeTrial && (
        <div className="pt-1 border-t border-gray-800/80 flex items-center gap-1.5 text-[10px] text-amber-300">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>Prueba gratis activa</span>
        </div>
      )}
    </div>
  );
};
