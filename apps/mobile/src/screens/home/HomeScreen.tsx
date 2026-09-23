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
import { api, getImageUrl } from '../../services/api';

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



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* NAVBAR SUPERIOR */}
      <View style={styles.navbar}>
        <View>
          <Text style={styles.brandTitle}>AURA</Text>
          <Text style={styles.brandSubtitle}>ALTA COSTURA · ATELIER</Text>
        </View>

        <TouchableOpacity
          style={styles.favIconBtn}
          onPress={() => navigation.navigate('Favoritos')}
        >
          <Ionicons name="heart-outline" size={22} color="#161513" />
          {favoritosIds.length > 0 && (
            <View style={styles.favBadge}>
              <Text style={styles.favBadgeText}>{favoritosIds.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#161513" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* HERO BANNER EDITORIAL */}
          <View style={styles.heroCard}>
            <Image
              source={{
                uri: getImageUrl('/uploads/vestido_seda_oliva_1790036699102.jpg'),
              }}
              style={styles.heroImage}
              contentFit="cover"
            />
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTag}>COLECCIÓN PERMANENTE</Text>
              <Text style={styles.heroTitle}>AURA</Text>
              <Text style={styles.heroDesc}>
                "Elegancia sutil, presencia absoluta."
              </Text>
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={() => navigation.navigate('Catalog')}
              >
                <Text style={styles.heroBtnText}>Descubrir Colección</Text>
                <Ionicons name="arrow-forward" size={14} color="#161513" style={{ marginLeft: 6 }} />
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
                    onPress={() => navigation.navigate('Catalog', { categoriaId: cat.id })}
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
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E1D7',
    backgroundColor: '#FAF8F5',
  },
  brandTitle: { fontSize: 22, fontWeight: '400', letterSpacing: 6, color: '#161513', textTransform: 'uppercase' },
  brandSubtitle: { fontSize: 8, fontWeight: '600', letterSpacing: 2, color: '#9B7B54', marginTop: 1 },
  favIconBtn: { position: 'relative', padding: 4 },
  favBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#161513',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  favBadgeText: { color: '#FAF8F5', fontSize: 9, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 32 },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 280,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E7E1D7',
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(22,21,19,0.5)',
    padding: 22,
    justifyContent: 'flex-end',
  },
  heroTag: { color: '#EAE2D5', fontSize: 9, fontWeight: '600', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' },
  heroTitle: { color: '#FAF8F5', fontSize: 28, fontWeight: '300', letterSpacing: 4, marginBottom: 2 },
  heroDesc: { color: '#EAE2D5', fontSize: 13, fontStyle: 'italic', marginBottom: 14, maxWidth: '90%' },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 0,
  },
  heroBtnText: { color: '#161513', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5 },
  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '500', color: '#161513', letterSpacing: 0.5 },
  seeAllText: { fontSize: 11, fontWeight: '600', color: '#9B7B54', textTransform: 'uppercase', letterSpacing: 1 },
  categoriesRow: { paddingHorizontal: 16, gap: 14 },
  categoryCard: { alignItems: 'center', width: 72 },
  categoryCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F2ECE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E7E1D7',
  },
  categoryName: { fontSize: 11, fontWeight: '500', color: '#161513', textAlign: 'center' },
  featuredRow: { paddingHorizontal: 16, gap: 14 },
  productCard: { width: 145 },
  productImageContainer: {
    width: 145,
    height: 195,
    borderRadius: 0,
    backgroundColor: '#F2ECE1',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E7E1D7',
  },
  productImage: { width: '100%', height: '100%' },
  heartWrapper: { position: 'absolute', top: 8, right: 8 },
  productTitle: { fontSize: 12, fontWeight: '400', color: '#161513' },
  productCategory: { fontSize: 9, color: '#9B7B54', marginVertical: 2, textTransform: 'uppercase', letterSpacing: 1 },
  productPrice: { fontSize: 12, fontWeight: '600', color: '#161513' },
});
