import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../services/orders.api';
import { Pedido } from '../types';
import { useTenantStore } from '../../../hooks/useTenantStore';

/** What this shopper has bought in the current store. Not the store's reports. */
export const ActividadPage: React.FC = () => {
  const { getStoreUrl } = useTenantStore();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ordersApi
      .obtenerMisPedidos()
      .then(setPedidos)
      .catch(() => setError('No pudimos cargar tus compras.'))
      .finally(() => setCargando(false));
  }, []);

  const total = pedidos.reduce((suma, pedido) => suma + Number(pedido.total || 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9B7B54]">Tu cuenta</p>
        <h1 className="font-serif text-3xl text-stone-900">Tu actividad</h1>
        <p className="text-sm text-stone-600">Compras de esta tienda. El detalle sigue en Mis pedidos.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#E7E1D7] bg-[#FAF8F5] p-4">
          <p className="text-[10px] uppercase tracking-widest text-stone-500">Pedidos</p>
          <p className="font-serif text-2xl text-stone-900">{cargando ? '…' : pedidos.length}</p>
        </div>
        <div className="border border-[#E7E1D7] bg-[#FAF8F5] p-4">
          <p className="text-[10px] uppercase tracking-widest text-stone-500">Total</p>
          <p className="font-serif text-2xl text-stone-900">{cargando ? '…' : `$${total.toFixed(2)}`}</p>
        </div>
      </div>

      {error && <p className="text-sm text-rose-700">{error}</p>}

      {!cargando && !error && pedidos.length === 0 && (
        <p className="text-sm text-stone-600">Todavía no tienes compras en esta tienda.</p>
      )}

      <ul className="divide-y divide-[#E7E1D7] border border-[#E7E1D7] bg-white">
        {pedidos.slice(0, 6).map((pedido) => (
          <li key={pedido.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-stone-900">
              {pedido.nro}
              <span className="text-stone-500"> · {pedido.estado}</span>
            </span>
            <span className="text-stone-800">${Number(pedido.total).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <Link to={getStoreUrl('pedidos')} className="text-xs uppercase tracking-widest text-[#9B7B54]">
        Ver mis pedidos
      </Link>
    </div>
  );
};
