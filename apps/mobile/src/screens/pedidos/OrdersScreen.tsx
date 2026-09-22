import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, Pedido } from '../../services/orders.api';
import { useAuthStore } from '../../store/auth.store';

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      cargarPedidos();
    } else {
      setCargando(false);
    }
  }, [isAuthenticated, user]);

  const cargarPedidos = async () => {
    if (!isAuthenticated || !user) {
      setCargando(false);
      setRefrescando(false);
      return;
    }
    try {
      const data = await ordersApi.obtenerMisPedidos();
      setPedidos(data || []);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.warn('Error cargando pedidos en mobile:', err?.message || err);
      }
      setPedidos([]);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  const handleRefresh = () => {
    setRefrescando(true);
    cargarPedidos();
  };

  const handleCancelar = (pedido: Pedido) => {
    Alert.alert(
      'Cancelar Pedido',
      `¿Estás seguro de que deseas cancelar el pedido ${pedido.nro}? Las prendas se reincorporarán al stock.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await ordersApi.cancelarPedido(pedido.id, 'Cancelado desde la aplicación móvil');
              Alert.alert('Éxito', 'El pedido fue cancelado satisfactoriamente.');
              if (pedidoSeleccionado?.id === pedido.id) setPedidoSeleccionado(null);
              cargarPedidos();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo cancelar el pedido.');
            }
          },
        },
      ],
    );
  };

  const puedeCancelar = (p: Pedido) => {
    const permitidos = ['PENDIENTE', 'PAGADO'];
    if (!permitidos.includes(p.estado)) return false;
    if (p.envio && ['EN_CAMINO', 'EN_REPARTO', 'ENTREGADO'].includes(p.envio.estado)) {
      return false;
    }
    return true;
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado === 'TODOS') return true;
    if (filtroEstado === 'PAGADO') return p.estado === 'PAGADO' || p.pago?.estado === 'APROBADO';
    if (filtroEstado === 'PENDIENTE') return p.estado === 'PENDIENTE' || p.pago?.estado === 'PENDIENTE';
    if (filtroEstado === 'ENVIADO') return p.estado === 'ENVIADO' || p.envio?.estado === 'EN_CAMINO';
    if (filtroEstado === 'ENTREGADO') return p.estado === 'ENTREGADO' || p.envio?.estado === 'ENTREGADO';
    if (filtroEstado === 'CANCELADO') return p.estado === 'CANCELADO';
    if (filtroEstado === 'REEMBOLSADO') return p.estado === 'REEMBOLSADO' || p.pago?.estado === 'REEMBOLSADO';
    return true;
  });

  const getStatusBadge = (estado: string, estadoPago?: string) => {
    if (estado === 'REEMBOLSADO' || estadoPago === 'REEMBOLSADO') {
      return (
        <View style={[styles.badge, { backgroundColor: '#f3e8ff' }]}>
          <Text style={[styles.badgeText, { color: '#6b21a8' }]}>Reembolsado</Text>
        </View>
      );
    }
    if (estado === 'ENTREGADO') {
      return (
        <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.badgeText, { color: '#15803d' }]}>Entregado</Text>
        </View>
      );
    }
    if (estado === 'ENVIADO') {
      return (
        <View style={[styles.badge, { backgroundColor: '#dbeafe' }]}>
          <Text style={[styles.badgeText, { color: '#1d4ed8' }]}>En Camino</Text>
        </View>
      );
    }
    if (estado === 'PAGADO' || estadoPago === 'APROBADO') {
      return (
        <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
          <Text style={[styles.badgeText, { color: '#065f46' }]}>Pagado</Text>
        </View>
      );
    }
    if (estado === 'PENDIENTE' || estadoPago === 'PENDIENTE') {
      return (
        <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
          <Text style={[styles.badgeText, { color: '#92400e' }]}>Pendiente</Text>
        </View>
      );
    }
    if (estado === 'CANCELADO') {
      return (
        <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.badgeText, { color: '#b91c1c' }]}>Cancelado</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
        <Text style={[styles.badgeText, { color: '#475569' }]}>{estado}</Text>
      </View>
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis Pedidos</Text>
          <Text style={styles.subtitle}>Historial de compras y estado de pagos</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Inicia sesión</Text>
          <Text style={styles.emptySubtitle}>
            Para ver tu historial de pedidos y estado de compras, por favor ingresa con tu cuenta.
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.shopBtnText}>Iniciar Sesión / Mi Perfil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis Pedidos</Text>
          <Text style={styles.subtitle}>Historial de compras y rastreo de envíos</Text>
        </View>
        <TouchableOpacity
          style={styles.trackingHeaderBtn}
          onPress={() => navigation.navigate('Tracking')}
        >
          <Ionicons name="navigate-outline" size={18} color="#4f46e5" />
          <Text style={styles.trackingHeaderBtnText}>Rastrear</Text>
        </TouchableOpacity>
      </View>

      {/* TABS DE FILTRO */}
      <View style={styles.tabContainer}>
        {['TODOS', 'PAGADO', 'PENDIENTE', 'ENVIADO', 'ENTREGADO', 'CANCELADO'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filtroEstado === tab && styles.tabActive]}
            onPress={() => setFiltroEstado(tab)}
          >
            <Text style={[styles.tabText, filtroEstado === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LISTA */}
      {cargando ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.loadingText}>Cargando tus compras...</Text>
        </View>
      ) : pedidosFiltrados.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="bag-handle-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No tienes pedidos aquí</Text>
          <Text style={styles.emptyDesc}>Realiza una compra en nuestro catálogo</Text>
        </View>
      ) : (
        <FlatList
          data={pedidosFiltrados}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={handleRefresh} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => setPedidoSeleccionado(item)}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.orderNro}>{item.nro}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(item.fecha).toLocaleDateString()} · {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {getStatusBadge(item.estado, item.pago?.estado)}
                </View>

                <View style={styles.divider} />

                <View style={styles.cardMid}>
                  <Text style={styles.itemCountText}>
                    {item.items?.length || 0} {item.items?.length === 1 ? 'prenda' : 'prendas'}
                  </Text>
                  <Text style={styles.methodText}>
                    {item.pago?.metodoPago || 'Tarjeta Stripe'}
                  </Text>
                </View>

                <View style={styles.cardBottom}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>${item.total.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>

              {/* BOTONES DE ACCIÓN RÁPIDA (HU-51 & HU-64) */}
              <View style={styles.cardActions}>
                {puedeCancelar(item) && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancelar(item)}
                  >
                    <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() =>
                    navigation.navigate('Tracking', {
                      codigo: item.envio?.numeroTracking || item.nro,
                    })
                  }
                >
                  <Ionicons name="locate-outline" size={14} color="#4f46e5" />
                  <Text style={styles.trackBtnText}>Rastrear Envío</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => setPedidoSeleccionado(item)}
                >
                  <Text style={styles.detailBtnText}>Ver Detalle</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL DETALLE DE ORDEN (HU-50 & HU-55) */}
      {pedidoSeleccionado && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalSub}>Comprobante y Envío</Text>
                  <Text style={styles.modalTitle}>{pedidoSeleccionado.nro}</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setPedidoSeleccionado(null)}
                >
                  <Ionicons name="close" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10 }}>
                <View style={styles.statusRow}>
                  <Text style={styles.label}>Estado del Pedido:</Text>
                  {getStatusBadge(pedidoSeleccionado.estado, pedidoSeleccionado.pago?.estado)}
                </View>

                {/* BANNER DE ENVÍO */}
                {pedidoSeleccionado.envio && (
                  <View style={styles.shippingModalBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shippingModalLabel}>Transporte / Guía</Text>
                      <Text style={styles.shippingModalCode}>
                        {pedidoSeleccionado.envio.numeroTracking}
                      </Text>
                      <Text style={styles.shippingModalMeta}>
                        {pedidoSeleccionado.envio.empresaTransportadora || 'Courier Local'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.shippingModalBtn}
                      onPress={() => {
                        const code = pedidoSeleccionado.envio?.numeroTracking || pedidoSeleccionado.nro;
                        setPedidoSeleccionado(null);
                        navigation.navigate('Tracking', { codigo: code });
                      }}
                    >
                      <Text style={styles.shippingModalBtnText}>Mapa Satelital</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Prendas:</Text>
                {pedidoSeleccionado.items?.map((it) => (
                  <View key={it.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{it.nombre}</Text>
                      <Text style={styles.itemSub}>
                        Talla: {it.talla} · Color: {it.color} · Cant: {it.cantidad}
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>${it.subtotal.toFixed(2)}</Text>
                  </View>
                ))}

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabelBold}>Total:</Text>
                  <Text style={styles.totalValueBold}>${pedidoSeleccionado.total.toFixed(2)}</Text>
                </View>

                {/* HISTORIAL DE AUDITORÍA (HU-55) */}
                {pedidoSeleccionado.historial && pedidoSeleccionado.historial.length > 0 && (
                  <View style={styles.historyBox}>
                    <Text style={styles.historyTitle}>Historial de Estado (HU-55)</Text>
                    {pedidoSeleccionado.historial.map((h, i) => (
                      <View key={h.id || i} style={styles.historyItem}>
                        <Text style={styles.historyState}>
                          {h.estadoAnterior ? `${h.estadoAnterior} → ${h.estadoNuevo}` : h.estadoNuevo}
                        </Text>
                        {h.comentario && <Text style={styles.historyComment}>"{h.comentario}"</Text>}
                        <Text style={styles.historyTime}>
                          {new Date(h.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {h.autor || 'Sistema'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                {puedeCancelar(pedidoSeleccionado) && (
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => handleCancelar(pedidoSeleccionado)}
                  >
                    <Text style={styles.cancelModalBtnText}>Cancelar Pedido</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setPedidoSeleccionado(null)}
                >
                  <Text style={styles.modalCloseBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  trackingHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trackingHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabActive: { backgroundColor: '#0f172a' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 40,
  },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  emptyDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  emptySubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 6, textAlign: 'center', lineHeight: 18 },
  shopBtn: {
    marginTop: 20,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNro: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  orderDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between' },
  itemCountText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  methodText: { fontSize: 12, color: '#64748b' },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  totalLabel: { fontSize: 12, color: '#64748b', marginRight: 6 },
  totalAmount: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#eef2ff',
  },
  trackBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  detailBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  detailBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSub: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '700' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  closeBtn: { padding: 6 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  shippingModalBox: {
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  shippingModalLabel: { fontSize: 10, color: '#6366f1', textTransform: 'uppercase', fontWeight: '700' },
  shippingModalCode: { fontSize: 14, fontWeight: '900', color: '#1e1b4b', fontFamily: 'monospace' },
  shippingModalMeta: { fontSize: 11, color: '#4338ca' },
  shippingModalBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shippingModalBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  itemSub: { fontSize: 11, color: '#64748b' },
  itemPrice: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabelBold: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  totalValueBold: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  historyBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  historyTitle: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 6 },
  historyItem: { marginBottom: 6 },
  historyState: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  historyComment: { fontSize: 10, color: '#64748b', fontStyle: 'italic' },
  historyTime: { fontSize: 9, color: '#94a3b8' },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    alignItems: 'center',
  },
  cancelModalBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  modalCloseBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
export default OrdersScreen;
