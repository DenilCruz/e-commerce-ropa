import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  FileText,
  ArrowRight,
  RefreshCw,
  Package,
  ChevronRight,
  Shirt,
  FolderTree,
  Image as ImageIcon,
  Star,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../services/admin.api';
import { useAuthStore } from '../../../store/auth.store';
import {
  DashboardMetricas,
  ProductoMasVendido,
  AlertaStock,
  UsuariosNuevosRespuesta,
} from '../types';

export const AdminDashboardPage: React.FC = () => {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [productosTop, setProductosTop] = useState<ProductoMasVendido[]>([]);
  const [alertasStock, setAlertasStock] = useState<AlertaStock[]>([]);
  const [usuariosData, setUsuariosData] = useState<UsuariosNuevosRespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDia, setHoveredDia] = useState<{ fecha: string; dia: string; total: number; pedidos: number } | null>(null);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError(null);
      const [resumen, top, stock, usuarios] = await Promise.all([
        adminApi.obtenerDashboardResumen(),
        adminApi.obtenerProductosTop(6),
        adminApi.obtenerStockBajo(),
        adminApi.obtenerUsuariosMes(6),
      ]);

      setMetricas(resumen);
      setProductosTop(top);
      setAlertasStock(stock);
      setUsuariosData(usuarios);
    } catch (err: any) {
      console.error('Error cargando datos del dashboard:', err);
      setError(err.response?.data?.message || 'Error al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [tenantId]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-black animate-spin" />
        <p className="text-xs uppercase tracking-widest text-gray-500 font-medium">
          Cargando métricas del panel...
        </p>
      </div>
    );
  }

  if (error || !metricas) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-red-50 border border-red-200 text-center rounded-lg">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 mb-1">No se pudieron cargar las métricas</h3>
        <p className="text-sm text-red-600 mb-6">{error || 'Intenta nuevamente más tarde.'}</p>
        <button
          onClick={cargarDatos}
          className="px-5 py-2.5 bg-black text-white text-xs uppercase tracking-wider font-semibold rounded hover:bg-gray-800 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Encontrar el valor máximo para escalar el gráfico de 30 días
  const maxVentaDia = Math.max(...metricas.tendenciaVentas.map((d) => d.total), 100);
  const maxUnidadesVendidas = Math.max(...productosTop.map((p) => p.unidadesVendidas), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E1D7] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9B7B54]">
              Panel Administrativo en Vivo
            </span>
          </div>
          <h1 className="text-3xl font-serif tracking-tight text-stone-900">Dashboard de Ventas & Gestión</h1>
          <p className="text-sm text-stone-500">
            Monitoreo en tiempo real de ingresos, productos líderes, inventario y catálogo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cargarDatos}
            title="Refrescar métricas"
            className="p-2.5 border border-[#E7E1D7] rounded-lg hover:bg-[#FAF8F5] text-stone-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/admin/reportes"
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-bold rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Generar Reporte</span>
          </Link>
        </div>
      </div>

      {/* TABS DE CONMUTACIÓN DE DASHBOARD (DESCRIPTIVO VS PREDICTIVO VS VOZ) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E7E1D7] pb-2">
        <span className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 text-white rounded-lg shadow-xs">
          📊 Dashboard Descriptivo (Lo ocurrido)
        </span>
        <Link
          to="/admin/dashboard-predictivo"
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#FAF8F5] text-[#9B7B54] hover:bg-[#F2ECE1] rounded-lg transition-colors border border-[#E7E1D7]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#9B7B54]" />
          <span>Dashboard Predictivo (IA & Proyecciones)</span>
        </Link>
        <Link
          to="/admin/reportes-dinamicos"
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white text-stone-700 hover:bg-[#FAF8F5] rounded-lg transition-colors border border-[#E7E1D7]"
        >
          <span>🎙️ Consultas por Voz</span>
        </Link>
      </div>

      {/* TARJETAS DE MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Ventas Hoy */}
        <div className="bg-white p-6 rounded-xl border border-[#E7E1D7] shadow-xs hover:border-stone-400 transition-colors">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Ventas de Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold tracking-tight text-stone-900 mb-1">
            ${metricas.ventasHoy.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <span className="font-semibold text-stone-800">{metricas.ventasHoy.cantidad}</span> pedidos registrados hoy
          </div>
        </div>

        {/* Ventas del Mes */}
        <div className="bg-white p-6 rounded-xl border border-[#E7E1D7] shadow-xs hover:border-stone-400 transition-colors">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Ventas del Mes</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-stone-900 border border-[#E7E1D7] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold tracking-tight text-stone-900 mb-1">
            ${metricas.ventasMes.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            {metricas.ventasMes.crecimientoVsMesAnterior !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-[11px] ${
                  metricas.ventasMes.crecimientoVsMesAnterior >= 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {metricas.ventasMes.crecimientoVsMesAnterior >= 0 ? '+' : ''}
                {metricas.ventasMes.crecimientoVsMesAnterior}%
              </span>
            )}
            <span className="text-stone-500">{metricas.ventasMes.cantidad} pedidos este mes</span>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white p-6 rounded-xl border border-[#E7E1D7] shadow-xs hover:border-stone-400 transition-colors">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Ticket Promedio</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold tracking-tight text-[#9B7B54] mb-1">
            ${metricas.ticketPromedio.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-stone-500">
            Promedio por transacción en el mes
          </div>
        </div>

        {/* Crecimiento Usuarios */}
        <div className="bg-white p-6 rounded-xl border border-[#E7E1D7] shadow-xs hover:border-stone-400 transition-colors">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Nuevos Usuarios</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-stone-700 border border-[#E7E1D7] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold tracking-tight text-stone-900 mb-1">
            +{usuariosData?.resumen.nuevosEsteMes || 0}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-500">
              Total registrados: <strong className="text-stone-800">{usuariosData?.resumen.totalUsuarios || 0}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* GRÁFICO DE TENDENCIA DE VENTAS (ÚLTIMOS 30 DÍAS) */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Tendencia de Ingresos Diarios</h2>
            <p className="text-xs text-gray-500">Comportamiento de ventas en los últimos 30 días</p>
          </div>
          {hoveredDia ? (
            <div className="text-right bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500 font-medium">{hoveredDia.dia}: </span>
              <strong className="text-sm font-bold text-gray-900">
                ${hoveredDia.total.toFixed(2)}
              </strong>
              <span className="text-xs text-gray-400 ml-1">({hoveredDia.pedidos} pedidos)</span>
            </div>
          ) : (
            <div className="text-xs text-gray-400">Pasa el cursor sobre una barra para ver detalle</div>
          )}
        </div>

        {/* Gráfico de Barras SVG / Tailwind */}
        <div className="h-48 flex items-end gap-1.5 pt-6 pb-2 border-b border-gray-100">
          {metricas.tendenciaVentas.map((dia) => {
            const heightPercent = maxVentaDia > 0 ? (dia.total / maxVentaDia) * 100 : 0;
            const tieneVenta = dia.total > 0;

            return (
              <div
                key={dia.fecha}
                className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                onMouseEnter={() => setHoveredDia(dia)}
                onMouseLeave={() => setHoveredDia(null)}
              >
                {/* Tooltip flotante */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-20">
                  <div className="bg-gray-900 text-white text-[10px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap">
                    <div className="font-bold">${dia.total.toFixed(2)}</div>
                    <div className="text-gray-300 text-[9px]">{dia.dia} · {dia.pedidos} ord.</div>
                  </div>
                  <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                </div>

                {/* Barra */}
                <div
                  style={{ height: `${Math.max(heightPercent, tieneVenta ? 8 : 2)}%` }}
                  className={`w-full rounded-t transition-all duration-200 ${
                    tieneVenta
                      ? 'bg-stone-900 group-hover:bg-[#9B7B54]'
                      : 'bg-[#FAF8F5] border border-[#E7E1D7]/50 group-hover:bg-[#F2ECE1]'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Eje X Fechas */}
        <div className="flex justify-between text-[10px] text-stone-400 mt-2">
          <span>{metricas.tendenciaVentas[0]?.dia}</span>
          <span>{metricas.tendenciaVentas[14]?.dia}</span>
          <span>{metricas.tendenciaVentas[metricas.tendenciaVentas.length - 1]?.dia} (Hoy)</span>
        </div>
      </div>

      {/* SECCIÓN DOBLE: PRODUCTOS MÁS VENDIDOS Y ALERTAS DE INVENTARIO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PRODUCTOS MÁS VENDIDOS */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-[#E7E1D7] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-stone-700" />
                <h2 className="text-lg font-serif font-bold text-stone-900">Productos Más Vendidos</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Top prendas con mayor volumen de venta</p>
            </div>
            <Link
              to="/admin/productos"
              className="text-xs font-semibold text-[#9B7B54] hover:underline flex items-center gap-1"
            >
              Ver catálogo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {productosTop.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              No hay registros de ventas suficientes aún.
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {productosTop.map((p, idx) => {
                const percent = (p.unidadesVendidas / maxUnidadesVendidas) * 100;
                return (
                  <div key={p.productoId || idx} className="p-3 rounded-lg border border-[#E7E1D7]/60 hover:border-[#E7E1D7] hover:bg-[#FAF8F5]/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#FAF8F5] border border-[#E7E1D7] text-stone-700 text-xs font-bold flex items-center justify-center font-serif">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-900 line-clamp-1">{p.nombre}</h4>
                          <span className="text-[11px] text-stone-400">{p.categoria} · Stock: {p.stockActual} uds</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-serif font-bold text-stone-900">
                          {p.unidadesVendidas} <span className="text-xs font-normal text-stone-500 font-sans">uds</span>
                        </div>
                        <div className="text-[11px] text-[#9B7B54] font-semibold">
                          ${p.ingresosGenerados.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-[#FAF8F5] border border-[#E7E1D7]/50 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(percent, 5)}%` }}
                        className="bg-stone-900 h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ALERTAS DE STOCK BAJO */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-[#E7E1D7] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#9B7B54]" />
                <h2 className="text-lg font-serif font-bold text-stone-900">Alertas de Inventario</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Prendas con stock mínimo o agotadas</p>
            </div>
            <Link
              to="/admin/inventario"
              className="text-xs font-semibold text-[#9B7B54] hover:underline flex items-center gap-1"
            >
              Gestionar stock <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {alertasStock.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#E7E1D7] text-[#9B7B54] flex items-center justify-center mb-2 font-serif">
                ✓
              </div>
              <span>Todos los productos cuentan con niveles óptimos de stock.</span>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {alertasStock.map((alerta) => (
                <div
                  key={alerta.varianteId}
                  className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 ${
                    alerta.estadoStock === 'AGOTADO'
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-[#FAF8F5] border-[#E7E1D7]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          alerta.estadoStock === 'AGOTADO'
                            ? 'bg-rose-600 text-white'
                            : 'bg-stone-900 text-white'
                        }`}
                      >
                        {alerta.estadoStock}
                      </span>
                      <h4 className="text-xs font-bold text-stone-900 line-clamp-1">
                        {alerta.nombreProducto}
                      </h4>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                      SKU: <span className="font-mono text-stone-700">{alerta.sku}</span> · Talla: {alerta.talla} · Color: {alerta.color}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-stone-900">
                      {alerta.stockActual} / {alerta.stockMinimo} <span className="text-[10px] text-stone-400">mín</span>
                    </div>
                    <Link
                      to="/admin/inventario"
                      className="text-[11px] font-semibold text-[#9B7B54] hover:underline mt-0.5 inline-block"
                    >
                      Reabastecer →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MÓDULOS DE GESTIÓN Y ACCESO RÁPIDO */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg font-serif font-bold text-stone-900">Módulos Administrativos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link
            to="/admin/productos"
            className="p-4 bg-white rounded-xl border border-[#E7E1D7] hover:border-stone-900 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="p-2.5 w-fit bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg text-stone-800 group-hover:bg-stone-900 group-hover:text-white transition-colors mb-2">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 group-hover:text-stone-900 text-sm">Productos</h4>
              <p className="text-[11px] text-stone-500">Prendas y variantes</p>
            </div>
          </Link>

          <Link
            to="/admin/categorias"
            className="p-4 bg-white rounded-xl border border-[#E7E1D7] hover:border-stone-900 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="p-2.5 w-fit bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg text-[#9B7B54] group-hover:bg-stone-900 group-hover:text-white transition-colors mb-2">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 group-hover:text-stone-900 text-sm">Categorías</h4>
              <p className="text-[11px] text-stone-500">Árbol y líneas</p>
            </div>
          </Link>

          <Link
            to="/admin/inventario"
            className="p-4 bg-white rounded-xl border border-[#E7E1D7] hover:border-stone-900 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="p-2.5 w-fit bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg text-stone-800 group-hover:bg-stone-900 group-hover:text-white transition-colors mb-2">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 group-hover:text-stone-900 text-sm">Inventario</h4>
              <p className="text-[11px] text-stone-500">Stock y alertas</p>
            </div>
          </Link>

          <Link
            to="/admin/usuarios"
            className="p-4 bg-white rounded-xl border border-[#E7E1D7] hover:border-stone-900 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="p-2.5 w-fit bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg text-stone-800 group-hover:bg-stone-900 group-hover:text-white transition-colors mb-2">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 group-hover:text-stone-900 text-sm">Usuarios</h4>
              <p className="text-[11px] text-stone-500">Roles y moderación</p>
            </div>
          </Link>

          <Link
            to="/admin/archivos"
            className="p-4 bg-white rounded-xl border border-[#E7E1D7] hover:border-stone-900 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="p-2.5 w-fit bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg text-stone-800 group-hover:bg-stone-900 group-hover:text-white transition-colors mb-2">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 group-hover:text-stone-900 text-sm">Archivos</h4>
              <p className="text-[11px] text-stone-500">Cloudinary y fotos</p>
            </div>
          </Link>

          <Link
            to="/admin/resenas"
            className="p-4 bg-white rounded-xl border border-[#E7E1D7] hover:border-stone-900 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="p-2.5 w-fit bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg text-[#9B7B54] group-hover:bg-stone-900 group-hover:text-white transition-colors mb-2">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 group-hover:text-stone-900 text-sm">Reseñas</h4>
              <p className="text-[11px] text-stone-500">Moderación y spam</p>
            </div>
          </Link>
        </div>
      </div>

      {/* RESUMEN DE USUARIOS Y ACCIONES RÁPIDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget Crecimiento Usuarios */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#E7E1D7] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-serif font-bold text-stone-900">Crecimiento Mensual de Usuarios</h3>
              <p className="text-xs text-stone-500">Nuevos registros en los últimos meses</p>
            </div>
            <Link
              to="/admin/usuarios"
              className="text-xs font-semibold text-[#9B7B54] hover:underline flex items-center gap-1"
            >
              Ver usuarios <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-2">
            {usuariosData?.desgloseMensual.map((m) => (
              <div key={m.mes} className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E7E1D7] text-center">
                <div className="text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                  {m.label}
                </div>
                <div className="text-xl font-serif font-bold text-stone-900">+{m.total}</div>
                <div className="text-[10px] text-[#9B7B54] font-semibold mt-0.5">
                  {m.verificados} verif.
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acceso Rápido a Reportes */}
        <div className="bg-[#161513] text-stone-100 p-6 rounded-xl flex flex-col justify-between border border-[#2A2723] shadow-md">
          <div>
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-4 text-[#9B7B54]">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-1">Reportes y Auditoría</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Genera reportes detallados por rango de fechas, filtra por estados de compra y exporta a Excel/CSV.
            </p>
          </div>

          <Link
            to="/admin/reportes"
            className="mt-6 flex items-center justify-between px-4 py-3 bg-white text-stone-900 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#FAF8F5] transition-colors"
          >
            <span>Ir a Reportes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
