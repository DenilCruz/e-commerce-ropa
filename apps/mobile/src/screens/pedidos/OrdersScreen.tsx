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

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado === 'TODOS') return true;
    if (filtroEstado === 'PAGADO') return p.estado === 'PAGADO' || p.pago?.estado === 'APROBADO';
    if (filtroEstado === 'PENDIENTE') return p.estado === 'PENDIENTE' || p.pago?.estado === 'PENDIENTE';
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
        <Text style={styles.title}>Mis Pedidos</Text>
        <Text style={styles.subtitle}>Historial de compras y estado de pagos</Text>
      </View>

      {/* TABS DE FILTRO */}
      <View style={styles.tabContainer}>
        {['TODOS', 'PAGADO', 'PENDIENTE', 'REEMBOLSADO'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filtroEstado === tab && styles.tabActive]}
            onPress={() => setFiltroEstado(tab)}
          >
            <Text style={[styles.tabText, filtroEstado === tab && styles.tabTextActive]}>
              {tab === 'TODOS' ? 'Todos' : tab === 'PAGADO' ? 'Pagados' : tab === 'PENDIENTE' ? 'Pendientes' : 'Reembolsados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LISTA */}
      {cargando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Cargando pedidos...</Text>
        </View>
      ) : pedidosFiltrados.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={54} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No tienes pedidos</Text>
          <Text style={styles.emptySubtitle}>
            {filtroEstado === 'TODOS'
              ? 'Tus compras realizadas aparecerán listadas aquí.'
              : `No se encontraron pedidos con estado ${filtroEstado}.`}
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('Catalog')}
          >
            <Text style={styles.shopBtnText}>Explorar Catálogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pedidosFiltrados}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.orderCard}
              activeOpacity={0.7}
              onPress={() => setPedidoSeleccionado(item)}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.orderNro}>{item.nro}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(item.fecha).toLocaleDateString('es-BO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
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
                <Text style={styles.totalAmount}>Bs. {item.total.toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* MODAL DETALLE DE ORDEN */}
      {pedidoSeleccionado && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalSub}>Comprobante de Orden</Text>
                  <Text style={styles.modalTitle}>{pedidoSeleccionado.nro}</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setPedidoSeleccionado(null)}
                >
                  <Ionicons name="close" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }}>
                <View style={styles.statusRow}>
                  <Text style={styles.label}>Estado del Pago:</Text>
                  {getStatusBadge(pedidoSeleccionado.estado, pedidoSeleccionado.pago?.estado)}
                </View>

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
                    <Text style={styles.itemPrice}>Bs. {it.subtotal.toFixed(2)}</Text>
                  </View>
                ))}

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabelBold}>Total Pagado:</Text>
                  <Text style={styles.totalValueBold}>Bs. {pedidoSeleccionado.total.toFixed(2)}</Text>
                </View>

                {pedidoSeleccionado.pago?.idTransaccion && (
                  <View style={styles.txBox}>
                    <Text style={styles.txLabel}>Ref. Transacción Stripe:</Text>
                    <Text style={styles.txValue}>{pedidoSeleccionado.pago.idTransaccion}</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPedidoSeleccionado(null)}
              >
                <Text style={styles.modalCloseBtnText}>Cerrar</Text>
              </TouchableOpacity>
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
    borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabActive: { backgroundColor: '#000' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: '500' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  shopBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  listContent: { padding: 16, gap: 12 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNro: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  orderDate: { fontSize: 11, color: '#64748b', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between' },
  itemCountText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  methodText: { fontSize: 12, color: '#6366f1', fontWeight: '700' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginRight: 4 },
  totalAmount: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  // MODAL
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
    gap: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalSub: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  closeBtn: { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 20 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  itemSub: { fontSize: 11, color: '#64748b' },
  itemPrice: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabelBold: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  totalValueBold: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  txBox: { backgroundColor: '#eef2ff', padding: 10, borderRadius: 10, marginTop: 6 },
  txLabel: { fontSize: 10, fontWeight: '700', color: '#4338ca', textTransform: 'uppercase' },
  txValue: { fontSize: 11, fontFamily: 'monospace', color: '#3730a3', marginTop: 2 },
  modalCloseBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
