import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  Printer,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { ordersApi } from '../services/orders.api';
import { Pedido } from '../types';

export const OrdersPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const data = await ordersApi.obtenerMisPedidos();
      setPedidos(data);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setCargando(false);
    }
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado === 'TODOS') return true;
    if (filtroEstado === 'PAGADO') return p.estado === 'PAGADO' || p.pago?.estado === 'APROBADO';
    if (filtroEstado === 'PENDIENTE') return p.estado === 'PENDIENTE' || p.pago?.estado === 'PENDIENTE';
    if (filtroEstado === 'REEMBOLSADO') return p.estado === 'REEMBOLSADO' || p.pago?.estado === 'REEMBOLSADO';
    return true;
  });

  const getStatusBadge = (estado: string, estadoPago?: string) => {
    if (estado === 'REEMBOLSADO' || estadoPago === 'REEMBOLSADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
          <RotateCcw className="w-3.5 h-3.5" />
          Reembolsado
        </span>
      );
    }
    if (estado === 'PAGADO' || estadoPago === 'APROBADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Pago Aprobado
        </span>
      );
    }
    if (estado === 'PENDIENTE' || estadoPago === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <Clock className="w-3.5 h-3.5" />
          Pago Pendiente
        </span>
      );
    }
    if (estado === 'CANCELADO' || estadoPago === 'RECHAZADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
          <XCircle className="w-3.5 h-3.5" />
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
        {estado}
      </span>
    );
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            <Link to="/" className="hover:text-black">Inicio</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-black">Mis Pedidos</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Historial de Compras</h1>
        </div>

        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition shadow-sm self-start sm:self-auto"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Comprar más</span>
        </Link>
      </div>

      {/* FILTROS DE ESTADO */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {[
          { id: 'TODOS', label: 'Todos los Pedidos' },
          { id: 'PAGADO', label: 'Pagados / Aprobados' },
          { id: 'PENDIENTE', label: 'Pendientes (Contra Entrega)' },
          { id: 'REEMBOLSADO', label: 'Reembolsados' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFiltroEstado(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              filtroEstado === tab.id
                ? 'bg-black text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* LISTA DE PEDIDOS */}
      {cargando ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-gray-500">Cargando tus pedidos...</p>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No se encontraron pedidos</h2>
          <p className="text-gray-500 mb-6 text-sm">
            {filtroEstado === 'TODOS'
              ? 'Aún no has realizado ninguna compra en El Magnífico.'
              : `No tienes pedidos con estado "${filtroEstado}".`}
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition text-sm"
          >
            Ir al Catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidosFiltrados.map((pedido) => (
            <div
              key={pedido.id}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition space-y-4"
            >
              {/* TOP ROW: NRO, FECHA, BADGE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-base font-black text-gray-900">{pedido.nro}</span>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(pedido.fecha).toLocaleDateString('es-BO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {getStatusBadge(pedido.estado, pedido.pago?.estado)}
                </div>
              </div>

              {/* ITEMS PREVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Prendas ({pedido.items?.length || 0})
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {pedido.items?.map((it: any) => (
                      <div key={it.id} className="text-xs flex justify-between items-center py-1">
                        <span className="font-semibold text-gray-800 truncate mr-2">
                          {it.nombre} <span className="text-gray-400 font-normal">({it.talla} / {it.color}) × {it.cantidad}</span>
                        </span>
                        <span className="font-bold text-gray-900 flex-shrink-0">
                          Bs. {Number(it.subtotal || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INFO DE PAGO Y TOTAL */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-between border border-gray-100">
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Método de Pago:</span>
                      <span className="font-bold text-gray-900">
                        {pedido.pago?.metodoPago || 'Tarjeta Stripe'}
                      </span>
                    </div>
                    {pedido.pago?.idTransaccion && (
                      <div className="flex justify-between">
                        <span>Transacción:</span>
                        <span className="font-mono text-gray-500 truncate max-w-[160px]">
                          {pedido.pago.idTransaccion}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200 mt-2 flex justify-between items-baseline">
                    <span className="text-xs font-bold uppercase text-gray-500">Total Pedido</span>
                    <span className="text-xl font-black text-gray-900">
                      Bs. {Number(pedido.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setPedidoSeleccionado(pedido)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Comprobante Completo</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DETALLE DE COMPROBANTE */}
      {pedidoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Comprobante de Pago</span>
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
              {/* STATUS BANNER */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block">Estado del Pago</span>
                  <p className="text-sm font-bold text-gray-900">{pedidoSeleccionado.pago?.estado || 'APROBADO'}</p>
                </div>
                {getStatusBadge(pedidoSeleccionado.estado, pedidoSeleccionado.pago?.estado)}
              </div>

              {/* DETALLES DE COMPRA */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prendas Adquiridas</h3>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {pedidoSeleccionado.items?.map((it: any) => (
                    <div key={it.id} className="p-3 flex justify-between items-center text-sm bg-white">
                      <div>
                        <p className="font-bold text-gray-900">{it.nombre}</p>
                        <p className="text-xs text-gray-500">
                          Talla: {it.talla} · Color: {it.color} · Cantidad: {it.cantidad}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">Bs. {Number(it.subtotal || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTALES */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm border border-gray-200">
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
                <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-300">
                  <span>Total</span>
                  <span>Bs. {Number(pedidoSeleccionado.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* DATOS DE PASARELA */}
              {pedidoSeleccionado.pago?.idTransaccion && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-1">
                  <span className="font-bold text-indigo-950 block">Referencia de Pasarela Stripe:</span>
                  <p className="font-mono text-indigo-800 break-all">{pedidoSeleccionado.pago.idTransaccion}</p>
                </div>
              )}
            </div>

            {/* BOTONES MODAL */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 border border-gray-300 rounded-xl font-bold text-xs hover:bg-gray-50 flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
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
