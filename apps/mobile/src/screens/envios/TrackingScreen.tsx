import React, { useState, useEffect } from 'react';
import {
  View as RNView,
  Text as RNText,
  StyleSheet as RNStyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity as RNTouchableOpacity,
  ScrollView as RNScrollView,
  ActivityIndicator as RNActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { shippingApi, TrackingInfo } from '../../services/shipping.api';

export const TrackingScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const initialCodigo = route.params?.codigo || '';

  const [codigoInput, setCodigoInput] = useState(initialCodigo);
  const [trackingData, setTrackingData] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarTracking = async (cod: string) => {
    if (!cod.trim()) {
      setError('Ingresa un código de seguimiento o número de pedido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await shippingApi.consultarTracking(cod.trim());
      setTrackingData(data);
    } catch (err: any) {
      setTrackingData(null);
      setError(err.response?.data?.message || 'No se encontró el envío solicitado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCodigo) {
      buscarTracking(initialCodigo);
    }
  }, [initialCodigo]);

  return (
    <RNScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER */}
      <RNView style={styles.header}>
        <RNText style={styles.headerTitle}>Rastreo de Envíos</RNText>
        <RNText style={styles.headerSubtitle}>
          Sigue el estado y ruta satelital de tu paquete en tiempo real
        </RNText>
      </RNView>

      {/* BUSCADOR */}
      <RNView style={styles.searchBox}>
        <RNTextInput
          style={styles.searchInput}
          placeholder="Código de guía (TRK-...) o Pedido"
          placeholderTextColor="#94a3b8"
          value={codigoInput}
          onChangeText={setCodigoInput}
          autoCapitalize="characters"
        />
        <RNTouchableOpacity
          style={styles.searchBtn}
          onPress={() => buscarTracking(codigoInput)}
          disabled={loading}
        >
          {loading ? (
            <RNActivityIndicator size="small" color="#ffffff" />
          ) : (
            <RNText style={styles.searchBtnText}>Rastrear</RNText>
          )}
        </RNTouchableOpacity>
      </RNView>

      {error && (
        <RNView style={styles.errorBox}>
          <RNText style={styles.errorText}>{error}</RNText>
        </RNView>
      )}

      {/* RESULTADO DE RASTREO */}
      {trackingData && (
        <RNView style={styles.card}>
          {/* BANNER GUÍA */}
          <RNView style={styles.guideBanner}>
            <RNView>
              <RNText style={styles.guideLabel}>Número de Guía</RNText>
              <RNText style={styles.guideCode}>{trackingData.numeroTracking}</RNText>
              <RNText style={styles.guideMeta}>
                {trackingData.orden.nro} · {trackingData.empresaTransportadora}
              </RNText>
            </RNView>
            <RNView style={styles.badge}>
              <RNText style={styles.badgeText}>{trackingData.estado}</RNText>
            </RNView>
          </RNView>

          {/* DESTINO Y FECHA */}
          <RNView style={styles.infoRow}>
            <RNView style={styles.infoCol}>
              <RNText style={styles.infoLabel}>Dirección de Destino</RNText>
              <RNText style={styles.infoValue}>{trackingData.direccionEntrega}</RNText>
            </RNView>
            <RNView style={styles.infoCol}>
              <RNText style={styles.infoLabel}>Fecha Estimada</RNText>
              <RNText style={styles.infoValue}>
                {trackingData.fechas.fechaEntregaEstimada
                  ? new Date(trackingData.fechas.fechaEntregaEstimada).toLocaleDateString()
                  : 'En curso'}
              </RNText>
            </RNView>
          </RNView>

          {/* TIMELINE DE 4 PASOS */}
          <RNView style={styles.timelineSection}>
            <RNText style={styles.sectionTitle}>Etapas de Envío (HU-64)</RNText>
            {trackingData.timeline.map((item, idx) => (
              <RNView key={item.codigo} style={styles.timelineItem}>
                <RNView style={styles.timelineLeft}>
                  <RNView
                    style={[
                      styles.timelineCircle,
                      item.completado && styles.circleCompleted,
                      item.actual && styles.circleActive,
                    ]}
                  >
                    <RNText
                      style={[
                        styles.circleText,
                        item.completado && styles.circleTextCompleted,
                      ]}
                    >
                      {item.completado ? '✓' : item.paso}
                    </RNText>
                  </RNView>
                  {idx < trackingData.timeline.length - 1 && (
                    <RNView
                      style={[
                        styles.timelineLine,
                        item.completado && styles.lineCompleted,
                      ]}
                    />
                  )}
                </RNView>
                <RNView style={styles.timelineBody}>
                  <RNText style={styles.timelineTitle}>{item.titulo}</RNText>
                  <RNText style={styles.timelineDesc}>{item.descripcion}</RNText>
                  {item.fecha && (
                    <RNText style={styles.timelineTime}>
                      {new Date(item.fecha).toLocaleString()}
                    </RNText>
                  )}
                </RNView>
              </RNView>
            ))}
          </RNView>

          {/* CHECKPOINTS GEOGRÁFICOS / RUTA */}
          <RNView style={styles.routeSection}>
            <RNText style={styles.sectionTitle}>Ruta Georreferenciada (OpenStreetMap)</RNText>
            {trackingData.mapa.puntosRuta.map((pt, i) => (
              <RNView key={i} style={styles.routePoint}>
                <RNText style={styles.routePointName}>📍 {pt.nombre}</RNText>
                <RNText style={styles.routePointCoords}>
                  Coordenadas: {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                </RNText>
                <RNText style={styles.routePointDesc}>{pt.descripcion}</RNText>
              </RNView>
            ))}
          </RNView>

          {/* ARTÍCULOS */}
          <RNView style={styles.itemsSection}>
            <RNText style={styles.sectionTitle}>
              Prendas en este Envío ({trackingData.orden.items.length})
            </RNText>
            {trackingData.orden.items.map((it) => (
              <RNView key={it.id} style={styles.orderItem}>
                <RNText style={styles.orderItemName}>{it.nombre}</RNText>
                <RNText style={styles.orderItemPrice}>
                  Bs. {Number(it.subtotal).toFixed(2)}
                </RNText>
              </RNView>
            ))}
          </RNView>
        </RNView>
      )}
    </RNScrollView>
  );
};

const styles = RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  searchBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  guideBanner: {
    backgroundColor: '#0f172a',
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guideLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  guideCode: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  guideMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f1f5f9',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  timelineSection: {
    padding: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 32,
  },
  timelineCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  circleCompleted: {
    backgroundColor: '#4f46e5',
  },
  circleActive: {
    borderWidth: 2,
    borderColor: '#818cf8',
  },
  circleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  circleTextCompleted: {
    color: '#ffffff',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e2e8f0',
  },
  lineCompleted: {
    backgroundColor: '#4f46e5',
  },
  timelineBody: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: '#4f46e5',
    fontWeight: '600',
    marginTop: 3,
  },
  routeSection: {
    padding: 18,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  routePoint: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  routePointName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  routePointCoords: {
    fontSize: 10,
    color: '#4f46e5',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  routePointDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  itemsSection: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  orderItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
});
