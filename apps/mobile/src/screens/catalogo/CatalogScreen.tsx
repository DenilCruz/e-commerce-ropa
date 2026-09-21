import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { HeartButton } from '../../components/HeartButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { catalogoApi, Producto, Categoria } from '../../services/catalogo.api';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardWidth = (width - 60) / 2; // 20 padding left, 20 padding right, 20 gap

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export const CatalogScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await catalogoApi.obtenerCategorias();
        setCategorias(cats);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategorias();
  }, []);

  useEffect(() => {
    const fetchProductos = async () => {
      setCargando(true);
      try {
        const prods = await catalogoApi.obtenerProductos(categoriaSeleccionada || undefined);
        setProductos(prods);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    fetchProductos();
  }, [categoriaSeleccionada]);

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    
    // Extraer base URL
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api/v1';
    const assetsURL = baseURL.replace('/api/v1', '');
    
    if (url.startsWith('/uploads')) return `${assetsURL}${url}`;
    if (url.startsWith('/')) return `${assetsURL}/uploads${url}`;
    return `${assetsURL}/uploads/${url}`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Catálogo de Ropa</Text>
      <Text style={styles.subtitle}>Explora nuestra colección y encuentra tu estilo.</Text>
      
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: '', nombre: 'Todas', slug: 'todas' }, ...categorias]}
        keyExtractor={item => item.id || 'todas'}
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
    </View>
  );

  const renderProducto = ({ item }: { item: Producto }) => {
    const precio = Number(item.precio || 0);
    const imagenes = item.imagenes || [];
    const imgPrincipal = imagenes.find(img => img.principal)?.url || imagenes[0]?.url;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        <View style={styles.imageContainer}>
          {imgPrincipal ? (
            <Image 
              source={{ uri: getImageUrl(imgPrincipal) }} 
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
          <View style={styles.heartContainer}>
            <HeartButton productoId={item.id} size={20} />
          </View>
        </View>
        <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.categoryLabel}>{item.categoria?.nombre || 'General'}</Text>
          <Text style={styles.price}>Bs. {precio.toFixed(2)}</Text>
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
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={item => item.id}
          renderItem={renderProducto}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron productos.</Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 20,
  },
  categoriesList: {
    flexGrow: 0,
  },
  categoriesContainer: {
    paddingRight: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  categoryChipSelected: {
    backgroundColor: '#000',
  },
  categoryText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    padding: 20,
    paddingTop: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: cardWidth,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heartContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  productName: {
    fontSize: 14,
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
    fontSize: 12,
    color: '#9ca3af',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 40,
  }
});
