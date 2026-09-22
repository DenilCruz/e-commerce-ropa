import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { HeartButton } from '../../components/HeartButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { catalogoApi, Producto, Categoria, FiltrosProductos } from '../../services/catalogo.api';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardWidth = (width - 48) / 2;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const OPCIONES_ORDEN = [
  { id: 'novedad', label: 'Novedades' },
  { id: 'precio_asc', label: 'Menor Precio' },
  { id: 'precio_desc', label: 'Mayor Precio' },
  { id: 'popularidad', label: 'Popularidad' },
] as const;

export const CatalogScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>(route.params?.categoriaId || '');
  const [busqueda, setBusqueda] = useState<string>('');
  const [ordenSeleccionado, setOrdenSeleccionado] = useState<FiltrosProductos['ordenarPor']>('novedad');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol?.toUpperCase() === 'ADMIN';

  // Escuchar parámetros de navegación (ej: al tocar una categoría en Inicio)
  useEffect(() => {
    if (route.params?.categoriaId !== undefined) {
      setCategoriaSeleccionada(route.params.categoriaId);
    }
  }, [route.params?.categoriaId]);

  const handleEliminarProducto = (producto: Producto) => {
    Alert.alert(
      'Eliminar Prenda (Admin)',
      `¿Deseas eliminar permanentemente "${producto.nombre}" de la tienda?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await catalogoApi.eliminarProducto(producto.id);
              Alert.alert('Éxito', `"${producto.nombre}" ha sido eliminado.`);
              fetchProductos();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo eliminar el producto.');
            }
          },
        },
      ]
    );
  };

  // Cargar categorías iniciales
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await catalogoApi.obtenerCategorias();
        setCategorias(cats.filter((c) => c.activa !== false));
      } catch (err) {
        console.error('Error cargando categorías en móvil:', err);
      }
    };
    fetchCategorias();
  }, []);

  // Cargar productos con filtros
  const fetchProductos = useCallback(async () => {
    try {
      const filtros: FiltrosProductos = {
        categoriaId: categoriaSeleccionada || undefined,
        busqueda: busqueda.trim() || undefined,
        ordenarPor: ordenSeleccionado,
      };
      const prods = await catalogoApi.obtenerProductos(filtros);
      setProductos(prods);
    } catch (err) {
      console.error('Error al obtener productos:', err);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [categoriaSeleccionada, busqueda, ordenSeleccionado]);

  useEffect(() => {
    setCargando(true);
    const delayDebounceFn = setTimeout(() => {
      fetchProductos();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchProductos]);

  const onRefresh = () => {
    setRefrescando(true);
    fetchProductos();
  };

  // Filtro de seguridad en memoria para categorías y subcategorías (HU-34)
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (categoriaSeleccionada) {
        const catId = p.categoria?.id || (p as any).categoriaId;
        const padreId = (p.categoria as any)?.padre_id;
        if (catId !== categoriaSeleccionada && padreId !== categoriaSeleccionada) {
          return false;
        }
      }
      return true;
    });
  }, [productos, categoriaSeleccionada]);

  const getImageUrl = (url?: string) => {
    if (!url) return 'https://placehold.co/400x500?text=Sin+Imagen';
    if (url.startsWith('http')) return url;

    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api/v1';
    const assetsURL = baseURL.replace('/api/v1', '');

    if (url.startsWith('/uploads')) return `${assetsURL}${url}`;
    if (url.startsWith('/')) return `${assetsURL}/uploads${url}`;
    return `${assetsURL}/uploads/${url}`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Catálogo de Ropa</Text>
      <Text style={styles.subtitle}>Encuentra las mejores prendas y estilos</Text>

      {/* HU-26: Barra de Búsqueda por Nombre */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o prenda..."
          placeholderTextColor="#9ca3af"
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* HU-34: Categorías */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: '', nombre: 'Todas' }, ...categorias]}
        keyExtractor={(item) => item.id || 'todas'}
        style={styles.categoriesList}
        contentContainerStyle={styles.categoriesContainer}
        renderItem={({ item }) => {
          const isSelected = item.id === categoriaSeleccionada;
          return (
            <TouchableOpacity
              style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
              onPress={() => setCategoriaSeleccionada(item.id)}
            >
              <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                {item.nombre}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* HU-29: Selector de Ordenamiento */}
      <View style={styles.sortRow}>
        <Ionicons name="funnel-outline" size={14} color="#6b7280" />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={OPCIONES_ORDEN}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.sortContainer}
          renderItem={({ item }) => {
            const isSelected = item.id === ordenSeleccionado;
            return (
              <TouchableOpacity
                style={[styles.sortChip, isSelected && styles.sortChipSelected]}
                onPress={() => setOrdenSeleccionado(item.id)}
              >
                <Text style={[styles.sortText, isSelected && styles.sortTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );

  const renderProducto = ({ item }: { item: Producto }) => {
    const precio = Number(item.precio || 0);
    const imagenPrincipal =
      item.imagenes?.find((img) => img.esPrincipal || img.principal)?.url || item.imagenes?.[0]?.url;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        <View style={styles.imageContainer}>
          {imagenPrincipal ? (
            <Image
              source={{ uri: getImageUrl(imagenPrincipal) }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.placeholderImage} />
          )}
          {item.destacado && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DESTACADO</Text>
            </View>
          )}

          {/* HU-76: Botón flotante para guardar en favoritos */}
          <View style={styles.heartContainer}>
            <HeartButton productoId={item.id} size={18} />
          </View>

          {/* ACCIÓN ADMIN: ELIMINAR DIRECTO DE LA TIENDA */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.adminDeleteBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleEliminarProducto(item);
              }}
            >
              <Ionicons name="trash-outline" size={15} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.nombre}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.categoryLabel} numberOfLines={1}>
              {item.categoria?.nombre || 'General'}
            </Text>
            <Text style={styles.price}>${precio.toFixed(2)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}

      {cargando ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loaderText}>Buscando prendas...</Text>
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderProducto}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shirt-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptySubtitle}>
                No se encontraron productos que coincidan con los filtros seleccionados.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  categoriesList: {
    flexGrow: 0,
    marginBottom: 10,
  },
  categoriesContainer: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  categoryChipSelected: {
    backgroundColor: '#111827',
  },
  categoryText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  sortContainer: {
    gap: 6,
    paddingLeft: 4,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  sortChipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  sortText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  sortTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  gridContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heartContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  adminDeleteBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#ffffff',
    padding: 6,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  cardInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
    marginRight: 6,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6b7280',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});
