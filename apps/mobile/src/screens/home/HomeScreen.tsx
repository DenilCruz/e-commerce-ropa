import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { catalogoApi, Producto, Categoria } from '../../services/catalogo.api';
import { useFavoritosStore } from '../../store/favoritos.store';
import { HeartButton } from '../../components/HeartButton';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { favoritosIds } = useFavoritosStore();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [destacados, setDestacados] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [cats, prods] = await Promise.all([
          catalogoApi.obtenerCategorias(),
          catalogoApi.obtenerProductos(),
        ]);
        setCategorias(cats.filter((c) => c.activa !== false));
        // Filtrar productos destacados o primeros 6
        const destac = prods.filter((p) => p.destacado);
        setDestacados(destac.length > 0 ? destac : prods.slice(0, 6));
      } catch (err) {
        console.error('Error cargando inicio en móvil:', err);
      } finally {
        setCargando(false);
      }
    };
    fetchHomeData();
  }, []);

  const getImageUrl = (url?: string | null) => {
    if (!url) return 'https://placehold.co/400x500?text=Sin+Imagen';
    if (url.startsWith('http')) return url;
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api/v1';
    const assetsURL = baseURL.replace('/api/v1', '');
    if (url.startsWith('/uploads')) return `${assetsURL}${url}`;
    if (url.startsWith('/')) return `${assetsURL}/uploads${url}`;
    return `${assetsURL}/uploads/${url}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* NAVBAR SUPERIOR */}
      <View style={styles.navbar}>
        <View>
          <Text style={styles.brandTitle}>ATELIER</Text>
          <Text style={styles.brandSubtitle}>COLECCIÓN 2026</Text>
        </View>

        <TouchableOpacity
          style={styles.favIconBtn}
          onPress={() => navigation.navigate('Favoritos')}
        >
          <Ionicons name="heart-outline" size={24} color="#111827" />
          {favoritosIds.length > 0 && (
            <View style={styles.favBadge}>
              <Text style={styles.favBadgeText}>{favoritosIds.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* HERO BANNER EDITORIAL */}
          <View style={styles.heroCard}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
              }}
              style={styles.heroImage}
              contentFit="cover"
            />
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTag}>NUEVA TEMPORADA</Text>
              <Text style={styles.heroTitle}>Elegancia Atemporal</Text>
              <Text style={styles.heroDesc}>
                Diseños contemporáneos confeccionados con los mejores textiles.
              </Text>
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={() => navigation.navigate('Catalog')}
              >
                <Text style={styles.heroBtnText}>Explorar Catálogo</Text>
                <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* HU-33: CATEGORÍAS EN HORIZONTAL */}
          {categorias.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categorías</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Catalog')}>
                  <Text style={styles.seeAllText}>Ver todas</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
                {categorias.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryCard}
                    onPress={() => navigation.navigate('Catalog')}
                  >
                    <View style={styles.categoryCircle}>
                      <Ionicons name="shirt-outline" size={22} color="#111827" />
                    </View>
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {cat.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* PRENDAS DESTACADAS CON BOTÓN DE FAVORITOS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prendas Destacadas</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Catalog')}>
                <Text style={styles.seeAllText}>Ver catálogo</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {destacados.map((item) => {
                const imgPrincipal =
                  item.imagenes?.find((img) => img.esPrincipal || img.principal)?.url ||
                  item.imagenes?.[0]?.url;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.productCard}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  >
                    <View style={styles.productImageContainer}>
                      <Image
                        source={{ uri: getImageUrl(imgPrincipal) }}
                        style={styles.productImage}
                        contentFit="cover"
                      />
                      <View style={styles.heartWrapper}>
                        <HeartButton productoId={item.id} size={18} />
                      </View>
                    </View>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.productCategory}>{item.categoria?.nombre || 'Colección'}</Text>
                    <Text style={styles.productPrice}>${Number(item.precio || 0).toFixed(2)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  brandTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 2, color: '#111827' },
  brandSubtitle: { fontSize: 9, fontWeight: '600', letterSpacing: 1.5, color: '#9ca3af' },
  favIconBtn: { position: 'relative', padding: 4 },
  favBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  favBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 32 },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroTag: { color: '#fbbf24', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  heroDesc: { color: '#e5e7eb', fontSize: 12, marginBottom: 14, maxWidth: '85%' },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
  },
  heroBtnText: { color: '#000', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  seeAllText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  categoriesRow: { paddingHorizontal: 16, gap: 14 },
  categoryCard: { alignItems: 'center', width: 72 },
  categoryCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  featuredRow: { paddingHorizontal: 16, gap: 14 },
  productCard: { width: 145 },
  productImageContainer: {
    width: 145,
    height: 190,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  productImage: { width: '100%', height: '100%' },
  heartWrapper: { position: 'absolute', top: 8, right: 8 },
  productTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  productCategory: { fontSize: 11, color: '#9ca3af', marginVertical: 2 },
  productPrice: { fontSize: 13, fontWeight: '800', color: '#111827' },
});
