import React, { useEffect, useState, useMemo } from 'react';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Search, 
  X, 
  Plus, 
  Minus, 
  ArrowUpDown, 
  RefreshCw, 
  ShoppingBag, 
  Undo2, 
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { inventoryApi } from '../services/inventory.api';
import { VarianteInventario, InventarioKpis, AjustarStockPayload } from '../types';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const AdminInventoryPage: React.FC = () => {
  const [variantes, setVariantes] = useState<VarianteInventario[]>([]);
  const [kpis, setKpis] = useState<InventarioKpis>({
    totalVariantes: 0,
    totalStock: 0,
    stockBajo: 0,
    agotados: 0,
    stockOptimo: 0,
  });
  const [cargando, setCargando] = useState(true);

  // Filtros y Búsqueda (HU-35 y HU-37)
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'alerta' | 'agotado' | 'optimo'>('todos');

  // Modal de Ajuste / Reabastecimiento de Mercadería (HU-36)
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<VarianteInventario | null>(null);
  const [operacion, setOperacion] = useState<'AGREGAR' | 'REDUCIR' | 'ESTABLECER'>('AGREGAR');
  const [cantidad, setCantidad] = useState<number>(10);
  const [motivo, setMotivo] = useState('Llegada de mercadería / Lote estándar');
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);

  // Panel Simulador de Pedidos (HU-38 y HU-39)
  const [mostrarSimulador, setMostrarSimulador] = useState(false);
  const [simVarianteId, setSimVarianteId] = useState('');
  const [simCantidad, setSimCantidad] = useState(1);
  const [procesandoSimulacion, setProcesandoSimulacion] = useState(false);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [vars, stats] = await Promise.all([
        inventoryApi.obtenerVariantes(busqueda, filtroEstado),
        inventoryApi.obtenerKpis(),
      ]);
      setVariantes(vars);
      setKpis(stats);
      if (vars.length > 0 && !simVarianteId) {
        setSimVarianteId(vars[0].id);
      }
    } catch (error) {
      console.error('Error cargando inventario:', error);
      toast.error('Error al cargar datos del inventario');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado]);

  // Manejar búsqueda con debounce manual
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos();
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // Abrir modal de ajuste (HU-36)
  const handleAbrirAjuste = (variante: VarianteInventario, op: 'AGREGAR' | 'REDUCIR' | 'ESTABLECER' = 'AGREGAR') => {
    setVarianteSeleccionada(variante);
    setOperacion(op);
    setCantidad(op === 'AGREGAR' ? 10 : 1);
    setMotivo(
      op === 'AGREGAR' 
        ? 'Llegada de mercadería / Lote nuevo' 
        : op === 'REDUCIR' 
          ? 'Salida por merma o prenda dañada' 
          : 'Ajuste directo por recuento físico'
    );
  };

  // Calcular stock resultante proyectado
  const stockResultante = useMemo(() => {
    if (!varianteSeleccionada) return 0;
    if (operacion === 'AGREGAR') return varianteSeleccionada.stock + (Number(cantidad) || 0);
    if (operacion === 'REDUCIR') return Math.max(0, varianteSeleccionada.stock - (Number(cantidad) || 0));
    return Number(cantidad) || 0;
  }, [varianteSeleccionada, operacion, cantidad]);

  // Guardar Ajuste de Mercadería (HU-36)
  const handleGuardarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varianteSeleccionada) return;

    if (operacion === 'REDUCIR' && cantidad > varianteSeleccionada.stock) {
      toast.error(`Stock insuficiente. Intentas reducir ${cantidad}, pero solo hay ${varianteSeleccionada.stock} disponibles.`);
      return;
    }

    try {
      setGuardandoAjuste(true);
      const payload: AjustarStockPayload = {
        operacion,
        cantidad: Number(cantidad),
        motivo: motivo.trim() || 'Ajuste administrativo',
      };

      await inventoryApi.ajustarStock(varianteSeleccionada.id, payload);
      toast.success(
        operacion === 'AGREGAR'
          ? `¡Mercadería ingresada! Stock actualizado a ${stockResultante} unidades.`
          : `Stock de "${varianteSeleccionada.sku}" actualizado a ${stockResultante} unidades.`
      );
      setVarianteSeleccionada(null);
      cargarDatos();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar el inventario');
    } finally {
      setGuardandoAjuste(false);
    }
  };

  // Simulación de Confirmación de Pedido (HU-38)
  const handleSimularConfirmarPedido = async () => {
    if (!simVarianteId) {
      toast.error('Selecciona una variante para simular el pedido');
      return;
    }

    try {
      setProcesandoSimulacion(true);
      const res = await inventoryApi.descontarStock([{ varianteId: simVarianteId, cantidad: simCantidad }]);
      toast.success(`HU-38 (Sistema): Pedido confirmado. ${res.mensaje}`);
      cargarDatos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al descontar stock por pedido');
    } finally {
      setProcesandoSimulacion(false);
    }
  };

  // Simulación de Cancelación de Pedido (HU-39)
  const handleSimularCancelarPedido = async () => {
    if (!simVarianteId) {
      toast.error('Selecciona una variante para simular la cancelación');
      return;
    }

    try {
      setProcesandoSimulacion(true);
      const res = await inventoryApi.devolverStock([{ varianteId: simVarianteId, cantidad: simCantidad }]);
      toast.success(`HU-39 (Sistema): Pedido cancelado. ${res.mensaje}`);
      cargarDatos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al devolver stock al inventario');
    } finally {
      setProcesandoSimulacion(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-black" />
            Control de Inventario
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de stock por variante, recepción de mercadería y alertas de reabastecimiento (HU-35 a HU-39).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMostrarSimulador(!mostrarSimulador)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
              mostrarSimulador
                ? 'bg-purple-50 text-purple-700 border-purple-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-purple-600" />
            <span>Simulador de Pedidos (HU-38/39)</span>
          </button>

          <button
            onClick={cargarDatos}
            className="p-2.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI CARDS (HU-35 y HU-37) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-black text-white rounded-xl shadow-xs">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Stock en Almacén</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.totalStock}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Variantes Totales</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.totalVariantes}</p>
          </div>
        </div>

        <div 
          onClick={() => setFiltroEstado('alerta')}
          className={`bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
            kpis.stockBajo > 0 ? 'border-amber-300 bg-amber-50/20 hover:border-amber-500' : 'border-gray-200'
          }`}
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-700 font-semibold">Stock Bajo (HU-37)</p>
            <p className="text-2xl font-bold text-amber-900">{kpis.stockBajo}</p>
          </div>
        </div>

        <div 
          onClick={() => setFiltroEstado('agotado')}
          className={`bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4 cursor-pointer transition-all ${
            kpis.agotados > 0 ? 'border-red-300 bg-red-50/20 hover:border-red-500' : 'border-gray-200'
          }`}
        >
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-red-700 font-semibold">Agotados</p>
            <p className="text-2xl font-bold text-red-900">{kpis.agotados}</p>
          </div>
        </div>
      </div>

      {/* BANNER DE ALERTA ACTIVA DE STOCK (HU-37) */}
      {(kpis.stockBajo > 0 || kpis.agotados > 0) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4 text-amber-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Atención de Almacén: Prendas requieren reposición</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Hay <strong>{kpis.stockBajo} variante(s) con stock bajo</strong> y <strong>{kpis.agotados} variante(s) agotadas</strong>. Registra la llegada de mercadería para evitar pérdida de ventas.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFiltroEstado('alerta')}
            className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap"
          >
            Ver Alertas (HU-37)
          </button>
        </div>
      )}

      {/* SIMULADOR DE PEDIDOS (HU-38 y HU-39) */}
      {mostrarSimulador && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between border-b border-purple-800 pb-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-300" />
                Simulador del Rol Sistema (HU-38 y HU-39)
              </h3>
              <p className="text-xs text-purple-200 mt-0.5">
                Prueba cómo el sistema descuenta existencias al confirmar pedidos y restituye el stock al cancelarlos.
              </p>
            </div>
            <button
              onClick={() => setMostrarSimulador(false)}
              className="text-purple-300 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-purple-200">
                Seleccionar Variante
              </label>
              <select
                value={simVarianteId}
                onChange={e => setSimVarianteId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-purple-800/80 border border-purple-600 text-white focus:outline-none focus:border-white"
              >
                {variantes.map(v => (
                  <option key={v.id} value={v.id} className="bg-gray-900 text-white">
                    {v.producto?.nombre} - SKU: {v.sku} ({v.talla?.nombre}/{v.color?.nombre}) - Stock: {v.stock}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-purple-200">
                Cantidad a Procesar
              </label>
              <input
                type="number"
                min={1}
                value={simCantidad}
                onChange={e => setSimCantidad(Math.max(1, Number(e.target.value)))}
                className="w-full text-xs p-2.5 rounded-lg bg-purple-800/80 border border-purple-600 text-white focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex gap-2">
              {/* HU-38: Descontar por pedido confirmado */}
              <button
                type="button"
                onClick={handleSimularConfirmarPedido}
                disabled={procesandoSimulacion}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                title="Descontar stock automáticamente tras confirmación del pedido"
              >
                <TrendingDown className="w-4 h-4" />
                <span>Confirmar Pedido (HU-38)</span>
              </button>

              {/* HU-39: Devolver por pedido cancelado */}
              <button
                type="button"
                onClick={handleSimularCancelarPedido}
                disabled={procesandoSimulacion}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                title="Devolver stock al almacén tras cancelación del pedido"
              >
                <Undo2 className="w-4 h-4" />
                <span>Cancelar Pedido (HU-39)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE BÚSQUEDA Y PESTAÑAS DE FILTRO (HU-35 y HU-37) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre de prenda o SKU..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-black transition-colors"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'todos', label: 'Todas las Variantes' },
            { id: 'alerta', label: `Alertas (${kpis.stockBajo + kpis.agotados})` },
            { id: 'optimo', label: `Stock Óptimo (${kpis.stockOptimo})` },
            { id: 'agotado', label: `Agotadas (${kpis.agotados})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filtroEstado === tab.id
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE INVENTARIO (HU-35) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {cargando ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <p className="text-xs uppercase tracking-widest font-semibold">Cargando existencias...</p>
          </div>
        ) : variantes.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-700">No se encontraron variantes en inventario</p>
            <p className="text-xs text-gray-400 mt-1">Prueba cambiando los filtros o agregando nuevos productos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Prenda / Producto</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Variante (Talla / Color)</th>
                  <th className="py-3.5 px-4 text-center">Stock Actual (HU-35)</th>
                  <th className="py-3.5 px-4 text-center">Stock Mínimo</th>
                  <th className="py-3.5 px-4 text-center">Estado (HU-37)</th>
                  <th className="py-3.5 px-4 text-right">Acción (HU-36)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variantes.map(v => {
                  const agotado = v.stock === 0;
                  const stockBajo = v.stock > 0 && v.stock <= (v.stockMinimo || 5);
                  const imgUrl = v.producto?.imagenes?.[0]?.url;

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Prenda / Producto */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {imgUrl ? (
                            <img
                              src={getImageUrl(imgUrl)}
                              alt={v.producto?.nombre}
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 line-clamp-1">{v.producto?.nombre}</p>
                            {v.producto?.categoria && (
                              <p className="text-xs text-gray-500">{v.producto.categoria.nombre}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-4 px-4 font-mono text-xs text-gray-600 font-semibold">
                        {v.sku}
                      </td>

                      {/* Talla / Color */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-gray-100 font-medium text-xs text-gray-800">
                            Talla: {v.talla?.nombre || '-'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 font-medium text-xs text-gray-800">
                            {v.color?.hex && (
                              <span 
                                className="w-2.5 h-2.5 rounded-full border border-gray-300" 
                                style={{ backgroundColor: v.color.hex }} 
                              />
                            )}
                            {v.color?.nombre || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Stock Actual (HU-35) */}
                      <td className="py-4 px-4 text-center">
                        <span className={`text-base font-bold ${
                          agotado ? 'text-red-600' : stockBajo ? 'text-amber-600' : 'text-gray-900'
                        }`}>
                          {v.stock}
                        </span>
                        <span className="text-[10px] text-gray-400 block uppercase">unidades</span>
                      </td>

                      {/* Stock Mínimo */}
                      <td className="py-4 px-4 text-center text-xs text-gray-500 font-mono">
                        {v.stockMinimo || 5}
                      </td>

                      {/* Estado (HU-37) */}
                      <td className="py-4 px-4 text-center">
                        {agotado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <XCircle className="w-3.5 h-3.5" />
                            Agotado
                          </span>
                        ) : stockBajo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Óptimo
                          </span>
                        )}
                      </td>

                      {/* Botón Reabastecer / Ajustar (HU-36) */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleAbrirAjuste(v, 'AGREGAR')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-gray-800 rounded-lg text-xs font-medium transition-colors shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Reabastecer</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE REABASTECIMIENTO Y AJUSTE DE STOCK (HU-36) */}
      {varianteSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-black" />
                  Actualizar Stock (HU-36)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {varianteSeleccionada.producto?.nombre} · SKU: <strong>{varianteSeleccionada.sku}</strong>
                </p>
              </div>
              <button
                onClick={() => setVarianteSeleccionada(null)}
                className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarAjuste} className="p-6 space-y-5">
              {/* Tarjeta de Resumen Actual */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Stock Actual</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">{varianteSeleccionada.stock} unidades</p>
                  <p className="text-[11px] text-gray-400">
                    Talla: {varianteSeleccionada.talla?.nombre} · Color: {varianteSeleccionada.color?.nombre}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Stock Proyectado</p>
                  <p className="text-2xl font-black text-emerald-600 mt-0.5">{stockResultante} unidades</p>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                    {operacion === 'AGREGAR' ? `+${cantidad}` : operacion === 'REDUCIR' ? `-${cantidad}` : `=${cantidad}`}
                  </span>
                </div>
              </div>

              {/* Selector de Tipo de Operación */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                  Tipo de Movimiento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOperacion('AGREGAR');
                      setMotivo('Llegada de mercadería / Lote nuevo');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all border ${
                      operacion === 'AGREGAR'
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Llegó Mercadería</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOperacion('REDUCIR');
                      setMotivo('Salida por merma o prenda defectuosa');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all border ${
                      operacion === 'REDUCIR'
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Salida / Merma</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOperacion('ESTABLECER');
                      setMotivo('Ajuste directo por recuento físico');
                      setCantidad(varianteSeleccionada.stock);
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all border ${
                      operacion === 'ESTABLECER'
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <span>Ajuste Directo</span>
                  </button>
                </div>
              </div>

              {/* Cantidad y Botones Rápidos */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Cantidad ({operacion === 'AGREGAR' ? 'Unidades Recibidas' : operacion === 'REDUCIR' ? 'Unidades a Retirar' : 'Nuevo Total'})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={operacion === 'ESTABLECER' ? 0 : 1}
                    value={cantidad}
                    onChange={e => setCantidad(Number(e.target.value))}
                    className="w-full text-base font-bold p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                    required
                  />
                  {operacion === 'AGREGAR' && (
                    <div className="flex gap-1">
                      {[10, 25, 50].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCantidad(prev => prev + n)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Justificación o Motivo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Motivo / Justificación
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lote #102 de proveedor, Corrección física..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setVarianteSeleccionada(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAjuste}
                  className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {guardandoAjuste ? 'Guardando en Almacén...' : 'Confirmar Actualización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
