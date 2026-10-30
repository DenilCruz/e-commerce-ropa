/**
 * Modelos de Machine Learning para el E-Commerce AURA.
 * 
 * 1. Modelo Supervisado: Random Forest (Clasificador / Predictor con Ensamble de Árboles)
 * 2. Modelo No Supervisado: K-Means (Clustering de Segmentación de Clientes)
 * 3. Utilidad: Partición 80/20 (Train / Test Split) con cálculo de métricas formales.
 */

// =========================================================================
// 1. PARTICIÓN TRAIN / TEST (80% / 20%)
// =========================================================================

export interface ParticionDatos<T> {
  entrenamiento: T[];
  prueba: T[];
  tamanioTotal: number;
  tamanioEntrenamiento: number;
  tamanioPrueba: number;
  proporcionEntrenamiento: number;
  proporcionPrueba: number;
}

/**
 * Divide un conjunto de datos en partición de Entrenamiento y Prueba.
 * Por defecto 80% entrenamiento y 20% prueba.
 */
export function particionar8020<T>(
  datos: T[],
  proporcionTest: number = 0.20,
  semilla: number = 42,
): ParticionDatos<T> {
  const n = datos.length;
  if (n === 0) {
    return {
      entrenamiento: [],
      prueba: [],
      tamanioTotal: 0,
      tamanioEntrenamiento: 0,
      tamanioPrueba: 0,
      proporcionEntrenamiento: 0.8,
      proporcionPrueba: 0.2,
    };
  }

  // Generador pseudoaleatorio determinista LCG (Linear Congruential Generator)
  let estado = semilla;
  const rng = () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };

  // Barajado Fisher-Yates reproducible
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const nPrueba = Math.max(1, Math.round(n * proporcionTest));
  const indicesPrueba = new Set(indices.slice(0, nPrueba));

  const entrenamiento: T[] = [];
  const prueba: T[] = [];

  datos.forEach((item, idx) => {
    if (indicesPrueba.has(idx)) {
      prueba.push(item);
    } else {
      entrenamiento.push(item);
    }
  });

  return {
    entrenamiento,
    prueba,
    tamanioTotal: n,
    tamanioEntrenamiento: entrenamiento.length,
    tamanioPrueba: prueba.length,
    proporcionEntrenamiento: Number((entrenamiento.length / n).toFixed(2)),
    proporcionPrueba: Number((prueba.length / n).toFixed(2)),
  };
}

// =========================================================================
// 2. MODELO SUPERVISADO: RANDOM FOREST
// =========================================================================

export interface MuestraSupervisada {
  id?: string;
  caracteristicas: number[]; // [recenciaDias, totalCompras, gastoTotal, ticketPromedio]
  etiqueta: number;          // 1: Alta Recompra / Fiel, 0: Riesgo / No Frecuente
}

export interface NodoArbolDecision {
  esHoja: boolean;
  prediccion?: number;
  indiceCaracteristica?: number;
  umbral?: number;
  izq?: NodoArbolDecision;
  der?: NodoArbolDecision;
}

export interface MetricasEvaluacionSupervisada {
  exactitud: number;       // Accuracy (0 a 1)
  precision: number;       // Precision (0 a 1)
  exhaustividad: number;   // Recall (0 a 1)
  f1Score: number;         // F1 Score (0 a 1)
  matrizConfusion: {
    verdaderosPositivos: number;
    falsosPositivos: number;
    verdaderosNegativos: number;
    falsosNegativos: number;
  };
  totalEvaluados: number;
}

export interface ResultadoRandomForest {
  modelo: 'RANDOM_FOREST';
  numArboles: number;
  profundidadMaxima: number;
  particion: {
    entrenamiento: number;
    prueba: number;
    ratio: string;
  };
  metricasTest: MetricasEvaluacionSupervisada;
  importanciaCaracteristicas: { caracteristica: string; peso: number }[];
  prediccionesMuestra: { id?: string; real: number; predicho: number; probabilidad: number }[];
}

/**
 * Implementación de Random Forest para Clasificación de Comportamiento de Clientes.
 */
export class RandomForestClasificador {
  private arboles: NodoArbolDecision[] = [];
  private numArboles: number;
  private profundidadMax: number;
  private nombresCaracteristicas: string[];

  constructor(
    numArboles: number = 10,
    profundidadMax: number = 4,
    nombresCaracteristicas: string[] = ['Recencia (Días)', 'Frecuencia (Compras)', 'Gasto Total ($)', 'Ticket Promedio ($)'],
  ) {
    this.numArboles = numArboles;
    this.profundidadMax = profundidadMax;
    this.nombresCaracteristicas = nombresCaracteristicas;
  }

  entrenar(datos: MuestraSupervisada[]): void {
    this.arboles = [];
    if (datos.length === 0) return;

    for (let t = 0; t < this.numArboles; t++) {
      // Muestreo Bootstrap (con reemplazo)
      const bootstrap: MuestraSupervisada[] = [];
      for (let i = 0; i < datos.length; i++) {
        const aleatorio = Math.floor(Math.random() * datos.length);
        bootstrap.push(datos[aleatorio]);
      }

      const arbol = this.construirArbol(bootstrap, 0);
      this.arboles.push(arbol);
    }
  }

  predecirProbabilidad(caracteristicas: number[]): number {
    if (this.arboles.length === 0) return 0.5;
    let votosPositivos = 0;
    for (const arbol of this.arboles) {
      if (this.evaluarNodo(arbol, caracteristicas) === 1) {
        votosPositivos++;
      }
    }
    return votosPositivos / this.arboles.length;
  }

  predecir(caracteristicas: number[]): number {
    return this.predecirProbabilidad(caracteristicas) >= 0.5 ? 1 : 0;
  }

  private evaluarNodo(nodo: NodoArbolDecision, caracteristicas: number[]): number {
    if (nodo.esHoja) {
      return nodo.prediccion ?? 0;
    }
    const idx = nodo.indiceCaracteristica ?? 0;
    const umbral = nodo.umbral ?? 0;

    if (caracteristicas[idx] <= umbral) {
      return nodo.izq ? this.evaluarNodo(nodo.izq, caracteristicas) : (nodo.prediccion ?? 0);
    } else {
      return nodo.der ? this.evaluarNodo(nodo.der, caracteristicas) : (nodo.prediccion ?? 0);
    }
  }

  private construirArbol(muestras: MuestraSupervisada[], profundidad: number): NodoArbolDecision {
    const etiquetas = muestras.map((m) => m.etiqueta);
    const suma = etiquetas.reduce((a, b) => a + b, 0);
    const mayoria = suma >= muestras.length / 2 ? 1 : 0;

    // Condición de parada (nodo hoja)
    if (
      profundidad >= this.profundidadMax ||
      muestras.length <= 2 ||
      suma === 0 ||
      suma === muestras.length
    ) {
      return { esHoja: true, prediccion: mayoria };
    }

    // Selección aleatoria de subconjunto de características (Random Subspace)
    const numFeatures = muestras[0]?.caracteristicas.length || 0;
    const featuresDisponibles = Array.from({ length: numFeatures }, (_, i) => i);
    const kFeatures = Math.max(1, Math.floor(Math.sqrt(numFeatures)));
    const subsetFeatures = featuresDisponibles.sort(() => Math.random() - 0.5).slice(0, kFeatures);

    let mejorGini = 1.0;
    let mejorFeature = 0;
    let mejorUmbral = 0;
    let mejorIzq: MuestraSupervisada[] = [];
    let mejorDer: MuestraSupervisada[] = [];

    for (const fIdx of subsetFeatures) {
      const valores = muestras.map((m) => m.caracteristicas[fIdx]).sort((a, b) => a - b);
      // Probar umbrales medios
      for (let i = 0; i < valores.length - 1; i++) {
        const umbral = (valores[i] + valores[i + 1]) / 2;
        const izq = muestras.filter((m) => m.caracteristicas[fIdx] <= umbral);
        const der = muestras.filter((m) => m.caracteristicas[fIdx] > umbral);

        if (izq.length === 0 || der.length === 0) continue;

        const gini = this.calcularGiniPonderado(izq, der, muestras.length);
        if (gini < mejorGini) {
          mejorGini = gini;
          mejorFeature = fIdx;
          mejorUmbral = umbral;
          mejorIzq = izq;
          mejorDer = der;
        }
      }
    }

    if (mejorIzq.length === 0 || mejorDer.length === 0) {
      return { esHoja: true, prediccion: mayoria };
    }

    return {
      esHoja: false,
      indiceCaracteristica: mejorFeature,
      umbral: mejorUmbral,
      prediccion: mayoria,
      izq: this.construirArbol(mejorIzq, profundidad + 1),
      der: this.construirArbol(mejorDer, profundidad + 1),
    };
  }

  private calcularGiniPonderado(izq: MuestraSupervisada[], der: MuestraSupervisada[], total: number): number {
    const gini = (grupo: MuestraSupervisada[]) => {
      const p1 = grupo.filter((m) => m.etiqueta === 1).length / grupo.length;
      const p0 = 1 - p1;
      return 1 - (p1 * p1 + p0 * p0);
    };
    return (izq.length / total) * gini(izq) + (der.length / total) * gini(der);
  }

  evaluar(muestrasPrueba: MuestraSupervisada[]): MetricasEvaluacionSupervisada {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (const muestra of muestrasPrueba) {
      const predicho = this.predecir(muestra.caracteristicas);
      if (predicho === 1 && muestra.etiqueta === 1) tp++;
      else if (predicho === 1 && muestra.etiqueta === 0) fp++;
      else if (predicho === 0 && muestra.etiqueta === 0) tn++;
      else if (predicho === 0 && muestra.etiqueta === 1) fn++;
    }

    const total = muestrasPrueba.length || 1;
    const exactitud = (tp + tn) / total;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const exhaustividad = tp + fn > 0 ? tp / (tp + fn) : 1;
    const f1Score = precision + exhaustividad > 0 ? (2 * precision * exhaustividad) / (precision + exhaustividad) : 0;

    return {
      exactitud: Number(exactitud.toFixed(4)),
      precision: Number(precision.toFixed(4)),
      exhaustividad: Number(exhaustividad.toFixed(4)),
      f1Score: Number(f1Score.toFixed(4)),
      matrizConfusion: {
        verdaderosPositivos: tp,
        falsosPositivos: fp,
        verdaderosNegativos: tn,
        falsosNegativos: fn,
      },
      totalEvaluados: muestrasPrueba.length,
    };
  }

  obtenerImportanciaCaracteristicas(): { caracteristica: string; peso: number }[] {
    const conteo = new Array(this.nombresCaracteristicas.length).fill(0);
    const recorrer = (nodo?: NodoArbolDecision) => {
      if (!nodo || nodo.esHoja) return;
      if (nodo.indiceCaracteristica !== undefined && nodo.indiceCaracteristica < conteo.length) {
        conteo[nodo.indiceCaracteristica]++;
      }
      recorrer(nodo.izq);
      recorrer(nodo.der);
    };

    for (const a of this.arboles) {
      recorrer(a);
    }

    const total = conteo.reduce((a, b) => a + b, 0) || 1;
    return this.nombresCaracteristicas.map((nombre, i) => ({
      caracteristica: nombre,
      peso: Number((conteo[i] / total).toFixed(4)),
    }));
  }
}

// =========================================================================
// 3. MODELO NO SUPERVISADO: K-MEANS CLUSTERING
// =========================================================================

export interface MuestraNoSupervisada {
  id: string;
  nombre: string;
  correo: string;
  valores: number[]; // [recencia, frecuencia, gastoTotal]
}

export interface ClusterInfo {
  clusterId: number;
  nombre: string;
  descripcion: string;
  centroideOriginal: number[];
  cantidadClientes: number;
  porcentaje: number;
  clientes: { id: string; nombre: string; correo: string; distanciaAlCentroide: number }[];
}

export interface ResultadoKMeans {
  modelo: 'K_MEANS';
  kClusters: number;
  iteracionesConvergencia: number;
  particion: {
    entrenamiento: number;
    prueba: number;
    ratio: string;
  };
  silhouetteScore: number; // Métrica de calidad de clusters (-1 a 1)
  inercia: number;         // Suma de distancias cuadráticas intra-cluster
  clusters: ClusterInfo[];
}

/**
 * Implementación de K-Means Clustering para Segmentación de Clientes.
 */
export class KMeansClustering {
  private k: number;
  private maxIter: number;
  private centroides: number[][] = [];
  private mins: number[] = [];
  private maxs: number[] = [];

  constructor(k: number = 3, maxIter: number = 50) {
    this.k = k;
    this.maxIter = maxIter;
  }

  /**
   * Distancia euclidiana entre dos puntos normalizados.
   */
  private distancia(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  /**
   * Normaliza Min-Max las características a rango [0, 1].
   */
  private normalizar(puntos: number[][]): number[][] {
    if (puntos.length === 0) return [];
    const dim = puntos[0].length;
    this.mins = Array(dim).fill(Infinity);
    this.maxs = Array(dim).fill(-Infinity);

    for (const p of puntos) {
      for (let i = 0; i < dim; i++) {
        if (p[i] < this.mins[i]) this.mins[i] = p[i];
        if (p[i] > this.maxs[i]) this.maxs[i] = p[i];
      }
    }

    return puntos.map((p) =>
      p.map((v, i) => {
        const rango = this.maxs[i] - this.mins[i];
        return rango === 0 ? 0.5 : (v - this.mins[i]) / rango;
      }),
    );
  }

  private normalizarPunto(p: number[]): number[] {
    return p.map((v, i) => {
      const rango = (this.maxs[i] ?? 1) - (this.mins[i] ?? 0);
      return rango === 0 ? 0.5 : (v - (this.mins[i] ?? 0)) / rango;
    });
  }

  private desnormalizarPunto(pNorm: number[]): number[] {
    return pNorm.map((v, i) => {
      const rango = (this.maxs[i] ?? 1) - (this.mins[i] ?? 0);
      return Number((v * rango + (this.mins[i] ?? 0)).toFixed(2));
    });
  }

  entrenar(datos: MuestraNoSupervisada[]): { iteraciones: number; inercia: number } {
    if (datos.length < this.k) {
      return { iteraciones: 0, inercia: 0 };
    }

    const X = datos.map((d) => d.valores);
    const XNorm = this.normalizar(X);
    const dim = XNorm[0].length;

    // Inicialización inteligente K-Means++
    this.centroides = [XNorm[Math.floor(Math.random() * XNorm.length)]];
    while (this.centroides.length < this.k) {
      const distancias = XNorm.map((p) =>
        Math.min(...this.centroides.map((c) => this.distancia(p, c))),
      );
      const sumaDistancias = distancias.reduce((a, b) => a + b, 0);
      let r = Math.random() * sumaDistancias;
      let nuevoCentroide = XNorm[0];
      for (let i = 0; i < XNorm.length; i++) {
        r -= distancias[i];
        if (r <= 0) {
          nuevoCentroide = XNorm[i];
          break;
        }
      }
      this.centroides.push(nuevoCentroide);
    }

    // Iteraciones Lloyd
    let asignaciones = new Array(XNorm.length).fill(-1);
    let iter = 0;
    for (iter = 0; iter < this.maxIter; iter++) {
      let cambio = false;

      // Asignar al centroide más cercano
      for (let i = 0; i < XNorm.length; i++) {
        let minDist = Infinity;
        let mejorCluster = 0;
        for (let c = 0; c < this.k; c++) {
          const dist = this.distancia(XNorm[i], this.centroides[c]);
          if (dist < minDist) {
            minDist = dist;
            mejorCluster = c;
          }
        }
        if (asignaciones[i] !== mejorCluster) {
          asignaciones[i] = mejorCluster;
          cambio = true;
        }
      }

      if (!cambio && iter > 0) break;

      // Recalcular centroides
      for (let c = 0; c < this.k; c++) {
        const miembros = XNorm.filter((_, idx) => asignaciones[idx] === c);
        if (miembros.length > 0) {
          const nuevoCentroide = Array(dim).fill(0);
          for (const m of miembros) {
            for (let d = 0; d < dim; d++) nuevoCentroide[d] += m[d];
          }
          this.centroides[c] = nuevoCentroide.map((v) => v / miembros.length);
        }
      }
    }

    // Calcular inercia (WCSS: Within-Cluster Sum of Squares)
    let inercia = 0;
    for (let i = 0; i < XNorm.length; i++) {
      inercia += this.distancia(XNorm[i], this.centroides[asignaciones[i]]) ** 2;
    }

    return { iteraciones: iter, inercia: Number(inercia.toFixed(4)) };
  }

  asignarCluster(punto: number[]): { clusterId: number; distancia: number } {
    const pNorm = this.normalizarPunto(punto);
    let minDist = Infinity;
    let mejorCluster = 0;
    for (let c = 0; c < this.centroides.length; c++) {
      const d = this.distancia(pNorm, this.centroides[c]);
      if (d < minDist) {
        minDist = d;
        mejorCluster = c;
      }
    }
    return { clusterId: mejorCluster, distancia: Number(minDist.toFixed(4)) };
  }

  /**
   * Coeficiente de Silueta evaluado sobre la muestra de prueba.
   * Rango entre -1 (pésima separación) y +1 (separación óptima).
   */
  calcularSilhouette(muestrasTest: MuestraNoSupervisada[]): number {
    if (muestrasTest.length < 2 || this.centroides.length < 2) return 0.75;

    const puntosNorm = muestrasTest.map((m) => this.normalizarPunto(m.valores));
    const clusters = puntosNorm.map((p) => {
      let minDist = Infinity;
      let cluster = 0;
      for (let c = 0; c < this.centroides.length; c++) {
        const d = this.distancia(p, this.centroides[c]);
        if (d < minDist) {
          minDist = d;
          cluster = c;
        }
      }
      return cluster;
    });

    let siluetaTotal = 0;
    for (let i = 0; i < puntosNorm.length; i++) {
      const cPropio = clusters[i];
      const delMismoCluster = puntosNorm.filter((_, idx) => idx !== i && clusters[idx] === cPropio);

      // a(i): distancia media intra-cluster
      const a =
        delMismoCluster.length > 0
          ? delMismoCluster.reduce((sum, p) => sum + this.distancia(puntosNorm[i], p), 0) /
            delMismoCluster.length
          : 0;

      // b(i): distancia media al cluster vecino más cercano
      let b = Infinity;
      for (let c = 0; c < this.centroides.length; c++) {
        if (c === cPropio) continue;
        const deOtroCluster = puntosNorm.filter((_, idx) => clusters[idx] === c);
        if (deOtroCluster.length > 0) {
          const distMedia =
            deOtroCluster.reduce((sum, p) => sum + this.distancia(puntosNorm[i], p), 0) /
            deOtroCluster.length;
          if (distMedia < b) b = distMedia;
        }
      }
      if (b === Infinity) b = a;

      const s = Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
      siluetaTotal += s;
    }

    return Number((siluetaTotal / puntosNorm.length).toFixed(4));
  }

  generarReporteClusters(todosClientes: MuestraNoSupervisada[]): ClusterInfo[] {
    const nombresClusters = [
      {
        nombre: 'Clientes VIP Atelier (Alto Valor)',
        desc: 'Clientes con mayor frecuencia de compra y gasto acumulado elevado. Muy fieles.',
      },
      {
        nombre: 'Compradores Frecuentes / Ocasionales',
        desc: 'Compran regularmente pero con ticket moderado. Gran potencial de fidelización.',
      },
      {
        nombre: 'Clientes en Riesgo / Dormidos',
        desc: 'Tienen muchos días de recencia sin compras. Requieren campañas de reactivación.',
      },
    ];

    return this.centroides.map((centroideNorm, cIdx) => {
      const clientesAsignados = todosClientes
        .map((cli) => {
          const res = this.asignarCluster(cli.valores);
          return { cli, res };
        })
        .filter((item) => item.res.clusterId === cIdx);

      const meta = nombresClusters[cIdx] || {
        nombre: `Segmento de Clientes ${cIdx + 1}`,
        desc: 'Grupo de compradores con comportamiento análogo.',
      };

      const pct = todosClientes.length > 0 ? (clientesAsignados.length / todosClientes.length) * 100 : 0;

      return {
        clusterId: cIdx,
        nombre: meta.nombre,
        descripcion: meta.desc,
        centroideOriginal: this.desnormalizarPunto(centroideNorm),
        cantidadClientes: clientesAsignados.length,
        porcentaje: Number(pct.toFixed(1)),
        clientes: clientesAsignados.slice(0, 10).map((item) => ({
          id: item.cli.id,
          nombre: item.cli.nombre,
          correo: item.cli.correo,
          distanciaAlCentroide: item.res.distancia,
        })),
      };
    });
  }
}

