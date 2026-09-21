import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
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
  const [relacionados, setRelacionados] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<VarianteProducto | null>(null);
  const [imagenActiva, setImagenActiva] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatos = async () => {
      setCargando(true);
      try {
        const prod = await catalogoApi.obtenerProductoPorId(productId);
        setProducto(prod);

        // Seleccionar por defecto primera variante con stock
        if (prod.variantes && prod.variantes.length > 0) {
          const conStock = prod.variantes.find((v) => v.stock > 0) || prod.variantes[0];
          setVarianteSeleccionada(conStock);
        }

        const imgPrincipal =
          prod.imagenes?.find((img) => img.esPrincipal || img.principal)?.url ||
          prod.imagenes?.[0]?.url;
        setImagenActiva(imgPrincipal || null);

        // HU-28: Cargar productos relacionados
        try {
          const rels = await catalogoApi.obtenerProductosRelacionados(productId);
          setRelacionados(rels);
        } catch (errRel) {
          console.error('Error cargando relacionados:', errRel);
        }
      } catch (err) {
        console.error('Error cargando detalle de producto:', err);
      } finally {
        setCargando(false);
      }
    };
    fetchDatos();
  }, [productId]);

  const getImageUrl = (url?: string | null) => {
    if (!url) return 'https://placehold.co/600x800?text=Sin+Imagen';
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
        <Text style={styles.loaderText}>Cargando prenda...</Text>
      </View>
    );
  }

  if (!producto) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text style={styles.notFoundText}>Producto no encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver al catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const precioBase = Number(producto.precio || 0);
  const precioExtra = Number(varianteSeleccionada?.precioExtra || 0);
  const precioTotal = (precioBase + precioExtra).toFixed(2);
  const stockDisponible = varianteSeleccionada?.stock ?? 0;
  const tieneStock = stockDisponible > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* CABECERA FLOTANTE CON ATRÁS Y FAVORITOS */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleBtn}>
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <HeartButton productoId={producto.id} size={22} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* IMAGEN PRINCIPAL */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getImageUrl(imagenActiva) }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        </View>

        {/* MINIATURAS SI HAY MÁS DE UNA IMAGEN */}
        {producto.imagenes && producto.imagenes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsScroll}>
            {producto.imagenes.map((img) => {
              const esActiva = imagenActiva === img.url;
              return (
                <TouchableOpacity
                  key={img.id}
                  style={[styles.thumbnail, esActiva && styles.thumbnailSelected]}
                  onPress={() => setImagenActiva(img.url)}
                >
                  <Image source={{ uri: getImageUrl(img.url) }} style={styles.thumbnailImage} contentFit="cover" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* DETALLE Y PRECIO (HU-27) */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{producto.nombre}</Text>
            <Text style={styles.price}>${precioTotal}</Text>
          </View>

          {producto.categoria && (
            <Text style={styles.categoryLabel}>{producto.categoria.nombre}</Text>
          )}

          {/* HU-27: Color y Stock disponible */}
          {varianteSeleccionada?.color && (
            <View style={styles.colorRow}>
              <Text style={styles.colorTitle}>Color:</Text>
              <View style={styles.colorChip}>
                {varianteSeleccionada.color.hex && (
                  <View
                    style={[styles.colorDot, { backgroundColor: varianteSeleccionada.color.hex }]}
                  />
                )}
                <Text style={styles.colorName}>{varianteSeleccionada.color.nombre}</Text>
              </View>
            </View>
          )}

          {/* INDICADOR DE STOCK EN TIEMPO REAL (HU-27) */}
          <View style={styles.stockStatusContainer}>
            {!varianteSeleccionada ? (
              <Text style={styles.stockNeutral}>Selecciona una talla para verificar disponibilidad</Text>
            ) : !tieneStock ? (
              <View style={[styles.stockBadge, styles.stockBadgeOut]}>
                <Ionicons name="close-circle" size={14} color="#dc2626" />
                <Text style={styles.stockTextOut}>Agotado en esta talla</Text>
              </View>
            ) : stockDisponible <= 5 ? (
              <View style={[styles.stockBadge, styles.stockBadgeLow]}>
                <Ionicons name="warning" size={14} color="#d97706" />
                <Text style={styles.stockTextLow}>¡Últimas {stockDisponible} unidades disponibles!</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.stockBadgeIn]}>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                <Text style={styles.stockTextIn}>En stock ({stockDisponible} unidades)</Text>
              </View>
            )}
          </View>

          {/* SELECTOR DE TALLAS (HU-27) */}
          {producto.variantes && producto.variantes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seleccionar Talla</Text>
              <View style={styles.sizesContainer}>
                {producto.variantes.map((variante) => {
                  const esSeleccionada = varianteSeleccionada?.id === variante.id;
                  const sinStock = variante.stock === 0;

                  return (
                    <TouchableOpacity
                      key={variante.id}
                      disabled={sinStock}
                      style={[
                        styles.sizeBtn,
                        esSeleccionada && styles.sizeBtnSelected,
                        sinStock && styles.sizeBtnDisabled,
                      ]}
                      onPress={() => setVarianteSeleccionada(variante)}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          esSeleccionada && styles.sizeTextSelected,
                          sinStock && styles.sizeTextDisabled,
                        ]}
                      >
                        {variante.talla?.nombre || 'Única'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* DESCRIPCIÓN */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{producto.descripcion}</Text>
          </View>

          {/* HU-28: PRODUCTOS RELACIONADOS */}
          {relacionados.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>También te puede interesar</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={relacionados}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.relatedContainer}
                renderItem={({ item }) => {
                  const imgRel =
                    item.imagenes?.find((img) => img.esPrincipal || img.principal)?.url ||
                    item.imagenes?.[0]?.url;
                  return (
                    <TouchableOpacity
                      style={styles.relatedCard}
                      onPress={() => navigation.push('ProductDetail', { productId: item.id })}
                    >
                      <Image
                        source={{ uri: getImageUrl(imgRel) }}
                        style={styles.relatedImage}
                        contentFit="cover"
                      />
                      <Text style={styles.relatedName} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.relatedPrice}>${Number(item.precio).toFixed(2)}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* HU-70: RESEÑAS Y CALIFICACIONES */}
          <ResenasSection productoId={producto.id} />
        </View>
      </ScrollView>

      {/* FOOTER CON BOTÓN AÑADIR A LA CESTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addToCartBtn, (!varianteSeleccionada || !tieneStock) && styles.addToCartBtnDisabled]}
          disabled={!varianteSeleccionada || !tieneStock}
          onPress={handleAddToCart}
        >
          <Ionicons name="cart" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addToCartText}>
            {!varianteSeleccionada
              ? 'SELECCIONA TALLA'
              : !tieneStock
              ? 'AGOTADO TEMPORALMENTE'
              : 'AÑADIR A LA CESTA'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loaderText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  notFoundText: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 12 },
  backButton: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#000', borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'absolute',
    top: 40,
    width: '100%',
    zIndex: 10,
  },
  circleBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: { paddingBottom: 20 },
  imageContainer: {
    width: width,
    height: width * 1.25,
    backgroundColor: '#f3f4f6',
  },
  image: { width: '100%', height: '100%' },
  thumbnailsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thumbnail: {
    width: 60,
    height: 75,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailSelected: {
    borderColor: '#000',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: { padding: 20 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: { fontSize: 22, fontWeight: '800', color: '#111827', flex: 1, marginRight: 16 },
  price: { fontSize: 20, fontWeight: '700', color: '#000' },
  categoryLabel: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  colorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  colorTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginRight: 8 },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6, borderWidth: 1, borderColor: '#d1d5db' },
  colorName: { fontSize: 12, fontWeight: '600', color: '#1f2937' },
  stockStatusContainer: { marginBottom: 20 },
  stockNeutral: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 6,
  },
  stockBadgeIn: { backgroundColor: '#f0fdf4' },
  stockTextIn: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  stockBadgeLow: { backgroundColor: '#fffbeb' },
  stockTextLow: { fontSize: 12, fontWeight: '600', color: '#b45309' },
  stockBadgeOut: { backgroundColor: '#fef2f2' },
  stockTextOut: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sizesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  sizeBtnSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  sizeBtnDisabled: { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
  sizeText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  sizeTextSelected: { color: '#ffffff' },
  sizeTextDisabled: { color: '#d1d5db', textDecorationLine: 'line-through' },
  description: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  relatedContainer: { gap: 12, paddingVertical: 4 },
  relatedCard: { width: 120 },
  relatedImage: { width: 120, height: 150, borderRadius: 8, backgroundColor: '#f3f4f6', marginBottom: 6 },
  relatedName: { fontSize: 12, fontWeight: '600', color: '#111827' },
  relatedPrice: { fontSize: 12, fontWeight: '700', color: '#4b5563' },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  addToCartBtn: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartBtnDisabled: { backgroundColor: '#d1d5db' },
  addToCartText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
});
