import React from 'react';
import {
  BrainCircuit,
  Binary,
  Layers,
  Sparkles,
  RefreshCw,
  Target,
  Percent,
  CheckCircle2,
  Users,
  PieChart,
  ArrowRight,
} from 'lucide-react';
import { ModelosMachineLearningRespuesta } from '../types';

interface MachineLearningSectionProps {
  data: ModelosMachineLearningRespuesta | null;
  onReentrenar: () => void;
  cargando: boolean;
}

export const MachineLearningSection: React.FC<MachineLearningSectionProps> = ({
  data,
  onReentrenar,
  cargando,
}) => {
  if (!data) return null;

  const { particion, modeloSupervisado, modeloNoSupervisado } = data;
  const rfMetricas = modeloSupervisado.metricasPrueba20Pct;

  return (
    <div className="bg-white rounded-2xl border border-[#E7E1D7] p-6 md:p-8 shadow-xs space-y-8">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E1D7] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-stone-900 text-white shadow-xs">
              <BrainCircuit className="w-3.5 h-3.5 text-[#EBE3D5]" />
              <span>Machine Learning en Producción</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Partición {particion.proporcion}</span>
            </span>
          </div>

          <h2 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Modelos de Aprendizaje Automático
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-3xl">
            Entrenamiento de 2 modelos con validación en tiempo real: <strong>1 Supervisado (Random Forest)</strong> para clasificación de fidelidad y <strong>1 No Supervisado (K-Means)</strong> para segmentación por comportamiento de compra, evaluados sobre el 20% de prueba independiente.
          </p>
        </div>

        {/* BOTÓN RE-ENTRENAR */}
        <button
          onClick={onReentrenar}
          disabled={cargando}
          className="self-start md:self-auto px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F2ECE1] border border-[#E7E1D7] rounded-xl text-stone-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin text-[#9B7B54]' : ''}`} />
          <span>{cargando ? 'Re-entrenando...' : 'Re-entrenar Modelos (80/20)'}</span>
        </button>
      </div>

      {/* DETALLES DE LA PARTICIÓN 80/20 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#FAF8F5] p-4 rounded-xl border border-[#E7E1D7] text-xs">
        <div>
          <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Total Compradores</span>
          <strong className="text-lg font-serif text-stone-900">{particion.totalMuestras} clientes</strong>
        </div>
        <div>
          <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Muestra Entrenamiento (80%)</span>
          <strong className="text-lg font-serif text-blue-900">{particion.entrenamiento} registros</strong>
        </div>
        <div>
          <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Muestra Evaluación Test (20%)</span>
          <strong className="text-lg font-serif text-emerald-900">{particion.prueba} registros</strong>
        </div>
        <div>
          <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Última Ejecución</span>
          <span className="text-stone-600 font-mono text-[11px] block mt-1">
            {new Date(data.timestamp).toLocaleTimeString('es-BO')}
          </span>
        </div>
      </div>

      {/* GRID DE LOS 2 MODELOS ML */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ========================================================= */}
        {/* MODELO 1: RANDOM FOREST (SUPERVISADO) */}
        {/* ========================================================= */}
        <div className="border border-[#E7E1D7] rounded-xl p-5 md:p-6 space-y-6 bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                <Binary className="w-3 h-3 text-purple-600" />
                <span>Modelo Supervisado</span>
              </span>
              <span className="text-xs text-stone-500 font-mono">
                {modeloSupervisado.arbolesEnsamble} Árboles de Decisión
              </span>
            </div>

            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Random Forest Classifier
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {modeloSupervisado.objetivo}
              </p>
            </div>

            {/* MÉTRICA PRINCIPAL: EXACTITUD EN EL 20% TEST */}
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-purple-900 block">
                  Exactitud en Test (20% Holdout)
                </span>
                <span className="text-3xl font-serif font-bold text-purple-950">
                  {(rfMetricas.exactitud * 100).toFixed(1)}%
                </span>
                <span className="text-[11px] text-purple-700 block mt-0.5">
                  Evaluado rigurosamente sobre {rfMetricas.totalEvaluados} clientes del grupo de prueba
                </span>
              </div>
              <div className="w-14 h-14 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-800 shadow-2xs">
                <Target className="w-7 h-7 text-purple-700" />
              </div>
            </div>

            {/* OTRAS MÉTRICAS FORMALES (PRECISIÓN, RECALL, F1) */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E1D7]">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Precisión</span>
                <strong className="text-stone-900 font-mono text-sm">{(rfMetricas.precision * 100).toFixed(1)}%</strong>
              </div>
              <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E1D7]">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Recall</span>
                <strong className="text-stone-900 font-mono text-sm">{(rfMetricas.exhaustividad * 100).toFixed(1)}%</strong>
              </div>
              <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E1D7]">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">F1-Score</span>
                <strong className="text-stone-900 font-mono text-sm">{(rfMetricas.f1Score * 100).toFixed(1)}%</strong>
              </div>
            </div>

            {/* MATRIZ DE CONFUSIÓN */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                Matriz de Confusión (Evaluación 20% Test)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                  <span className="text-[10px] block uppercase font-bold text-emerald-700">Verdaderos Positivos</span>
                  <span className="text-base font-bold font-mono">{rfMetricas.matrizConfusion.verdaderosPositivos}</span>
                </div>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                  <span className="text-[10px] block uppercase font-bold text-rose-700">Falsos Positivos</span>
                  <span className="text-base font-bold font-mono">{rfMetricas.matrizConfusion.falsosPositivos}</span>
                </div>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                  <span className="text-[10px] block uppercase font-bold text-rose-700">Falsos Negativos</span>
                  <span className="text-base font-bold font-mono">{rfMetricas.matrizConfusion.falsosNegativos}</span>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                  <span className="text-[10px] block uppercase font-bold text-emerald-700">Verdaderos Negativos</span>
                  <span className="text-base font-bold font-mono">{rfMetricas.matrizConfusion.verdaderosNegativos}</span>
                </div>
              </div>
            </div>

            {/* IMPORTANCIA DE CARACTERÍSTICAS */}
            <div className="space-y-2 pt-2 border-t border-[#E7E1D7]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                Importancia de Características (Feature Importance)
              </span>
              <div className="space-y-1.5">
                {modeloSupervisado.importanciaCaracteristicas.map((imp, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-stone-600">
                      <span>{imp.caracteristica}</span>
                      <span className="font-mono font-bold">{(imp.peso * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-[#E7E1D7] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-800 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(5, imp.peso * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODELO 2: K-MEANS (NO SUPERVISADO) */}
        {/* ========================================================= */}
        <div className="border border-[#E7E1D7] rounded-xl p-5 md:p-6 space-y-6 bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-blue-600" />
                <span>Modelo No Supervisado</span>
              </span>
              <span className="text-xs text-stone-500 font-mono">
                k = {modeloNoSupervisado.kClusters} Clusters
              </span>
            </div>

            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                K-Means Clustering
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {modeloNoSupervisado.objetivo}
              </p>
            </div>

            {/* MÉTRICA PRINCIPAL: SILHOUETTE SCORE */}
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-blue-900 block">
                  Silhouette Score (Separación y Cohesión)
                </span>
                <span className="text-3xl font-serif font-bold text-blue-950 font-mono">
                  {modeloNoSupervisado.silhouetteScore.toFixed(3)}
                </span>
                <span className="text-[11px] text-blue-700 block mt-0.5 font-medium">
                  {modeloNoSupervisado.interpretacionSilhouette}
                </span>
              </div>
              <div className="w-14 h-14 rounded-full bg-white border border-blue-200 flex items-center justify-center text-blue-800 shadow-2xs">
                <PieChart className="w-7 h-7 text-blue-700" />
              </div>
            </div>

            {/* INERCIA Y CONVERGENCIA */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E1D7]">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Convergencia</span>
                <span className="text-stone-800 font-mono text-xs">{modeloNoSupervisado.iteracionesConvergencia} iteraciones (Lloyd)</span>
              </div>
              <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E1D7]">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Inercia (WCSS)</span>
                <span className="text-stone-800 font-mono text-xs">{modeloNoSupervisado.inercia}</span>
              </div>
            </div>

            {/* LISTA DE CLUSTERS DE CLIENTES */}
            <div className="space-y-3 pt-2 border-t border-[#E7E1D7]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                Segmentos Descubiertos por K-Means ({modeloNoSupervisado.kClusters} Grupos)
              </span>

              <div className="space-y-2.5">
                {modeloNoSupervisado.clusters.map((c) => (
                  <div key={c.clusterId} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E1D7] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 font-serif text-sm">
                        Cluster #{c.clusterId + 1}: {c.nombre}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-[#E7E1D7] text-stone-700">
                        {c.cantidadClientes} clientes ({c.porcentaje}%)
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 leading-tight">
                      {c.descripcion}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-stone-500 pt-1 border-t border-[#E7E1D7]">
                      <span>Centroide: Recencia {c.centroideOriginal[0]}d</span>
                      <span>•</span>
                      <span>Frecuencia {c.centroideOriginal[1]} pedidos</span>
                      <span>•</span>
                      <span>Gasto ${c.centroideOriginal[2]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

