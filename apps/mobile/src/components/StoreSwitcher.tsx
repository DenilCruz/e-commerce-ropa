import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth.store';
import { useCartStore } from '../store/cart.store';
import { useFavoritosStore } from '../store/favoritos.store';
import { MiTienda, tiendasApi } from '../services/tiendas.api';
import { useNetworkStore } from '../store/network.store';
import { leerSesion } from '../services/pos/sesion';
import { tiendasParaCambiar } from '../services/tienda-sesion';
import { limpiarDatosLocalesDeTienda } from '../store/datos-tienda';

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: 'Prueba gratuita',
  ESTANDAR: 'Estándar',
  CORPORATIVO: 'Corporativo',
};

/** Tienda activa del usuario y cambio entre las tiendas a las que pertenece (mismo correo, varias tiendas). */
export const StoreSwitcher: React.FC = () => {
  const { isAuthenticated, token, user, tiendaActiva, setAuth, setTiendaActiva } = useAuthStore();
  const conectado = useNetworkStore((state) => state.isConnected);
  const tenantId = leerSesion(token)?.tenantId;
  const tiendaVisible = tiendaActiva?.id === tenantId ? tiendaActiva : null;
  const tiendaIdentificada = Boolean(tiendaVisible?.slug);
  const [abierto, setAbierto] = useState(false);
  const [tiendas, setTiendas] = useState<MiTienda[]>([]);
  const tiendasDisponibles = tiendasParaCambiar(tiendas, user?.rol);
  const [cargando, setCargando] = useState(false);
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!isAuthenticated || !conectado) return;
    setCargando(true);
    try {
      const datos = await tiendasApi.listarMias();
      if (useAuthStore.getState().token !== token) return;
      setTiendas(datos);
      const activa = datos.find((tienda) => tienda.id === tenantId);
      if (activa) setTiendaActiva({ id: activa.id, nombre: activa.nombre, slug: activa.slug });
    } catch {
      // Sin conexión o sesión antigua: el perfil sigue funcionando sin esta sección
      setTiendas([]);
    } finally {
      setCargando(false);
    }
  }, [isAuthenticated, conectado, tenantId, token, setTiendaActiva]);

  useEffect(() => {
    if (!tiendaIdentificada || abierto) void cargar();
  }, [abierto, cargar, tiendaIdentificada]);

  const cambiar = async (tienda: MiTienda) => {
    if (!tiendasDisponibles.some(({ id }) => id === tienda.id)) return;
    setCambiandoId(tienda.id);
    try {
      if (useCartStore.getState().guestItems.length) {
        await useCartStore.getState().sincronizarTrasLogin();
        if (useCartStore.getState().guestItems.length) {
          Alert.alert('Carrito pendiente', 'Sincroniza el carrito de esta tienda antes de cambiar.');
          return;
        }
      }
      const sesion = await tiendasApi.seleccionar(tienda.id);
      if (useAuthStore.getState().token !== token) return;

      // Carrito y favoritos son de cada tienda: se vacía lo local (sin llamar al servidor, que ya
      // responde con la tienda nueva) y se vuelve a cargar lo de la tienda elegida.
      limpiarDatosLocalesDeTienda();
      setAbierto(false);
      setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken, { id: tienda.id, nombre: tienda.nombre, slug: tienda.slug });
      await Promise.allSettled([
        useCartStore.getState().cargarCarrito(),
        useFavoritosStore.getState().cargarFavoritos(sesion.usuario.id),
      ]);

    } catch (err: any) {
      Alert.alert('No se pudo cambiar de tienda', err?.response?.data?.message || 'Inténtalo de nuevo.');
    } finally {
      setCambiandoId(null);
    }
  };

  const confirmarCambio = (tienda: MiTienda) => {
    Alert.alert(
      `Cambiar a ${tienda.nombre}`,
      'Vas a ver el catálogo, el carrito y los pedidos de esa tienda.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cambiar', onPress: () => void cambiar(tienda) },
      ],
    );
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setAbierto(true)}
        accessibilityRole="button" accessibilityLabel={`Tienda activa: ${tiendaVisible?.nombre ?? 'sin identificar'}. Ver tiendas`}>
        <Ionicons name="storefront-outline" size={17} color="#111827" />
        <Text numberOfLines={1} style={styles.triggerText}>{tiendaVisible?.nombre ?? 'Mi tienda'}</Text>
        <Ionicons name="chevron-down" size={14} color="#111827" />
      </TouchableOpacity>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.sectionTitle}>Mis tiendas</Text>
              <TouchableOpacity onPress={() => setAbierto(false)} accessibilityRole="button" accessibilityLabel="Cerrar selector de tiendas">
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            {!conectado && <Text style={styles.meta}>Conéctate a internet para cambiar de tienda.</Text>}
            {conectado && !cargando && tiendasDisponibles.length === 0 && <Text style={styles.meta}>No se pudieron cargar las tiendas. Vuelve a abrir el selector para reintentar.</Text>}
            <ScrollView style={styles.card}>
        {cargando && tiendasDisponibles.length === 0 ? (
          <ActivityIndicator color="#111827" />
        ) : (
          tiendasDisponibles.map((tienda, index) => (
            <TouchableOpacity
              key={tienda.id}
              style={[styles.row, index > 0 && styles.rowDivider]}
              disabled={!conectado || tienda.esActiva || cambiandoId !== null}
              onPress={() => confirmarCambio(tienda)}
              accessibilityRole="button"
              accessibilityLabel={
                tienda.esActiva ? `${tienda.nombre}, tienda activa` : `Cambiar a la tienda ${tienda.nombre}`
              }
            >
              <View style={[styles.icon, tienda.esActiva && styles.iconActive]}>
                <Ionicons name="storefront-outline" size={18} color={tienda.esActiva ? '#ffffff' : '#374151'} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{tienda.nombre}</Text>
                <Text style={styles.meta}>
                  {tienda.rol} · {PLAN_LABELS[tienda.plan] ?? tienda.plan}
                </Text>
              </View>
              {cambiandoId === tienda.id ? (
                <ActivityIndicator color="#111827" />
              ) : tienda.esActiva ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Activa</Text>
                </View>
              ) : (
                <Ionicons name="swap-horizontal-outline" size={18} color="#6b7280" />
              )}
            </TouchableOpacity>
          ))
        )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 160, padding: 10, marginRight: 6 },
  triggerText: { flexShrink: 1, color: '#111827', fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0008' },
  panel: { backgroundColor: '#fff', borderRadius: 18, maxHeight: '75%', padding: 16 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 56 },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconActive: { backgroundColor: '#111827' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  activeBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
});
