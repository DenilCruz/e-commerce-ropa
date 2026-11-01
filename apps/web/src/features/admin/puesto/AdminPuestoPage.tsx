import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShoppingBag, Store } from 'lucide-react';
import { adminApi } from '../services/admin.api';
import { AlertaStock } from '../types';
import { usePlanLimites } from '../../tiendas/hooks/usePlanLimites';

/** Seller counter: low stock, the register, and orders. Not the owner's reports. */
export const AdminPuestoPage: React.FC = () => {
  const { metricas } = usePlanLimites();
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    adminApi
      .obtenerStockBajo()
      .then(setAlertas)
      .catch(() => setAlertas([]))
      .finally(() => setCargando(false));
  }, []);

  const pos = metricas?.capacidades.posOffline !== false;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9B7B54]">Mostrador</p>
        <h1 className="font-serif text-3xl text-stone-900">Tu puesto</h1>
        <p className="text-sm text-stone-600">Ventas del día, stock que se acaba y pedidos por entregar.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        {pos && (
          <Link
            to="/admin/ventas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#161513] text-[#FAF8F5] text-xs uppercase tracking-widest"
          >
            <Store className="w-4 h-4" />
            Abrir caja
          </Link>
        )}
        <Link
          to="/admin/pedidos"
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#E7E1D7] text-xs uppercase tracking-widest text-stone-800"
        >
          <ShoppingBag className="w-4 h-4" />
          Pedidos
        </Link>
        <Link
          to="/admin/inventario"
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#E7E1D7] text-xs uppercase tracking-widest text-stone-800"
        >
          Inventario
        </Link>
      </div>

      <section className="border border-[#E7E1D7] bg-white">
        <div className="px-4 py-3 border-b border-[#E7E1D7] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <h2 className="text-sm font-semibold text-stone-900">Stock por reponer</h2>
        </div>
        {cargando ? (
          <p className="p-4 text-sm text-stone-500">Revisando el inventario…</p>
        ) : alertas.length === 0 ? (
          <p className="p-4 text-sm text-stone-600">No hay prendas en stock crítico.</p>
        ) : (
          <ul className="divide-y divide-[#E7E1D7]">
            {alertas.slice(0, 8).map((alerta) => (
              <li key={alerta.varianteId} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-900">
                  {alerta.nombreProducto}
                  <span className="text-stone-500"> · {alerta.talla} / {alerta.color}</span>
                </span>
                <span className={alerta.estadoStock === 'AGOTADO' ? 'text-rose-700' : 'text-amber-800'}>
                  {alerta.stockActual} en existencia
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
