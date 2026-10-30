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
import * as XLSX from 'xlsx';
import { adminApi } from '../services/admin.api';
import { ReporteVentasRespuesta, ReportePedido, ReporteVentasFiltros } from '../types';
import { obtenerCategorias } from '../../catalogo/services/catalogo.api';
import { adminUsuariosApi, UsuarioAdmin } from '../usuarios/admin-usuarios.api';

export const AdminReportsPage: React.FC = () => {
  // Preset de fechas
  const [preset, setPreset] = useState<string>('este_mes');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [estado, setEstado] = useState<string>('TODOS');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [usuarioId, setUsuarioId] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [pagina, setPagina] = useState<number>(1);

  // Listas para filtros desplegables
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [listaUsuarios, setListaUsuarios] = useState<UsuarioAdmin[]>([]);

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

  // Inicializar con preset 'este_mes' y cargar combos de categorías y usuarios
  useEffect(() => {
    aplicarPreset('este_mes');
    const cargarCatalogosFiltros = async () => {
      try {
        const [cats, usersRes] = await Promise.all([
          obtenerCategorias().catch(() => []),
          adminUsuariosApi.listarUsuarios(1, 100).catch(() => ({ usuarios: [] })),
        ]);
        setListaCategorias(cats || []);
        setListaUsuarios(usersRes.usuarios || []);
      } catch (err) {
        console.error('Error cargando listas de filtros:', err);
      }
    };
    cargarCatalogosFiltros();
  }, []);

  const cargarReporte = async () => {
    try {
      setCargando(true);
      const filtros: ReporteVentasFiltros = {
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        estado: estado !== 'TODOS' ? estado : undefined,
        categoriaId: categoriaId || undefined,
        usuarioId: usuarioId || undefined,
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
  }, [fechaInicio, fechaFin, estado, categoriaId, usuarioId, pagina]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    cargarReporte();
  };

  // Exportación nativa a Excel (.xlsx)
  const exportarExcel = () => {
    if (!reporte || reporte.pedidos.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const rows = reporte.pedidos.map((p) => {
      const fechaStr = new Date(p.creadoEn).toLocaleString('es-BO');
      const itemsStr = p.items
        .map((i) => `${i.nombreProducto} x${i.cantidad} (${i.talla || 'N/A'}/${i.color || 'N/A'})`)
        .join(' | ');

      return {
        'NRO ORDEN': p.nro,
        'FECHA Y HORA': fechaStr,
        'CLIENTE': p.cliente?.nombre || 'General',
        'EMAIL': p.cliente?.correo || 'N/A',
        'ESTADO': p.estado,
        'METODO PAGO': p.metodoPago,
        'CUPON': p.cuponCodigo || 'Sin cupon',
        'SUBTOTAL ($)': Number(p.subtotal.toFixed(2)),
        'DESCUENTO ($)': Number(p.descuento.toFixed(2)),
        'ENVIO ($)': Number(p.costoEnvio.toFixed(2)),
        'TOTAL ($)': Number(p.total.toFixed(2)),
        'PRODUCTOS': itemsStr,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 22 },
      { wch: 25 },
      { wch: 14 },
      { wch: 15 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 45 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Ventas');

    const fileName = `reporte_ventas_${fechaInicio || 'inicio'}_a_${fechaFin || 'fin'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E1D7] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9B7B54]">
              Módulo de Administración
            </span>
          </div>
          <h1 className="text-3xl font-serif tracking-tight text-stone-900">
            Reportes de Ventas
          </h1>
          <p className="text-sm text-stone-500">
            Filtra órdenes por rango de fechas, estados y genera exportaciones contables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/reportes-dinamicos"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF8F5] border border-[#E7E1D7] text-stone-900 hover:text-[#9B7B54] hover:bg-[#F2ECE1] text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-[#9B7B54]" />
            <span>Reportes Dinámicos (Voz / IA)</span>
          </Link>
          <button
            onClick={imprimirReporte}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E7E1D7] rounded-lg text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-[#FAF8F5] transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* FILTROS Y SELECTOR DE FECHAS */}
      <div className="bg-white p-6 rounded-xl border border-[#E7E1D7] shadow-xs space-y-5">
        {/* Presets de Fecha Rápidos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] mr-1">
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
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-stone-700 hover:bg-[#F2ECE1] border border-[#E7E1D7]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Formulario de Filtros */}
        <form onSubmit={handleBuscar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Fecha Inicio
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setPreset('custom');
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E7E1D7] rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 bg-white text-stone-900"
              />
            </div>
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Fecha Fin
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setPreset('custom');
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E7E1D7] rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 bg-white text-stone-900"
              />
            </div>
          </div>

          {/* Estado de Pedido */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Estado de Pedido
            </label>
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPagina(1);
              }}
              className="w-full px-3 py-2 text-sm border border-[#E7E1D7] rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 bg-white text-stone-900"
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

          {/* Filtro por Categoría */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Filtrar por Categoría
            </label>
            <select
              value={categoriaId}
              onChange={(e) => {
                setCategoriaId(e.target.value);
                setPagina(1);
              }}
              className="w-full px-3 py-2 text-sm border border-[#E7E1D7] rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 bg-white text-stone-900"
            >
              <option value="">Todas las categorías</option>
              {listaCategorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Cliente Específico */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Filtrar por Cliente
            </label>
            <select
              value={usuarioId}
              onChange={(e) => {
                setUsuarioId(e.target.value);
                setPagina(1);
              }}
              className="w-full px-3 py-2 text-sm border border-[#E7E1D7] rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 bg-white text-stone-900"
            >
              <option value="">Todos los clientes</option>
              {listaUsuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} ({u.correo})
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda Cliente / Pedido */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Buscar Pedido / Texto
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="N° orden, nombre, correo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#E7E1D7] rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 bg-white text-stone-900"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-800 transition-colors"
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
          <div className="bg-white p-5 rounded-xl border border-[#E7E1D7] shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Total Facturado
            </span>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-1">
              ${reporte.resumen.totalFacturado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-stone-500">
              {reporte.resumen.totalPedidos} órdenes registradas
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E7E1D7] shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Ticket Promedio
            </span>
            <div className="text-2xl font-serif font-bold text-[#9B7B54] mt-1">
              ${reporte.resumen.ticketMedio.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-stone-500">
              Promedio por pedido en el período
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E7E1D7] shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Descuentos Otorgados
            </span>
            <div className="text-2xl font-serif font-bold text-stone-800 mt-1">
              - ${reporte.resumen.totalDescuentos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-stone-500">
              Por cupones y promociones
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E7E1D7] shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Recaudación de Envíos
            </span>
            <div className="text-2xl font-serif font-bold text-stone-900 mt-1">
              ${reporte.resumen.totalEnvios.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-stone-500">
              Costos logísticos cobrados
            </span>
          </div>
        </div>
      )}

      {/* TABLA DETALLADA DE PEDIDOS */}
      <div className="bg-white rounded-xl border border-[#E7E1D7] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E7E1D7] flex items-center justify-between">
          <div>
            <h3 className="text-base font-serif font-bold text-stone-900">Listado de Órdenes</h3>
            <p className="text-xs text-stone-500">
              Mostrando {reporte?.pedidos.length || 0} de {reporte?.paginacion.totalRegistros || 0} pedidos encontrados
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="py-16 text-center text-xs uppercase tracking-widest text-stone-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-stone-900" />
            Cargando registros...
          </div>
        ) : !reporte || reporte.pedidos.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm">
            No se encontraron pedidos con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-stone-600 uppercase font-bold text-[10px] tracking-wider border-b border-[#E7E1D7]">
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
              <tbody className="divide-y divide-[#E7E1D7]/60">
                {reporte.pedidos.map((p) => {
                  const fechaFormat = new Date(p.fecha).toLocaleDateString('es-BO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {p.nro}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                        {fechaFormat}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{p.cliente.nombre}</div>
                        <div className="text-[11px] text-stone-400 font-mono">{p.cliente.correo}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 bg-[#FAF8F5] border border-[#E7E1D7] font-bold rounded text-stone-700">
                          {p.cantidadItems}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-stone-600 font-medium">
                        ${p.subtotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium">
                        {p.descuento > 0 ? (
                          <span className="text-stone-800 font-semibold">- ${p.descuento.toFixed(2)}</span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-serif font-bold text-stone-900">
                        ${p.total.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            p.estado === 'COMPLETADO' || p.estado === 'ENTREGADO'
                              ? 'bg-stone-900 text-white'
                              : p.estado === 'PAGADO' || p.estado === 'ENVIADO'
                              ? 'bg-[#FAF8F5] text-stone-800 border border-[#E7E1D7]'
                              : p.estado === 'PENDIENTE'
                              ? 'bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7]'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setPedidoDetalle(p)}
                          className="p-1.5 text-stone-400 hover:text-stone-900 rounded hover:bg-[#FAF8F5] transition-colors"
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
          <div className="p-4 border-t border-[#E7E1D7] flex items-center justify-between text-xs">
            <span className="text-stone-500">
              Página {reporte.paginacion.paginaActual} de {reporte.paginacion.totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                disabled={reporte.paginacion.paginaActual <= 1}
                onClick={() => setPagina((prev) => prev - 1)}
                className="px-3 py-1.5 border border-[#E7E1D7] rounded font-semibold disabled:opacity-40 hover:bg-[#FAF8F5] text-stone-700"
              >
                Anterior
              </button>
              <button
                disabled={reporte.paginacion.paginaActual >= reporte.paginacion.totalPaginas}
                onClick={() => setPagina((prev) => prev + 1)}
                className="px-3 py-1.5 border border-[#E7E1D7] rounded font-semibold disabled:opacity-40 hover:bg-[#FAF8F5] text-stone-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE ARTÍCULOS DE LA ORDEN */}
      {pedidoDetalle && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 border border-[#E7E1D7]">
            <div className="flex items-center justify-between border-b border-[#E7E1D7] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9B7B54]">
                  Detalle del Pedido
                </span>
                <h3 className="text-xl font-serif font-bold text-stone-900">{pedidoDetalle.nro}</h3>
              </div>
              <button
                onClick={() => setPedidoDetalle(null)}
                className="p-2 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FAF8F5] border border-[#E7E1D7] p-4 rounded-xl text-xs space-y-1 text-stone-700">
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                Prendas Compradas
              </h4>
              <div className="divide-y divide-[#E7E1D7]/60 max-h-60 overflow-y-auto">
                {pedidoDetalle.items.map((item, idx) => (
                  <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-stone-900">{item.nombreProducto}</div>
                      <div className="text-[11px] text-stone-500">
                        {item.talla ? `Talla: ${item.talla}` : ''} {item.color ? `· Color: ${item.color}` : ''} · Cant: {item.cantidad} x ${item.precio.toFixed(2)}
                      </div>
                    </div>
                    <div className="font-serif font-bold text-stone-900">
                      ${item.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E7E1D7] pt-4 space-y-1.5 text-xs text-right">
              <div className="text-stone-500">Subtotal: ${pedidoDetalle.subtotal.toFixed(2)}</div>
              {pedidoDetalle.descuento > 0 && (
                <div className="text-stone-800 font-semibold">
                  Descuento: - ${pedidoDetalle.descuento.toFixed(2)}
                </div>
              )}
              {pedidoDetalle.costoEnvio > 0 && (
                <div className="text-stone-500">Envío: ${pedidoDetalle.costoEnvio.toFixed(2)}</div>
              )}
              <div className="text-base font-serif font-bold text-stone-900 pt-1">
                Total: ${pedidoDetalle.total.toFixed(2)}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setPedidoDetalle(null)}
                className="w-full py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-bold rounded-lg hover:bg-stone-800 transition-colors"
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
