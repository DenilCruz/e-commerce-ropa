import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { useFavoritosStore } from '../../store/favoritos.store';
import { catalogoApi, Producto } from '../../services/catalogo.api';
import { api } from '../../services/api';
import { HeartButton } from '../../components/HeartButton';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2;

export const FavoritosScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favoritosIds } = useFavoritosStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const fetchFavoritos = async () => {
      if (favoritosIds.length === 0) {
        setProductos([]);
        return;
      }
      setCargando(true);
      try {
        const allProds = await catalogoApi.obtenerProductos();
        const favs = allProds.filter(p => favoritosIds.includes(p.id));
        setProductos(favs);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    fetchFavoritos();
  }, [favoritosIds]);

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api/v1';
    const assetsURL = baseURL.replace('/api/v1', '');
    if (url.startsWith('/uploads')) return `${assetsURL}${url}`;
    if (url.startsWith('/')) return `${assetsURL}/uploads${url}`;
    return `${assetsURL}/uploads/${url}`;
  };

  const renderProducto = ({ item }: { item: Producto }) => {
    const precioMinimo = Math.min(...item.variantes.map(v => Number(v.precio)));
    const imgPrincipal = item.imagenes.find(img => img.principal)?.url || item.imagenes[0]?.url;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        <View style={styles.imageContainer}>
          {imgPrincipal ? (
            <Image source={{ uri: getImageUrl(imgPrincipal) }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.placeholderImage} />
          )}
          <View style={styles.heartContainer}>
            <HeartButton productoId={item.id} size={20} />
          </View>
        </View>
        <Text style={styles.productName} numberOfLines={1}>{item.nombre}</Text>
        <Text style={styles.price}>${precioMinimo.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Favoritos</Text>
        <View style={{ width: 24 }} />
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : productos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-dislike-outline" size={64} color="#e5e7eb" />
          <Text style={styles.emptyText}>No tienes artículos guardados.</Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={item => item.id}
          renderItem={renderProducto}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, color: '#6b7280', fontSize: 14 },
  gridContainer: { padding: 20 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 20 },
  card: { width: cardWidth },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  image: { width: '100%', height: '100%' },
  placeholderImage: { flex: 1, backgroundColor: '#e5e7eb' },
  heartContainer: { position: 'absolute', top: 8, right: 8 },
  productName: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 2 },
  price: { fontSize: 13, fontWeight: 'bold', color: '#000' },
});
