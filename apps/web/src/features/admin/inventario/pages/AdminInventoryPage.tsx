import React, { useEffect, useState } from 'react';
import { inventoryApi } from '../services/inventory.api';
import { AlertaInventario } from '../types';

export const AdminInventoryPage: React.FC = () => {
  const [alertas, setAlertas] = useState<AlertaInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Modal de Ajuste
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<AlertaInventario | null>(null);
  const [operacion, setOperacion] = useState<'AGREGAR' | 'REDUCIR'>('AGREGAR');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('Reabastecimiento estándar');
  const [enviando, setEnviando] = useState(false);

  const cargarAlertas = async () => {
    try {
      setCargando(true);
      const data = await inventoryApi.obtenerAlertas();
      setAlertas(data);
    } catch (error) {
      console.error('Error cargando alertas de inventario', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, []);

  const handleAjustar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varianteSeleccionada) return;
    try {
      setEnviando(true);
      await inventoryApi.ajustarStock(varianteSeleccionada.id, {
        operacion,
        cantidad,
        motivo
      });
      setVarianteSeleccionada(null);
      await cargarAlertas();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al ajustar stock');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <div className="py-20 text-center text-xs tracking-widest uppercase text-gray-400">Cargando inventario...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-2xl font-light tracking-tight mb-2">Control de Inventario</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Alertas de Stock y Reabastecimiento</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-light leading-none">{alertas.length}</span>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Alertas Activas</p>
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="bg-[#f9f9f9] py-16 text-center border border-gray-100">
          <p className="text-sm font-light text-gray-500">Todo el inventario está en niveles óptimos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black text-xs uppercase tracking-widest text-gray-500">
                <th className="pb-4 font-medium pl-2">Producto</th>
                <th className="pb-4 font-medium">SKU</th>
                <th className="pb-4 font-medium">Variación</th>
                <th className="pb-4 font-medium text-right">Stock Actual</th>
                <th className="pb-4 font-medium text-center">Estado</th>
                <th className="pb-4 font-medium text-right pr-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map(alerta => {
                const agotado = alerta.stock === 0;
                return (
                  <tr key={alerta.id} className="border-b border-gray-100 hover:bg-[#fafafa] transition-colors">
                    <td className="py-5 pl-2">
                      <span className="text-sm font-medium">{alerta.producto?.nombre}</span>
                    </td>
                    <td className="py-5">
                      <span className="text-xs text-gray-500">{alerta.sku}</span>
                    </td>
                    <td className="py-5">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-sm">
                        {alerta.color?.nombre || 'N/A'} | {alerta.talla?.nombre || 'N/A'}
                      </span>
                    </td>
                    <td className="py-5 text-right">
                      <span className="text-lg font-light">{alerta.stock}</span>
                      <span className="text-[10px] text-gray-400 block">Min: {alerta.stockMinimo}</span>
                    </td>
                    <td className="py-5 text-center">
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-1 border ${
                        agotado 
                          ? 'border-red-200 text-red-600 bg-red-50' 
                          : 'border-orange-200 text-orange-600 bg-orange-50'
                      }`}>
                        {agotado ? 'Agotado' : 'Bajo Stock'}
                      </span>
                    </td>
                    <td className="py-5 text-right pr-2">
                      <button 
                        onClick={() => {
                          setVarianteSeleccionada(alerta);
                          setOperacion('AGREGAR');
                          setCantidad(10);
                        }}
                        className="text-xs uppercase tracking-widest border-b border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-colors"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Ajuste (Minimalista) */}
      {varianteSeleccionada && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm uppercase tracking-widest font-medium">Ajustar Inventario</h3>
              <button onClick={() => setVarianteSeleccionada(null)} className="text-gray-400 hover:text-black">
                ✕
              </button>
            </div>
            
            <div className="mb-6 bg-[#f9f9f9] p-4 text-sm font-light">
              <p className="font-medium mb-1">{varianteSeleccionada.producto?.nombre}</p>
              <p className="text-xs text-gray-500 mb-2">SKU: {varianteSeleccionada.sku}</p>
              <p className="text-xs">
                Talla: <strong>{varianteSeleccionada.talla?.nombre}</strong> | 
                Color: <strong>{varianteSeleccionada.color?.nombre}</strong>
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xs uppercase tracking-widest text-gray-500">Stock Actual</span>
                <span className="text-2xl font-light leading-none">{varianteSeleccionada.stock}</span>
              </div>
            </div>

            <form onSubmit={handleAjustar} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Operación</label>
                  <select 
                    value={operacion}
                    onChange={e => setOperacion(e.target.value as 'AGREGAR' | 'REDUCIR')}
                    className="w-full text-sm p-3 border border-gray-200 focus:outline-none focus:border-black bg-white"
                  >
                    <option value="AGREGAR">Añadir (+)</option>
                    <option value="REDUCIR">Reducir (-)</option>
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Cantidad</label>
                  <input 
                    type="number" 
                    min="1"
                    value={cantidad}
                    onChange={e => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-full text-sm p-3 border border-gray-200 focus:outline-none focus:border-black"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Motivo / Notas</label>
                <input 
                  type="text" 
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full text-sm p-3 border border-gray-200 focus:outline-none focus:border-black"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={enviando}
                className="w-full mt-4 bg-black text-white py-4 text-xs tracking-widest uppercase font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {enviando ? 'Guardando...' : 'Confirmar Ajuste'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
