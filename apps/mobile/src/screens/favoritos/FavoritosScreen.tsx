import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { useFavoritosStore } from '../../store/favoritos.store';
import { useAuthStore } from '../../store/auth.store';
import { Favorito } from '../../services/favoritos.api';
import { api } from '../../services/api';

export const FavoritosScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAuthenticated } = useAuthStore();
  const { items, cargando, cargarFavoritos, eliminarFavorito, limpiarTodos, moverAlCarrito } =
    useFavoritosStore();

  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Record<string, string>>({});
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      cargarFavoritos(user.id);
    }
  }, [user, cargarFavoritos]);

  // Inicializar variantes por defecto
  useEffect(() => {
    const defaults: Record<string, string> = {};
    items.forEach((item) => {
      if (item.producto?.variantes && item.producto.variantes.length > 0) {
        const conStock =
          item.producto.variantes.find((v) => v.stock > 0) || item.producto.variantes[0];
        if (conStock) {
          defaults[item.productoId] = conStock.id;
        }
      }
    });
    setVarianteSeleccionada((prev) => ({ ...defaults, ...prev }));
  }, [items]);

  const getImageUrl = (url?: string | null) => {
    if (!url) return 'https://placehold.co/400x500?text=Sin+Imagen';
    if (url.startsWith('http')) return url;
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api/v1';
    const assetsURL = baseURL.replace('/api/v1', '');
    if (url.startsWith('/uploads')) return `${assetsURL}${url}`;
    if (url.startsWith('/')) return `${assetsURL}/uploads${url}`;
    return `${assetsURL}/uploads/${url}`;
  };

  const handleMoverAlCarrito = async (favorito: Favorito) => {
    if (!user || !favorito.producto) return;
    const varId = varianteSeleccionada[favorito.productoId];

    setProcesandoId(favorito.id);
    const res = await moverAlCarrito(user.id, favorito.productoId, varId, 1);
    setProcesandoId(null);

    if (res.exito) {
      Alert.alert(
        '¡Agregado al Carrito!',
        `"${favorito.producto.nombre}" fue movido al carrito de compras.`,
        [
          { text: 'Seguir viendo', style: 'cancel' },
          {
            text: 'Ir al Carrito',
            onPress: () => (navigation as any).navigate('Main', { screen: 'Cart' }),
          },
        ],
      );
    } else {
      Alert.alert('No disponible', res.mensaje);
    }
  };

  const handleEliminar = (productoId: string, nombre?: string) => {
    if (!user) return;
    Alert.alert(
      'Quitar de Favoritos',
      `¿Deseas quitar "${nombre || 'este producto'}" de tu lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => eliminarFavorito(user.id, productoId),
        },
      ],
    );
  };

  const handleVaciarTodo = () => {
    if (!user) return;
    Alert.alert(
      'Vaciar Favoritos',
      '¿Estás seguro de que deseas eliminar todas las prendas de tu lista de deseos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: () => limpiarTodos(user.id),
        },
      ],
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Mis Favoritos</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Inicia sesión para ver tus favoritos</Text>
          <Text style={styles.emptySubtitle}>
            Guarda tus prendas preferidas y sincronízalas en todos tus dispositivos.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: Favorito }) => {
    const producto = item.producto;
    if (!producto) return null;

    const imgPrincipal =
      producto.imagenes?.find((img) => img.esPrincipal || img.principal)?.url ||
      producto.imagenes?.[0]?.url;

    const variantes = producto.variantes || [];
    const varActualId = varianteSeleccionada[producto.id] || variantes[0]?.id;
    const varianteActual = variantes.find((v) => v.id === varActualId) || variantes[0];
    const stock = varianteActual?.stock ?? 0;
    const tieneStock = stock > 0;
    const procesandoEste = procesandoId === item.id;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardImageContainer}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ProductDetail', { productId: producto.id })}
        >
          <Image
            source={{ uri: getImageUrl(imgPrincipal) }}
            style={styles.cardImage}
            contentFit="cover"
          />
        </TouchableOpacity>

        <View style={styles.cardDetails}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.productName} numberOfLines={2}>
              {producto.nombre}
            </Text>
            {/* HU-78: Quitar de favoritos */}
            <TouchableOpacity
              onPress={() => handleEliminar(producto.id, producto.nombre)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {producto.categoria && (
            <Text style={styles.categoryLabel}>{producto.categoria.nombre}</Text>
          )}

          <Text style={styles.price}>${Number(producto.precio || 0).toFixed(2)}</Text>

          {/* HU-79: Selector de talla interactivo */}
          {variantes.length > 0 && (
            <View style={styles.sizesRow}>
              {variantes.map((v) => {
                const esSel = v.id === varActualId;
                const agotada = v.stock === 0;
                return (
                  <TouchableOpacity
                    key={v.id}
                    disabled={agotada}
                    onPress={() =>
                      setVarianteSeleccionada((prev) => ({ ...prev, [producto.id]: v.id }))
                    }
                    style={[
                      styles.sizeChip,
                      esSel && styles.sizeChipSelected,
                      agotada && styles.sizeChipDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        esSel && styles.sizeChipTextSelected,
                        agotada && styles.sizeChipTextDisabled,
                      ]}
                    >
                      {v.talla?.nombre || 'U'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ESTADO DE STOCK */}
          <View style={styles.stockRow}>
            {!tieneStock ? (
              <Text style={styles.stockOut}>Agotado</Text>
            ) : stock <= 5 ? (
              <Text style={styles.stockLow}>¡Últimas {stock} unidades!</Text>
            ) : (
              <Text style={styles.stockIn}>En stock</Text>
            )}
          </View>

          {/* HU-79: BOTÓN PASAR AL CARRITO */}
          <TouchableOpacity
            style={[styles.addToCartBtn, (!tieneStock || procesandoEste) && styles.btnDisabled]}
            disabled={!tieneStock || procesandoEste}
            onPress={() => handleMoverAlCarrito(item)}
          >
            {procesandoEste ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.addToCartText}>
                  {!tieneStock ? 'Sin stock' : 'Pasar al Carrito'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Favoritos</Text>
        {items.length > 0 ? (
          <TouchableOpacity onPress={handleVaciarTodo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-dislike-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Tu lista está vacía</Text>
          <Text style={styles.emptySubtitle}>
            Toca el corazón en cualquier prenda para guardarla y verla aquí.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => (navigation as any).navigate('Main', { screen: 'Catalog' })}
          >
            <Text style={styles.primaryBtnText}>Explorar Catálogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 24, maxWidth: 260 },
  primaryBtn: { backgroundColor: '#111827', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  listContainer: { padding: 16, gap: 14 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    padding: 12,
    gap: 12,
  },
  cardImageContainer: {
    width: 100,
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  cardImage: { width: '100%', height: '100%' },
  cardDetails: { flex: 1, justifyContent: 'space-between' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  categoryLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginTop: 2 },
  price: { fontSize: 15, fontWeight: '800', color: '#000', marginVertical: 4 },
  sizesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  sizeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  sizeChipSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  sizeChipDisabled: { backgroundColor: '#f3f4f6', borderColor: '#f3f4f6' },
  sizeChipText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  sizeChipTextSelected: { color: '#fff' },
  sizeChipTextDisabled: { color: '#d1d5db', textDecorationLine: 'line-through' },
  stockRow: { marginBottom: 8 },
  stockIn: { fontSize: 11, fontWeight: '600', color: '#16a34a' },
  stockLow: { fontSize: 11, fontWeight: '600', color: '#d97706' },
  stockOut: { fontSize: 11, fontWeight: '600', color: '#dc2626' },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnDisabled: { backgroundColor: '#d1d5db' },
  addToCartText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
