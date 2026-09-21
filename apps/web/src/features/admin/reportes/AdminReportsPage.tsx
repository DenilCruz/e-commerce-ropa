import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Printer,
  Search,
  Calendar,
  RefreshCw,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../services/admin.api';
import { ReporteVentasRespuesta, ReportePedido, ReporteVentasFiltros } from '../types';

export const AdminReportsPage: React.FC = () => {
  // Preset de fechas
  const [preset, setPreset] = useState<string>('este_mes');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [estado, setEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [pagina, setPagina] = useState<number>(1);

  const [reporte, setReporte] = useState<ReporteVentasRespuesta | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [pedidoDetalle, setPedidoDetalle] = useState<ReportePedido | null>(null);

  // Función para calcular presets
  const aplicarPreset = (tipo: string) => {
    setPreset(tipo);
    const ahora = new Date();
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (tipo === 'hoy') {
      const hoy = toYMD(ahora);
      setFechaInicio(hoy);
      setFechaFin(hoy);
    } else if (tipo === 'ayer') {
      const ayer = new Date(ahora);
      ayer.setDate(ahora.getDate() - 1);
      const str = toYMD(ayer);
      setFechaInicio(str);
      setFechaFin(str);
    } else if (tipo === '7_dias') {
      const inicio = new Date(ahora);
      inicio.setDate(ahora.getDate() - 6);
      setFechaInicio(toYMD(inicio));
      setFechaFin(toYMD(ahora));
    } else if (tipo === 'este_mes') {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      setFechaInicio(toYMD(inicio));
      setFechaFin(toYMD(ahora));
    } else if (tipo === '30_dias') {
      const inicio = new Date(ahora);
      inicio.setDate(ahora.getDate() - 29);
      setFechaInicio(toYMD(inicio));
      setFechaFin(toYMD(ahora));
    } else if (tipo === 'todo') {
      setFechaInicio('');
      setFechaFin('');
    }
    setPagina(1);
  };

  // Inicializar con preset 'este_mes'
  useEffect(() => {
    aplicarPreset('este_mes');
  }, []);

  const cargarReporte = async () => {
    try {
      setCargando(true);
      const filtros: ReporteVentasFiltros = {
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        estado: estado !== 'TODOS' ? estado : undefined,
        busqueda: busqueda.trim() || undefined,
        pagina,
        limite: 20,
      };
      const data = await adminApi.generarReporteVentas(filtros);
      setReporte(data);
    } catch (error) {
      console.error('Error generando reporte de ventas', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (fechaInicio !== undefined && fechaFin !== undefined) {
      cargarReporte();
    }
  }, [fechaInicio, fechaFin, estado, pagina]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    cargarReporte();
  };

  // HU-92: Exportación a CSV formateado con UTF-8 BOM
  const exportarCSV = () => {
    if (!reporte || reporte.pedidos.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const headers = [
      'Nro Pedido',
      'Fecha',
      'Cliente',
      'Correo',
      'Estado',
      'Metodo de Pago',
      'Cupon',
      'Subtotal (Bs)',
      'Descuento (Bs)',
      'Envio (Bs)',
      'Total (Bs)',
      'Items',
    ];

    const rows = reporte.pedidos.map((p) => {
      const fechaStr = new Date(p.fecha).toLocaleString('es-BO');
      const itemsStr = p.items
        .map((i) => `${i.nombreProducto} x${i.cantidad} (${i.talla || 'N/A'}/${i.color || 'N/A'})`)
        .join(' | ');

      return [
        `"${p.nro}"`,
        `"${fechaStr}"`,
        `"${p.cliente?.nombre || 'General'}"`,
        `"${p.cliente?.correo || 'N/A'}"`,
        `"${p.estado}"`,
        `"${p.metodoPago}"`,
        `"${p.cuponCodigo || 'Sin cupon'}"`,
        p.subtotal.toFixed(2),
        p.descuento.toFixed(2),
        p.costoEnvio.toFixed(2),
        p.total.toFixed(2),
        `"${itemsStr}"`,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `reporte_ventas_${fechaInicio || 'inicio'}_a_${fechaFin || 'fin'}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const imprimirReporte = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
              Módulo de Administración
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            Reportes de Ventas
          </h1>
          <p className="text-sm text-gray-500">
            Filtra órdenes por rango de fechas, estados y genera exportaciones contables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/reportes-dinamicos"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Reportes Dinámicos (Voz / IA)</span>
          </Link>
          <button
            onClick={imprimirReporte}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* FILTROS Y SELECTOR DE FECHAS */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        {/* Presets de Fecha Rápidos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mr-1">
            Rango Rápido:
          </span>
          {[
            { id: 'hoy', label: 'Hoy' },
            { id: 'ayer', label: 'Ayer' },
            { id: '7_dias', label: 'Últimos 7 días' },
            { id: 'este_mes', label: 'Este Mes' },
            { id: '30_dias', label: 'Últimos 30 días' },
            { id: 'todo', label: 'Histórico Total' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => aplicarPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                preset === p.id
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Formulario de Filtros */}
        <form onSubmit={handleBuscar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Fecha Inicio
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setPreset('custom');
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Fecha Fin
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setPreset('custom');
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Estado de Pedido */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Estado de Pedido
            </label>
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPagina(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PAGADO">PAGADO</option>
              <option value="COMPLETADO">COMPLETADO</option>
              <option value="ENTREGADO">ENTREGADO</option>
              <option value="ENVIADO">ENVIADO</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>
          </div>

          {/* Búsqueda Cliente / Pedido */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Buscar Pedido / Cliente
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="N° orden, nombre, correo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors"
              >
                Filtrar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* KPIS DEL RANGO SELECCIONADO */}
      {reporte?.resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Facturado
            </span>
            <div className="text-2xl font-black text-gray-900 mt-1">
              Bs. {reporte.resumen.totalFacturado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-gray-500">
              {reporte.resumen.totalPedidos} órdenes registradas
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Ticket Promedio
            </span>
            <div className="text-2xl font-black text-purple-700 mt-1">
              Bs. {reporte.resumen.ticketMedio.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-gray-500">
              Promedio por pedido en el período
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Descuentos Otorgados
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              - Bs. {reporte.resumen.totalDescuentos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-gray-500">
              Por cupones y promociones
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Recaudación de Envíos
            </span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              Bs. {reporte.resumen.totalEnvios.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-gray-500">
              Costos logísticos cobrados
            </span>
          </div>
        </div>
      )}

      {/* TABLA DETALLADA DE PEDIDOS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Listado de Órdenes</h3>
            <p className="text-xs text-gray-500">
              Mostrando {reporte?.pedidos.length || 0} de {reporte?.paginacion.totalRegistros || 0} pedidos encontrados
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="py-16 text-center text-xs uppercase tracking-widest text-gray-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-black" />
            Cargando registros...
          </div>
        ) : !reporte || reporte.pedidos.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No se encontraron pedidos con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">N° Pedido</th>
                  <th className="py-3.5 px-4">Fecha / Hora</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Subtotal</th>
                  <th className="py-3.5 px-4 text-right">Descuento</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reporte.pedidos.map((p) => {
                  const fechaFormat = new Date(p.fecha).toLocaleDateString('es-BO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {p.nro}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        {fechaFormat}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{p.cliente.nombre}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{p.cliente.correo}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 font-bold rounded text-gray-700">
                          {p.cantidadItems}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-600 font-medium">
                        Bs. {p.subtotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium">
                        {p.descuento > 0 ? (
                          <span className="text-emerald-600">- Bs. {p.descuento.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-gray-900">
                        Bs. {p.total.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            p.estado === 'COMPLETADO' || p.estado === 'ENTREGADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.estado === 'PAGADO' || p.estado === 'ENVIADO'
                              ? 'bg-blue-100 text-blue-800'
                              : p.estado === 'PENDIENTE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setPedidoDetalle(p)}
                          className="p-1.5 text-gray-400 hover:text-black rounded hover:bg-gray-100 transition-colors"
                          title="Ver detalle de artículos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {reporte && reporte.paginacion.totalPaginas > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Página {reporte.paginacion.paginaActual} de {reporte.paginacion.totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                disabled={reporte.paginacion.paginaActual <= 1}
                onClick={() => setPagina((prev) => prev - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded font-semibold disabled:opacity-40 hover:bg-gray-100"
              >
                Anterior
              </button>
              <button
                disabled={reporte.paginacion.paginaActual >= reporte.paginacion.totalPaginas}
                onClick={() => setPagina((prev) => prev + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded font-semibold disabled:opacity-40 hover:bg-gray-100"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE ARTÍCULOS DE LA ORDEN */}
      {pedidoDetalle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Detalle del Pedido
                </span>
                <h3 className="text-xl font-black text-gray-900">{pedidoDetalle.nro}</h3>
              </div>
              <button
                onClick={() => setPedidoDetalle(null)}
                className="p-2 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-1">
              <div>
                <strong>Cliente:</strong> {pedidoDetalle.cliente.nombre} ({pedidoDetalle.cliente.correo})
              </div>
              <div>
                <strong>Método de Pago:</strong> {pedidoDetalle.metodoPago}
              </div>
              {pedidoDetalle.cuponCodigo && (
                <div>
                  <strong>Cupón Aplicado:</strong> {pedidoDetalle.cuponCodigo}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Prendas Compradas
              </h4>
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {pedidoDetalle.items.map((item, idx) => (
                  <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-gray-900">{item.nombreProducto}</div>
                      <div className="text-[11px] text-gray-500">
                        {item.talla ? `Talla: ${item.talla}` : ''} {item.color ? `· Color: ${item.color}` : ''} · Cant: {item.cantidad} x Bs. {item.precio.toFixed(2)}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">
                      Bs. {item.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-1.5 text-xs text-right">
              <div className="text-gray-500">Subtotal: Bs. {pedidoDetalle.subtotal.toFixed(2)}</div>
              {pedidoDetalle.descuento > 0 && (
                <div className="text-emerald-600 font-semibold">
                  Descuento: - Bs. {pedidoDetalle.descuento.toFixed(2)}
                </div>
              )}
              {pedidoDetalle.costoEnvio > 0 && (
                <div className="text-gray-500">Envío: Bs. {pedidoDetalle.costoEnvio.toFixed(2)}</div>
              )}
              <div className="text-base font-black text-gray-900 pt-1">
                Total: Bs. {pedidoDetalle.total.toFixed(2)}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setPedidoDetalle(null)}
                className="w-full py-2.5 bg-black text-white text-xs uppercase tracking-wider font-bold rounded-lg hover:bg-gray-800"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
