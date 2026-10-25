import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth.store';
import { useCartStore } from '../store/cart.store';
import { useFavoritosStore } from '../store/favoritos.store';
import { MiTienda, tiendasApi } from '../services/tiendas.api';

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: 'Prueba gratuita',
  ESTANDAR: 'Estándar',
  CORPORATIVO: 'Corporativo',
};

/** Tienda activa del usuario y cambio entre las tiendas a las que pertenece (mismo correo, varias tiendas). */
export const StoreSwitcher: React.FC = () => {
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const [tiendas, setTiendas] = useState<MiTienda[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!isAuthenticated) return;
    setCargando(true);
    try {
      setTiendas(await tiendasApi.listarMias());
    } catch {
      // Sin conexión o sesión antigua: el perfil sigue funcionando sin esta sección
      setTiendas([]);
    } finally {
      setCargando(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiar = async (tienda: MiTienda) => {
    setCambiandoId(tienda.id);
    try {
      const sesion = await tiendasApi.seleccionar(tienda.id);
      setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);

      // Carrito y favoritos son de cada tienda: se vacía lo local (sin llamar al servidor, que ya
      // responde con la tienda nueva) y se vuelve a cargar lo de la tienda elegida.
      useCartStore.setState({
        guestItems: [],
        cart: { items: [], totalItems: 0, total: 0 },
        cupon: null,
        descuento: 0,
        totalConDescuento: 0,
        mensajeCupon: null,
        error: null,
      });
      useFavoritosStore.setState({ items: [], favoritosIds: [] });
      await Promise.allSettled([
        useCartStore.getState().sincronizarTrasLogin(),
        useFavoritosStore.getState().cargarFavoritos(sesion.usuario.id),
      ]);

      await cargar();
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

  if (!isAuthenticated || (tiendas.length === 0 && !cargando)) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mi tienda</Text>
      <View style={styles.card}>
        {cargando && tiendas.length === 0 ? (
          <ActivityIndicator color="#111827" />
        ) : (
          tiendas.map((tienda, index) => (
            <TouchableOpacity
              key={tienda.id}
              style={[styles.row, index > 0 && styles.rowDivider]}
              disabled={tienda.esActiva || cambiandoId !== null}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 10, letterSpacing: 0.5 },
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
