import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { catalogoApi, Producto, VarianteProducto } from '../../services/catalogo.api';
import { useCartStore } from '../../store/cart.store';
import { HeartButton } from '../../components/HeartButton';
import { ResenasSection } from '../resenas/ResenasSection';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

export const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { productId } = route.params;

  const { addItem } = useCartStore();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<VarianteProducto | null>(null);

  useEffect(() => {
    const fetchProd = async () => {
      try {
        const prod = await catalogoApi.obtenerProductoPorId(productId);
        setProducto(prod);
        if (prod.variantes.length > 0) {
          setVarianteSeleccionada(prod.variantes[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    fetchProd();
  }, [productId]);

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api/v1';
    const assetsURL = baseURL.replace('/api/v1', '');
    if (url.startsWith('/uploads')) return `${assetsURL}${url}`;
    if (url.startsWith('/')) return `${assetsURL}/uploads${url}`;
    return `${assetsURL}/uploads/${url}`;
  };

  const handleAddToCart = () => {
    if (varianteSeleccionada) {
      addItem(varianteSeleccionada.id, 1);
      navigation.navigate('Main', { screen: 'Cart' });
    }
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!producto) {
    return (
      <View style={styles.center}>
        <Text>Producto no encontrado.</Text>
      </View>
    );
  }

  const imagenes = producto.imagenes || [];
  const variantes = producto.variantes || [];
  const imgPrincipal = imagenes.find(img => img.principal)?.url || imagenes[0]?.url;
  const precioBase = Number(producto.precio || 0);
  const precioExtra = Number(varianteSeleccionada?.precioExtra || 0);
  const precioFinal = precioBase + precioExtra;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <HeartButton productoId={producto.id} size={24} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IMAGEN */}
        <View style={styles.imageContainer}>
          {imgPrincipal ? (
            <Image 
              source={{ uri: getImageUrl(imgPrincipal) }} 
              style={styles.image} 
              contentFit="cover" 
            />
          ) : (
            <View style={styles.placeholderImage} />
          )}
        </View>

        {/* INFO */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{producto.nombre}</Text>
            <Text style={styles.price}>
              Bs. {precioFinal.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.categoryLabel}>{producto.categoria?.nombre || 'General'}</Text>
          
          <Text style={styles.sectionTitle}>Talla</Text>
          <View style={styles.sizesContainer}>
            {variantes.map(variante => (
              <TouchableOpacity
                key={variante.id}
                style={[
                  styles.sizeBtn,
                  varianteSeleccionada?.id === variante.id && styles.sizeBtnSelected,
                  variante.stock === 0 && styles.sizeBtnDisabled
                ]}
                onPress={() => setVarianteSeleccionada(variante)}
                disabled={variante.stock === 0}
              >
                <Text style={[
                  styles.sizeText,
                  varianteSeleccionada?.id === variante.id && styles.sizeTextSelected,
                  variante.stock === 0 && styles.sizeTextDisabled
                ]}>
                  {variante.talla?.nombre || 'Única'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{producto.descripcion}</Text>
          
          {/* Espacio para la vista de Reseñas */}
          <ResenasSection productoId={producto.id} />

        </View>
      </ScrollView>

      {/* BOTON AÑADIR A LA CESTA */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.addToCartBtn, (!varianteSeleccionada || varianteSeleccionada.stock === 0) && styles.addToCartBtnDisabled]}
          disabled={!varianteSeleccionada || varianteSeleccionada.stock === 0}
          onPress={handleAddToCart}
        >
          <Text style={styles.addToCartText}>
            {!varianteSeleccionada ? 'SELECCIONA TALLA' : varianteSeleccionada.stock === 0 ? 'AGOTADO' : 'AÑADIR A LA CESTA'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    position: 'absolute',
    top: 40,
    width: '100%',
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 50,
  },
  imageContainer: {
    width: width,
    height: width * 1.3,
    backgroundColor: '#f3f4f6',
  },
  image: { width: '100%', height: '100%' },
  placeholderImage: { flex: 1 },
  infoContainer: { padding: 24 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: { fontSize: 24, fontWeight: '800', color: '#111827', flex: 1, marginRight: 16 },
  price: { fontSize: 20, fontWeight: '700', color: '#000' },
  categoryLabel: { fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sizesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  sizeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  sizeBtnSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  sizeBtnDisabled: { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
  sizeText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  sizeTextSelected: { color: '#ffffff' },
  sizeTextDisabled: { color: '#d1d5db' },
  description: { fontSize: 15, color: '#4b5563', lineHeight: 24, marginBottom: 32 },
  reviewsPlaceholder: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  reviewsText: { fontSize: 14, color: '#6b7280' },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  addToCartBtn: {
    backgroundColor: '#111827',
    paddingVertical: 18,
    borderRadius: 4,
    alignItems: 'center',
  },
  addToCartBtnDisabled: { backgroundColor: '#e5e7eb' },
  addToCartText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});
