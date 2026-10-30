import { DemandChart } from './DemandChart';
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
import { useAuthStore } from '../../../store/auth.store';
import {
  AnalisisPredictivoVentasRespuesta,
  PrediccionChurnRespuesta,
  RecomendacionesAfinidadRespuesta,
} from '../types';
import { toast } from 'sonner';

export const AdminPredictiveDashboardPage: React.FC = () => {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
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
  }, [tenantId]);

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
          <RefreshCw className="w-10 h-10 text-[#9B7B54] animate-spin" />
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

  const clientesFiltrados = (churnData.clientes || []).filter((c) => {
    if (tabFiltroRiesgo === 'TODOS') return true;
    return c.nivelRiesgo === tabFiltroRiesgo;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* HEADER CON NAVEGACIÓN ENTRE DASHBOARDS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E1D7] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7]">
              <Sparkles className="w-3 h-3 text-[#9B7B54]" />
              <span>Inteligencia Artificial Predictiva</span>
            </span>
            <span className="text-xs text-stone-400 font-mono">Modelos de Proyección & RFM</span>
          </div>
          <h1 className="text-3xl font-serif tracking-tight text-stone-900">
            Dashboard Predictivo
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Proyecciones de ventas futuras, detección temprana de abandono de clientes y canasta de afinidad calculada con IA.
          </p>
        </div>

        {/* SWITCH DESCRIPTIVO VS PREDICTIVO */}
        <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 rounded-xl border border-[#E7E1D7] text-xs font-semibold">
          <Link
            to="/admin"
            className="px-3.5 py-2 text-stone-600 hover:text-stone-900 transition-colors rounded-lg hover:bg-white"
          >
            Dashboard Descriptivo (Pasado)
          </Link>
          <span className="px-3.5 py-2 bg-white text-stone-900 font-bold rounded-lg shadow-xs border border-[#E7E1D7] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#9B7B54]" />
            <span>Predictivo (Futuro)</span>
          </span>
          <Link
            to="/admin/reportes-dinamicos"
            className="px-3 py-2 text-stone-600 hover:text-stone-900 transition-colors rounded-lg flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#9B7B54]" />
            <span>Voz / IA</span>
          </Link>
        </div>
      </div>

      {/* METRICAS PREDICTIVAS DE VENTAS (CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* PROYECCIÓN 7 DÍAS */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E1D7] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="text-stone-400">Proyección 7 Días</span>
            <Calendar className="w-4 h-4 text-[#9B7B54]" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {metricasPredictivas.proyeccionVentas7Dias === null
              ? 'Sin datos'
              : `$${metricasPredictivas.proyeccionVentas7Dias.toFixed(2)}`}
          </div>
          <p className="text-[11px] text-stone-500 mt-2">
            {metricasPredictivas.proyeccionVentas7Dias === null
              ? 'Falta historial para proyectar.'
              : 'Ingresos esperados para la próxima semana.'}
          </p>
        </div>

        {/* PROYECCIÓN 30 DÍAS */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E1D7] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="text-stone-400">Proyección 30 Días</span>
            <TrendingUp className="w-4 h-4 text-stone-800" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {metricasPredictivas.proyeccionVentas30Dias === null
              ? 'Sin datos'
              : `$${metricasPredictivas.proyeccionVentas30Dias.toFixed(2)}`}
          </div>
          <p className="text-[11px] text-stone-500 mt-2">
            {metricasPredictivas.proyeccionVentas30Dias === null
              ? 'Falta historial para proyectar.'
              : 'Volumen acumulado proyectado a 1 mes.'}
          </p>
        </div>

        {/* TENDENCIA ESTIMADA */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E1D7] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="text-stone-400">Tendencia Estimada</span>
            <Zap className="w-4 h-4 text-[#9B7B54]" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-serif font-bold uppercase tracking-wider ${
                metricasPredictivas.tendencia === 'ALCISTA'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : metricasPredictivas.tendencia === 'BAJISTA'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-[#FAF8F5] text-stone-900 border border-[#E7E1D7]'
              }`}
            >
              {metricasPredictivas.tendencia === 'INSUFICIENTE' ? 'Sin datos suficientes' : metricasPredictivas.tendencia}
            </span>
            <span className="text-xs text-stone-400 font-mono">
              m={metricasPredictivas.pendienteDiaria > 0 ? `+${metricasPredictivas.pendienteDiaria}` : metricasPredictivas.pendienteDiaria}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-2">
            Promedio diario histórico: ${metricasPredictivas.promedioDiarioHistorico.toFixed(2)}
          </p>
        </div>

        {/* NIVEL DE CONFIANZA */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E1D7] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="text-stone-400">Fiabilidad del Modelo</span>
            <ShieldAlert className="w-4 h-4 text-[#9B7B54]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#9B7B54]">
            {metricasPredictivas.nivelConfianza}
          </div>
          <p className="text-[11px] text-stone-500 mt-2">
            {metricasPredictivas.fiabilidad === 'INSUFICIENTE'
              ? `Solo ${metricasPredictivas.diasConVentas} días con ventas en los últimos ${metricasPredictivas.ventanaDias}.`
              : `Fiabilidad ${metricasPredictivas.fiabilidad.toLowerCase()}: precisión medida prediciendo los últimos ${metricasPredictivas.diasDePrueba} días reales con los anteriores (modelo: ${metricasPredictivas.modelo === 'PROMEDIO' ? 'promedio, la tendencia no mejoró la predicción' : 'tendencia lineal'}).`}
          </p>
        </div>
      </div>

      {/* RECOMENDACIÓN ESTRATÉGICA DE IA */}
      <div className="bg-[#FAF8F5] border border-[#E7E1D7] rounded-2xl p-5 shadow-xs flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E1D7] text-[#9B7B54] flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-wider font-bold text-stone-900 font-serif">
            Recomendación Táctica del Asistente Predictivo
          </h4>
          <p className="text-xs sm:text-sm text-stone-700 font-light mt-1 leading-relaxed">
            {recomendacionEstrategica}
          </p>
        </div>
      </div>

      {/* GRÁFICO PREDICTIVO: HISTÓRICO REAL VS PROYECCIÓN A FUTURO */}
      <div className="bg-white rounded-2xl border border-[#E7E1D7] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E1D7]">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900">
              Proyección Predictiva de Demanda (Próximos 14 Días)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Ventas reales de cada día frente a la proyección estimada a futuro.
            </p>
          </div>
        </div>

        <DemandChart serie={serieGrafico} metricas={metricasPredictivas} />
      </div>

      {/* SECCIÓN 2: PREDICCIÓN DE ABANDONO DE CLIENTES (CHURN RISK) */}
      <div className="bg-white rounded-2xl border border-[#E7E1D7] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E1D7]">
          <div>
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-stone-800" />
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Predicción de Abandono de Clientes (Churn Risk)
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Segmentación RFM: recencia, frecuencia y monto de cada cliente comparados con los demás compradores de la tienda.
            </p>
          </div>

          {/* FILTRO DE RIESGO */}
          <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl text-xs font-semibold border border-[#E7E1D7]">
            {(['TODOS', 'ALTO', 'MEDIO', 'BAJO'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTabFiltroRiesgo(r)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  tabFiltroRiesgo === r
                    ? 'bg-stone-900 text-white shadow-xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {r === 'TODOS' ? 'Todos' : `Riesgo ${r}`}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs RESUMEN CHURN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E1D7]">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Clientes Evaluados</span>
            <span className="text-xl font-serif font-bold text-stone-900 mt-1 block">{churnData.resumen.totalClientes}</span>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-[10px] uppercase font-bold text-rose-800 block">Riesgo Crítico (Alto)</span>
            <span className="text-xl font-serif font-bold text-rose-800 mt-1 block">{churnData.resumen.riesgoAlto}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E1D7]">
            <span className="text-[10px] uppercase font-bold text-[#9B7B54] block">Riesgo Moderado (Medio)</span>
            <span className="text-xl font-serif font-bold text-[#9B7B54] mt-1 block">{churnData.resumen.riesgoMedio}</span>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-700 block">Tasa de Recompra</span>
            <span className="text-xl font-serif font-bold text-stone-900 mt-1 block">{churnData.resumen.tasaRecompra == null ? '—' : `${churnData.resumen.tasaRecompra}%`}</span>
          </div>
        </div>

        {churnData.modelo && !churnData.modelo.suficiente && (
          <p className="text-xs text-stone-600 bg-[#FAF8F5] border border-[#E7E1D7] rounded-xl p-3">
            Se necesitan al menos {churnData.modelo.minimoRequerido} clientes con compras para segmentar con RFM y hay{' '}
            {churnData.modelo.compradores}. Mientras tanto se muestran sus métricas sin clasificar.
          </p>
        )}

        {/* TABLA DE CLIENTES EN RIESGO */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E7E1D7] bg-[#FAF8F5] text-stone-600 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Compras</th>
                <th className="py-3 px-4">Gasto Total</th>
                <th className="py-3 px-4">Última Orden</th>
                <th className="py-3 px-4">Nivel de Riesgo</th>
                <th className="py-3 px-4">Acción Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E1D7]/60">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500">
                    No se encontraron clientes para este nivel de riesgo.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {cliente.nombre}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <span>{cliente.correo}</span>
                        <button
                          onClick={() => handleCopiarCorreo(cliente.correo, cliente.id)}
                          className="text-stone-400 hover:text-stone-900 cursor-pointer"
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
                    <td className="py-3.5 px-4 font-mono font-medium text-stone-800">
                      {cliente.totalCompras} pedidos
                    </td>
                    <td className="py-3.5 px-4 font-serif font-bold text-stone-900">
                      ${cliente.gastoTotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      <div>{cliente.ultimaCompra}</div>
                      {cliente.diasSinComprar !== null && (
                        <span className="text-[10px] text-stone-400">
                          (Hace {cliente.diasSinComprar} días)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          cliente.nivelRiesgo === 'ALTO'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : cliente.nivelRiesgo === 'MEDIO'
                            ? 'bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7]'
                            : 'bg-stone-100 text-stone-800 border border-stone-200'
                        }`}
                      >
                        {cliente.scoreRiesgo === null
                          ? cliente.nivelRiesgo === 'SIN_COMPRAS'
                            ? 'Sin compras'
                            : 'Sin datos'
                          : `${cliente.nivelRiesgo} (${(cliente.scoreRiesgo * 100).toFixed(0)}%)`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-700 max-w-xs leading-relaxed font-light">
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
        <div className="bg-white rounded-2xl border border-[#E7E1D7] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#E7E1D7]">
            <ShoppingBag className="w-5 h-5 text-[#9B7B54]" />
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Recomendaciones de Afinidad y Cross-Selling
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {afinidadData.descripcion}
              </p>
            </div>
          </div>

          {afinidadData.asociaciones.length === 0 && (
            <p className="text-xs text-stone-600 bg-[#FAF8F5] border border-[#E7E1D7] rounded-xl p-4">
              Sin asociaciones para mostrar todavía. Cuando los clientes compren varios productos en un mismo pedido aparecerán aquí.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {afinidadData.asociaciones.map((asoc) => (
              <div
                key={asoc.ranking}
                className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E1D7] hover:border-stone-400 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-white border border-[#E7E1D7] text-[#9B7B54] text-[10px] font-bold rounded-md uppercase">
                    Afinidad #{asoc.ranking} · Confianza {(asoc.scoreAfinidad * 100).toFixed(0)}% · Lift {asoc.lift.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-500 font-mono">
                    {asoc.frecuenciaTransaccional} órdenes compartidas
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm font-serif font-bold text-stone-900 gap-2">
                  <span className="truncate">{asoc.productoA.nombre}</span>
                  <span className="text-[#9B7B54] font-sans font-light">+</span>
                  <span className="truncate">{asoc.productoB.nombre}</span>
                </div>

                <p className="text-xs text-stone-600 font-light border-t border-[#E7E1D7] pt-2.5">
                  <strong className="font-semibold text-stone-800">Estrategia:</strong> {asoc.estrategiaSugerida}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
