import {
  particionar8020,
  RandomForestClasificador,
  KMeansClustering,
  MuestraSupervisada,
  MuestraNoSupervisada,
} from '../../src/modules/admin/analytics/ml-models';

describe('Machine Learning Models & Partición 80/20', () => {
  describe('Partición 80/20 (Train / Test Split)', () => {
    it('debe dividir exactamente 80% entrenamiento y 20% prueba en un conjunto de 100 muestras', () => {
      const datos = Array.from({ length: 100 }, (_, i) => ({ id: `id-${i}`, valor: i }));
      const particion = particionar8020(datos, 0.20, 42);

      expect(particion.tamanioTotal).toBe(100);
      expect(particion.tamanioEntrenamiento).toBe(80);
      expect(particion.tamanioPrueba).toBe(20);
      expect(particion.proporcionEntrenamiento).toBe(0.80);
      expect(particion.proporcionPrueba).toBe(0.20);
    });

    it('no debe haber intersección entre entrenamiento y prueba', () => {
      const datos = Array.from({ length: 50 }, (_, i) => i);
      const particion = particionar8020(datos, 0.20, 123);

      const idsEntrenamiento = new Set(particion.entrenamiento);
      for (const item of particion.prueba) {
        expect(idsEntrenamiento.has(item)).toBe(false);
      }
    });
  });

  describe('Random Forest (Modelo Supervisado)', () => {
    it('debe entrenar un ensamble de árboles y evaluar métricas sobre el 20% de prueba', () => {
      // Crear datos sintéticos linealmente separables
      const muestras: MuestraSupervisada[] = [];
      for (let i = 0; i < 60; i++) {
        // Clase 1: Clientes VIP (baja recencia, muchas compras, alto gasto)
        muestras.push({
          id: `vip-${i}`,
          caracteristicas: [5 + Math.random() * 5, 10 + Math.random() * 5, 1000 + Math.random() * 200, 100],
          etiqueta: 1,
        });
        // Clase 0: Clientes en riesgo (alta recencia, pocas compras, bajo gasto)
        muestras.push({
          id: `riesgo-${i}`,
          caracteristicas: [80 + Math.random() * 20, 1 + Math.random() * 2, 80 + Math.random() * 50, 40],
          etiqueta: 0,
        });
      }

      // Partición 80/20
      const particion = particionar8020(muestras, 0.20, 42);
      expect(particion.entrenamiento.length).toBe(96);
      expect(particion.prueba.length).toBe(24);

      // Entrenar Random Forest
      const rf = new RandomForestClasificador(12, 4);
      rf.entrenar(particion.entrenamiento);

      // Evaluar sobre el 20% de prueba
      const metricas = rf.evaluar(particion.prueba);

      expect(metricas.totalEvaluados).toBe(24);
      expect(metricas.exactitud).toBeGreaterThanOrEqual(0.75);
      expect(metricas.precision).toBeGreaterThanOrEqual(0.70);
      expect(metricas.f1Score).toBeGreaterThanOrEqual(0.70);
      expect(metricas.matrizConfusion).toBeDefined();

      const importancia = rf.obtenerImportanciaCaracteristicas();
      expect(importancia.length).toBe(4);
      expect(importancia.some((imp) => imp.peso > 0)).toBe(true);
    });
  });

  describe('K-Means Clustering (Modelo No Supervisado)', () => {
    it('debe agrupar clientes en 3 clusters con partición 80/20 y calcular Silhouette Score', () => {
      // Crear 3 grupos de clientes sintéticos bien diferenciados
      const datosClientes: MuestraNoSupervisada[] = [];
      for (let i = 0; i < 30; i++) {
        // Grupo 1: VIP
        datosClientes.push({
          id: `c-vip-${i}`,
          nombre: `VIP ${i}`,
          correo: `vip${i}@test.com`,
          valores: [10 + Math.random() * 5, 15 + Math.random() * 5, 3000 + Math.random() * 500],
        });
        // Grupo 2: Ocasionales
        datosClientes.push({
          id: `c-oca-${i}`,
          nombre: `Ocasional ${i}`,
          correo: `oca${i}@test.com`,
          valores: [40 + Math.random() * 10, 4 + Math.random() * 2, 500 + Math.random() * 200],
        });
        // Grupo 3: Inactivos
        datosClientes.push({
          id: `c-inac-${i}`,
          nombre: `Inactivo ${i}`,
          correo: `inac${i}@test.com`,
          valores: [180 + Math.random() * 30, 1, 100 + Math.random() * 50],
        });
      }

      // Partición 80/20
      const particion = particionar8020(datosClientes, 0.20, 99);
      expect(particion.entrenamiento.length).toBe(72);
      expect(particion.prueba.length).toBe(18);

      // Entrenar K-Means con k=3
      const kmeans = new KMeansClustering(3, 40);
      const resultadoEntrenamiento = kmeans.entrenar(particion.entrenamiento);

      expect(resultadoEntrenamiento.iteraciones).toBeGreaterThanOrEqual(0);

      // Evaluar Silhouette Score sobre el 20% de prueba
      const silhouette = kmeans.calcularSilhouette(particion.prueba);
      expect(silhouette).toBeGreaterThan(0.2); // Clusters separados positivamente

      // Reporte de clusters
      const reporte = kmeans.generarReporteClusters(datosClientes);
      expect(reporte.length).toBe(3);
      expect(reporte.some((c) => c.cantidadClientes > 0)).toBe(true);
    });
  });
});

