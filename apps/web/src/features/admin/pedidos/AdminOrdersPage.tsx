import React, { useEffect, useState } from 'react';
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Eye,
  CreditCard,
  Truck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ordersApi } from '../../pedidos/services/orders.api';
import { paymentsApi } from '../../pago/services/payments.api';
import { Pedido, PedidoItem, HistorialAuditoria } from '../../pedidos/types';

export const AdminOrdersPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('TODOS');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  // Estados del modal de reembolso (HU-59)
  const [reembolsandoPedido, setReembolsandoPedido] = useState<Pedido | null>(null);
  const [motivoReembolso, setMotivoReembolso] = useState('');
  const [ejecutandoReembolso, setEjecutandoReembolso] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => {
    cargarPedidos();
  }, [estadoFiltro]);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const data = await ordersApi.obtenerTodosAdmin({
        estado: estadoFiltro !== 'TODOS' ? estadoFiltro : undefined,
        busqueda: busqueda.trim() || undefined,
      });
      setPedidos(data);
    } catch (err) {
      console.error('Error cargando pedidos en admin:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarPedidos();
  };

  // HU-59: Ejecutar Reembolso de Pago en Stripe y BD
  const handleConfirmarReembolso = async () => {
    if (!reembolsandoPedido) return;

    setEjecutandoReembolso(true);
    setMensajeError(null);
    setMensajeExito(null);

    try {
      const res = await paymentsApi.reembolsarPago(
        reembolsandoPedido.id,
        motivoReembolso.trim() || 'Reembolso por reclamo de cliente',
      );
      setMensajeExito(res.mensaje || `Pago de la orden ${reembolsandoPedido.nro} reembolsado exitosamente.`);
      setReembolsandoPedido(null);
      setMotivoReembolso('');
      cargarPedidos();
    } catch (err: any) {
      setMensajeError(err.response?.data?.message || err.message || 'Error al procesar el reembolso.');
    } finally {
      setEjecutandoReembolso(false);
    }
  };

  // Actualizar estado logístico de orden (HU-54 y HU-55)
  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      const comentario =
        window.prompt(
          `Ingrese un comentario u observación para registrar en el historial de auditoría (HU-55) al cambiar a "${nuevoEstado}":`,
          `Actualizado por administrador a ${nuevoEstado}`,
        ) || undefined;

      await ordersApi.actualizarEstadoAdmin(id, nuevoEstado, comentario);
      cargarPedidos();
      if (pedidoSeleccionado && pedidoSeleccionado.id === id) {
        setPedidoSeleccionado((prev: Pedido | null) => (prev ? { ...prev, estado: nuevoEstado as any } : null));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar estado.');
    }
  };

  // Métricas rápidas
  const totalPagados = pedidos.filter((p) => p.estado === 'PAGADO' || p.pago?.estado === 'APROBADO').length;
  const totalPendientes = pedidos.filter((p) => p.estado === 'PENDIENTE' || p.pago?.estado === 'PENDIENTE').length;
  const totalReembolsados = pedidos.filter((p) => p.estado === 'REEMBOLSADO' || p.pago?.estado === 'REEMBOLSADO').length;
  const totalRecaudado = pedidos
    .filter((p) => p.estado === 'PAGADO' || p.pago?.estado === 'APROBADO')
    .reduce((acc, p) => acc + (Number(p.total) || 0), 0);

  const getStatusBadge = (estado: string, estadoPago?: string) => {
    if (estado === 'REEMBOLSADO' || estadoPago === 'REEMBOLSADO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
          <RotateCcw className="w-3 h-3" />
          Reembolsado
        </span>
      );
    }
    if (estado === 'PAGADO' || estadoPago === 'APROBADO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          Pagado
        </span>
      );
    }
    if (estado === 'PENDIENTE' || estadoPago === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3" />
          Pendiente
        </span>
      );
    }
    if (estado === 'CANCELADO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
        {estado}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gestión de Pedidos y Pagos</h1>
          <p className="text-sm text-gray-500">
            Control de órdenes de compra, validación de pasarela Stripe y procesamiento de reembolsos. Total recaudado: <strong className="text-emerald-700 font-bold">Bs. {totalRecaudado.toFixed(2)}</strong>
          </p>
        </div>

        <button
          onClick={cargarPedidos}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* MENSAJES DE ALERTA */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {mensajeError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold">{mensajeError}</span>
          </div>
          <button onClick={() => setMensajeError(null)} className="text-red-700 hover:text-red-900">✕</button>
        </div>
      )}

      {/* MÉTRICAS DE VENTAS Y PEDIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-800">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase">Total Pedidos</span>
            <p className="text-2xl font-black text-gray-900">{pedidos.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase">Pagados / Aprobados</span>
            <p className="text-2xl font-black text-gray-900">{totalPagados}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase">Pendientes (COD)</span>
            <p className="text-2xl font-black text-gray-900">{totalPendientes}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase">Reembolsados</span>
            <p className="text-2xl font-black text-gray-900">{totalReembolsados}</p>
          </div>
        </div>
      </div>

      {/* FILTROS Y BUSCADOR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleBuscar} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Buscar por Nro Orden, Cliente o Correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Estado:</span>
          {['TODOS', 'PAGADO', 'PENDIENTE', 'REEMBOLSADO'].map((st) => (
            <button
              key={st}
              onClick={() => setEstadoFiltro(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                estadoFiltro === st
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE PEDIDOS */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase font-bold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Nro Orden</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Método de Pago</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Estado Pedido</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Cargando pedidos...
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No se encontraron pedidos registrados.
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => {
                  const esPagadoTarjeta =
                    (pedido.estado === 'PAGADO' || pedido.pago?.estado === 'APROBADO') &&
                    pedido.pago?.idTransaccion?.startsWith('pi_');

                  const esReembolsado =
                    pedido.estado === 'REEMBOLSADO' || pedido.pago?.estado === 'REEMBOLSADO';

                  return (
                    <tr key={pedido.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3.5 px-4 font-black text-gray-900">{pedido.nro}</td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {new Date(pedido.fecha).toLocaleDateString('es-BO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{pedido.usuario?.nombre || 'Cliente General'}</p>
                        <p className="text-[11px] text-gray-500">{pedido.usuario?.correo}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {pedido.pago?.idTransaccion?.startsWith('COD') ? (
                            <Truck className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span className="font-medium text-gray-800">
                            {pedido.pago?.metodoPago || 'Tarjeta'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-gray-900">
                        Bs. {Number(pedido.total || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(pedido.estado, pedido.pago?.estado)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* BOTÓN REEMBOLSAR (HU-59) */}
                          {esPagadoTarjeta && !esReembolsado && (
                            <button
                              onClick={() => setReembolsandoPedido(pedido)}
                              title="Reembolsar pago al cliente mediante Stripe"
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reembolsar</span>
                            </button>
                          )}

                          {/* BOTÓN VER DETALLE */}
                          <button
                            onClick={() => setPedidoSeleccionado(pedido)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer"
                            title="Ver detalles del pedido"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL HU-59: CONFIRMAR REEMBOLSO */}
      {reembolsandoPedido && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 text-purple-700 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Reembolsar Pago (HU-59)</h3>
                <p className="text-xs text-gray-500">Orden: {reembolsandoPedido.nro}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-gray-600">
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-1.5">
                <p className="font-bold text-purple-950">Información del Pago a Revertir:</p>
                <p><strong>Monto:</strong> Bs. {Number(reembolsandoPedido.total || 0).toFixed(2)}</p>
                <p><strong>Pasarela:</strong> Stripe (ID: {reembolsandoPedido.pago?.idTransaccion})</p>
                <p><strong>Cliente:</strong> {reembolsandoPedido.usuario?.nombre} ({reembolsandoPedido.usuario?.correo})</p>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800">
                <p className="font-bold">Advertencia:</p>
                <p>Al confirmar, se emitirá una orden de reembolso directa a Stripe hacia la tarjeta del cliente y se restaurará el stock de las prendas en el inventario.</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 uppercase">
                  Motivo del Reembolso (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej. Devolución de prenda por falla o reclamo del cliente"
                  value={motivoReembolso}
                  onChange={(e) => setMotivoReembolso(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setReembolsandoPedido(null)}
                disabled={ejecutandoReembolso}
                className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarReembolso}
                disabled={ejecutandoReembolso}
                className="px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                {ejecutandoReembolso ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Reembolsando en Stripe...</span>
                  </>
                ) : (
                  <span>Confirmar Reembolso</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE ORDEN */}
      {pedidoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Detalle de Orden (Admin)</span>
                <h2 className="text-2xl font-black text-gray-900">{pedidoSeleccionado.nro}</h2>
              </div>
              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="py-6 space-y-6">
              {/* CAMBIO DE ESTADO ADMIN */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">Estado de la Orden:</span>
                  <p className="text-sm font-bold text-gray-900">{pedidoSeleccionado.estado}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={pedidoSeleccionado.estado}
                    onChange={(e) => handleCambiarEstado(pedidoSeleccionado.id, e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PAGADO">PAGADO</option>
                    <option value="ENVIADO">ENVIADO</option>
                    <option value="ENTREGADO">ENTREGADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                    <option value="REEMBOLSADO">REEMBOLSADO</option>
                  </select>
                </div>
              </div>

              {/* DATOS DEL CLIENTE */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <span className="font-bold text-gray-900 uppercase block">Datos del Cliente:</span>
                <p><strong>Nombre:</strong> {pedidoSeleccionado.usuario?.nombre || 'N/A'}</p>
                <p><strong>Correo:</strong> {pedidoSeleccionado.usuario?.correo || 'N/A'}</p>
                <p><strong>Teléfono:</strong> {pedidoSeleccionado.usuario?.celular || 'N/A'}</p>
              </div>

              {/* LISTADO DE PRENDAS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prendas</h3>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {pedidoSeleccionado.items?.map((it: PedidoItem) => (
                    <div key={it.id} className="p-3 flex justify-between items-center text-xs bg-white">
                      <div>
                        <p className="font-bold text-gray-900">{it.nombre}</p>
                        <p className="text-gray-500">
                          Talla: {it.talla} · Color: {it.color} · Cant: {it.cantidad}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">Bs. {Number(it.subtotal || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTALES */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-xs border border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>Bs. {Number(pedidoSeleccionado.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(pedidoSeleccionado.descuento || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Descuento</span>
                    <span>- Bs. {Number(pedidoSeleccionado.descuento || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span>{Number(pedidoSeleccionado.costoEnvio || 0) === 0 ? 'Gratis' : `Bs. ${Number(pedidoSeleccionado.costoEnvio || 0).toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-300">
                  <span>Total</span>
                  <span>Bs. {Number(pedidoSeleccionado.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* GUÍA DE ENVÍO Y RASTREO (HU-64) */}
              {pedidoSeleccionado.envio && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <span>{pedidoSeleccionado.envio.empresaTransportadora || 'Courier Asociado'}</span>
                    </div>
                    <p className="font-mono text-indigo-700 mt-0.5">
                      Guía: <strong>{pedidoSeleccionado.envio.numeroTracking}</strong> ({pedidoSeleccionado.envio.estado})
                    </p>
                  </div>
                  <a
                    href={`/tracking/${pedidoSeleccionado.envio.numeroTracking}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition"
                  >
                    Ver en Mapa
                  </a>
                </div>
              )}

              {/* HISTORIAL DE AUDITORÍA (HU-55) */}
              {pedidoSeleccionado.historial && pedidoSeleccionado.historial.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-gray-900 uppercase text-xs block">
                    Historial de Auditoría y Cambios de Estado (HU-55):
                  </span>
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2.5">
                    {pedidoSeleccionado.historial.map((h: HistorialAuditoria, idx: number) => (
                      <div key={h.id || idx} className="text-xs border-b border-gray-200/60 pb-2 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-center font-bold text-gray-800">
                          <span className="text-indigo-700">
                            {h.estadoAnterior ? `${h.estadoAnterior} → ${h.estadoNuevo}` : h.estadoNuevo}
                          </span>
                          <span className="text-gray-400 font-normal">
                            {new Date(h.creadoEn).toLocaleString('es-BO')}
                          </span>
                        </div>
                        {h.comentario && <p className="text-gray-600 italic mt-0.5">"{h.comentario}"</p>}
                        <span className="text-[10px] text-gray-400 block mt-0.5">Autor: {h.autor || 'Sistema'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PASARELA STRIPE */}
              {pedidoSeleccionado.pago?.idTransaccion && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-1">
                  <span className="font-bold text-indigo-950 block">ID Transacción Stripe:</span>
                  <p className="font-mono text-indigo-800 break-all">{pedidoSeleccionado.pago.idTransaccion}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="px-6 py-2.5 bg-black text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
