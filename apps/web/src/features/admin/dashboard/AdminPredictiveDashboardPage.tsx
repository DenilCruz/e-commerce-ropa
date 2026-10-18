import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  UserX,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Zap,
  ShoppingBag,
  Layers,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { adminApi } from '../services/admin.api';
import {
  AnalisisPredictivoVentasRespuesta,
  PrediccionChurnRespuesta,
  RecomendacionesAfinidadRespuesta,
} from '../types';
import { toast } from 'sonner';

export const AdminPredictiveDashboardPage: React.FC = () => {
  const [ventasPredictivas, setVentasPredictivas] = useState<AnalisisPredictivoVentasRespuesta | null>(null);
  const [churnData, setChurnData] = useState<PrediccionChurnRespuesta | null>(null);
  const [afinidadData, setAfinidadData] = useState<RecomendacionesAfinidadRespuesta | null>(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabFiltroRiesgo, setTabFiltroRiesgo] = useState<'TODOS' | 'ALTO' | 'MEDIO' | 'BAJO'>('TODOS');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const cargarDatosPredictivos = async () => {
    try {
      setCargando(true);
      setError(null);
      const [ventas, churn, afinidad] = await Promise.all([
        adminApi.obtenerAnalisisPredictivoVentas(),
        adminApi.obtenerPrediccionChurn(),
        adminApi.obtenerRecomendacionesAfinidad(),
      ]);

      setVentasPredictivas(ventas);
      setChurnData(churn);
      setAfinidadData(afinidad);
    } catch (err: any) {
      console.error('Error cargando analítica predictiva:', err);
      setError(err?.response?.data?.message || 'Error al conectar con el motor predictivo.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosPredictivos();
  }, []);

  const handleCopiarCorreo = (correo: string, id: string) => {
    navigator.clipboard.writeText(correo);
    setCopiadoId(id);
    toast.success(`Correo ${correo} copiado al portapapeles.`);
    setTimeout(() => setCopiadoId(null), 2500);
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
          <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
          Procesando modelos predictivos sobre datos reales...
        </p>
      </div>
    );
  }

  if (error || !ventasPredictivas || !churnData) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-red-50 border border-red-200 text-center rounded-2xl">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-800 mb-1">No se pudo cargar la analítica predictiva</h3>
        <p className="text-sm text-red-600 mb-6">{error || 'Intenta nuevamente más tarde.'}</p>
        <button
          onClick={cargarDatosPredictivos}
          className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-stone-800 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { metricasPredictivas, serieGrafico, recomendacionEstrategica } = ventasPredictivas;
  const maxValorGrafico = Math.max(...serieGrafico.map((d) => (d.valorReal ?? d.valorProyectado) || 0), 100);

  const clientesFiltrados = (churnData.clientes || []).filter((c) => {
    if (tabFiltroRiesgo === 'TODOS') return true;
    return c.nivelRiesgo === tabFiltroRiesgo;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* HEADER CON NAVEGACIÓN ENTRE DASHBOARDS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Inteligencia Artificial Predictiva</span>
            </span>
            <span className="text-xs text-gray-400 font-mono">Modelos de Proyección & RFM</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            Dashboard Predictivo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Proyecciones de ventas futuras, detección temprana de abandono de clientes y canasta de afinidad calculada con IA.
          </p>
        </div>

        {/* SWITCH DESCRIPTIVO VS PREDICTIVO */}
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200 text-xs font-semibold">
          <Link
            to="/admin"
            className="px-3.5 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-white/60"
          >
            Dashboard Descriptivo (Pasado)
          </Link>
          <span className="px-3.5 py-2 bg-white text-indigo-700 font-bold rounded-lg shadow-xs border border-gray-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Predictivo (Futuro)</span>
          </span>
          <Link
            to="/admin/reportes-dinamicos"
            className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Voz / IA</span>
          </Link>
        </div>
      </div>

      {/* METRICAS PREDICTIVAS DE VENTAS (CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* PROYECCIÓN 7 DÍAS */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Proyección 7 Días</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            ${metricasPredictivas.proyeccionVentas7Dias.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Ingresos esperados para la próxima semana.
          </p>
        </div>

        {/* PROYECCIÓN 30 DÍAS */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Proyección 30 Días</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            ${metricasPredictivas.proyeccionVentas30Dias.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Volumen acumulado proyectado a 1 mes.
          </p>
        </div>

        {/* TENDENCIA ESTIMADA */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Tendencia Estimada</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                metricasPredictivas.tendencia === 'ALCISTA'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : metricasPredictivas.tendencia === 'BAJISTA'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              {metricasPredictivas.tendencia}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              m={metricasPredictivas.pendienteDiaria > 0 ? `+${metricasPredictivas.pendienteDiaria}` : metricasPredictivas.pendienteDiaria}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Promedio diario histórico: ${metricasPredictivas.promedioDiarioHistorico.toFixed(2)}
          </p>
        </div>

        {/* NIVEL DE CONFIANZA */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Fiabilidad del Modelo</span>
            <ShieldAlert className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            {metricasPredictivas.nivelConfianza}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Ajuste de regresión sobre órdenes completadas.
          </p>
        </div>
      </div>

      {/* RECOMENDACIÓN ESTRATÉGICA DE IA */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border border-indigo-100 rounded-2xl p-5 shadow-xs flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider font-bold text-indigo-950">
            Recomendación Táctica del Asistente Predictivo
          </h4>
          <p className="text-xs sm:text-sm text-indigo-900/90 font-light mt-1 leading-relaxed">
            {recomendacionEstrategica}
          </p>
        </div>
      </div>

      {/* GRÁFICO PREDICTIVO: HISTÓRICO REAL VS PROYECCIÓN A FUTURO */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-black text-gray-900">
              Proyección Predictiva de Demanda (Próximos 14 Días)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparativa entre las ventas reales registradas y la proyección matemática estimada a futuro.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-stone-900 inline-block" />
              <span className="text-gray-700">Ventas Reales ($)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500 border border-dashed border-indigo-700 inline-block" />
              <span className="text-indigo-700">Proyección IA ($)</span>
            </span>
          </div>
        </div>

        {/* CONTENEDOR DE BARRAS INTERACTIVAS */}
        <div className="h-64 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 overflow-x-auto">
          {serieGrafico.map((punto, idx) => {
            const esReal = punto.tipo === 'HISTORICO';
            const valor = esReal ? punto.valorReal || 0 : punto.valorProyectado || 0;
            const porcentaje = Math.min(100, Math.max(6, (valor / maxValorGrafico) * 100));

            return (
              <div
                key={`${punto.fecha}-${idx}`}
                className="flex-1 min-w-[28px] sm:min-w-[36px] flex flex-col items-center group relative h-full justify-end cursor-pointer"
              >
                {/* TOOLTIP */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-stone-900 text-white text-[10px] py-1.5 px-2.5 rounded shadow-lg pointer-events-none whitespace-nowrap text-center">
                  <span className="font-bold">{punto.label}</span>: ${valor.toFixed(2)}
                  <span className="block text-gray-400 text-[9px] uppercase font-mono mt-0.5">
                    {esReal ? 'Dato Real' : 'Proyección IA'}
                  </span>
                </div>

                {/* BARRA */}
                <div
                  style={{ height: `${porcentaje}%` }}
                  className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-110 ${
                    esReal
                      ? 'bg-stone-900 group-hover:bg-black'
                      : 'bg-indigo-500/85 border-t-2 border-dashed border-indigo-700 group-hover:bg-indigo-600'
                  }`}
                />

                {/* ETIQUETA EJE X */}
                <span className="text-[9px] text-gray-400 mt-2 truncate w-full text-center font-mono">
                  {punto.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 2: PREDICCIÓN DE ABANDONO DE CLIENTES (CHURN RISK) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-black text-gray-900">
                Predicción de Abandono de Clientes (Churn Risk)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Identificación predictiva de clientes con baja probabilidad de retorno basada en recencia y frecuencia de compra.
            </p>
          </div>

          {/* FILTRO DE RIESGO */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {(['TODOS', 'ALTO', 'MEDIO', 'BAJO'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTabFiltroRiesgo(r)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  tabFiltroRiesgo === r
                    ? 'bg-white text-gray-900 shadow-xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {r === 'TODOS' ? 'Todos' : `Riesgo ${r}`}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs RESUMEN CHURN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Clientes Evaluados</span>
            <span className="text-xl font-black text-gray-900 mt-1 block">{churnData.resumen.totalClientes}</span>
          </div>

          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <span className="text-[10px] uppercase font-bold text-red-700 block">Riesgo Crítico (Alto)</span>
            <span className="text-xl font-black text-red-700 mt-1 block">{churnData.resumen.riesgoAlto}</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Riesgo Moderado (Medio)</span>
            <span className="text-xl font-black text-amber-700 mt-1 block">{churnData.resumen.riesgoMedio}</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Tasa de Retención</span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">{churnData.resumen.tasaRetencionEstimada}%</span>
          </div>
        </div>

        {/* TABLA DE CLIENTES EN RIESGO */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Compras</th>
                <th className="py-3 px-4">Gasto Total</th>
                <th className="py-3 px-4">Última Orden</th>
                <th className="py-3 px-4">Nivel de Riesgo</th>
                <th className="py-3 px-4">Acción Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No se encontraron clientes para este nivel de riesgo.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {cliente.nombre}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span>{cliente.correo}</span>
                        <button
                          onClick={() => handleCopiarCorreo(cliente.correo, cliente.id)}
                          className="text-gray-400 hover:text-indigo-600 cursor-pointer"
                          title="Copiar correo"
                        >
                          {copiadoId === cliente.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-800">
                      {cliente.totalCompras} pedidos
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      ${cliente.gastoTotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div>{cliente.ultimaCompra}</div>
                      {cliente.diasSinComprar !== null && (
                        <span className="text-[10px] text-gray-400">
                          (Hace {cliente.diasSinComprar} días)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          cliente.nivelRiesgo === 'ALTO'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : cliente.nivelRiesgo === 'MEDIO'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {cliente.nivelRiesgo} ({(cliente.scoreRiesgo * 100).toFixed(0)}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 max-w-xs leading-relaxed font-light">
                      {cliente.accionRecomendada}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 3: RECOMENDACIONES DE PRODUCTOS Y CANASTA DE COMPRA */}
      {afinidadData && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Recomendaciones de Afinidad y Cross-Selling
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {afinidadData.descripcion}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {afinidadData.asociaciones.map((asoc) => (
              <div
                key={asoc.ranking}
                className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200 hover:border-indigo-300 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md uppercase">
                    Afinidad #{asoc.ranking} · Score {(asoc.scoreAfinidad * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {asoc.frecuenciaTransaccional} órdenes compartidas
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm font-bold text-gray-900 gap-2">
                  <span className="truncate">{asoc.productoA.nombre}</span>
                  <span className="text-indigo-600 font-light">+</span>
                  <span className="truncate">{asoc.productoB.nombre}</span>
                </div>

                <p className="text-xs text-gray-600 font-light border-t border-gray-200/60 pt-2.5">
                  <strong className="font-semibold text-gray-800">Estrategia:</strong> {asoc.estrategiaSugerida}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
