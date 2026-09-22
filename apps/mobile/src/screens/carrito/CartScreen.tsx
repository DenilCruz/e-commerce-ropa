import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    cart,
    cargando,
    error,
    cupon,
    descuento,
    totalConDescuento,
    cargarCarrito,
    updateQuantity,
    removeItem,
    clearCart,
    aplicarCupon,
    removerCupon,
  } = useCartStore();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [codigoCupon, setCodigoCupon] = useState('');
  const [aplicandoCupon, setAplicandoCupon] = useState(false);
  const [mensajeCupon, setMensajeCupon] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    cargarCarrito();
  }, []);

  const getImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api/v1';
    const assetsURL = baseURL.replace('/api/v1', '');
    if (url.startsWith('/uploads')) return `${assetsURL}${url}`;
    if (url.startsWith('/')) return `${assetsURL}/uploads${url}`;
    return `${assetsURL}/uploads/${url}`;
  };

  const handleAplicarCupon = async () => {
    const code = codigoCupon.trim().toUpperCase();
    if (!code) {
      setMensajeCupon({ tipo: 'error', texto: 'Ingresa un código de cupón.' });
      return;
    }

    setAplicandoCupon(true);
    setMensajeCupon(null);

    const res = await aplicarCupon(code);
    if (res.success) {
      setMensajeCupon({ tipo: 'exito', texto: res.mensaje });
      setCodigoCupon('');
    } else {
      setMensajeCupon({ tipo: 'error', texto: res.mensaje });
    }
    setAplicandoCupon(false);
  };

  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const subtotal = cart?.total || 0;
  const totalFinal = Number(Math.max(0, totalConDescuento || subtotal).toFixed(2));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bolsa de Compras</Text>
          <Text style={styles.subtitle}>
            {totalItems} {totalItems === 1 ? 'artículo seleccionado' : 'artículos seleccionados'}
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Vaciar Carrito',
                '¿Estás seguro de que deseas eliminar todas las prendas?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Vaciar', style: 'destructive', onPress: () => clearCart() },
                ],
              );
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* ERROR BANNER */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* ESTADO VACÍO */}
      {!cargando && items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="bag-handle-outline" size={48} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtitle}>
            Explora las colecciones exclusivas de temporada y encuentra tu estilo favorito.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate('Catalog')}
          >
            <Text style={styles.exploreBtnText}>Explorar Catálogo</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        /* LISTA DE PRODUCTOS Y RESUMEN */
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* ITEMS */}
          <View style={styles.itemsList}>
            {items.map((item) => {
              const itemIdOrVar = item.id || item.varianteId;
              const imgUrl = getImageUrl(item.producto?.imagen);
              const precio = Number(item.precioUnitario || 0);
              const itemSubtotal = Number(item.subtotal || precio * item.cantidad);

              return (
                <View key={itemIdOrVar} style={styles.itemCard}>
                  {/* FOTO */}
                  <View style={styles.itemImageBox}>
                    {imgUrl ? (
                      <Image
                        source={{ uri: imgUrl }}
                        style={styles.itemImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Ionicons name="shirt-outline" size={24} color="#9ca3af" />
                      </View>
                    )}
                  </View>

                  {/* INFO */}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.producto?.nombre || 'Prenda de Vestir'}
                    </Text>

                    <View style={styles.badgesRow}>
                      {item.talla && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>Talla: {item.talla.nombre}</Text>
                        </View>
                      )}
                      {item.color && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>Color: {item.color.nombre}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.itemPrice}>
                      ${precio.toFixed(2)}{' '}
                      <Text style={styles.itemUnit}>c/u</Text>
                    </Text>

                    {/* STEPPER & DELETE */}
                    <View style={styles.itemActions}>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(itemIdOrVar, item.cantidad - 1)}
                        >
                          <Text style={styles.stepperBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperQty}>{item.cantidad}</Text>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(itemIdOrVar, item.cantidad + 1)}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.subtotalBox}>
                        <Text style={styles.subtotalText}>${itemSubtotal.toFixed(2)}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeItem(itemIdOrVar)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* SECCIÓN DE CUPONES (HU-73 & HU-74) */}
          <View style={styles.couponCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Ionicons name="pricetag-outline" size={16} color="#0f172a" />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Cupón de Descuento</Text>
            </View>

            {cupon ? (
              <View style={styles.appliedCouponBox}>
                <View style={styles.appliedCouponInfo}>
                  <View style={styles.appliedCouponHeader}>
                    <Text style={styles.appliedCouponCode}>{cupon.codigo}</Text>
                    <View style={styles.appliedCouponPill}>
                      <Text style={styles.appliedCouponPillText}>
                        {cupon.tipo === 'PORCENTAJE' ? `${cupon.valor}% OFF` : `$${cupon.valor} OFF`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.appliedCouponDesc}>
                    Descuento: - ${descuento.toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    removerCupon();
                    setMensajeCupon(null);
                  }}
                  style={styles.removeCouponBtn}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Ej. VERANO20"
                  placeholderTextColor="#9ca3af"
                  value={codigoCupon}
                  onChangeText={(text) => setCodigoCupon(text.toUpperCase())}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.applyCouponBtn, (!codigoCupon.trim() || aplicandoCupon) && styles.btnDisabled]}
                  onPress={handleAplicarCupon}
                  disabled={!codigoCupon.trim() || aplicandoCupon}
                >
                  {aplicandoCupon ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.applyCouponBtnText}>Aplicar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* MENSAJES DE CUPÓN */}
            {mensajeCupon && (
              <View
                style={[
                  styles.couponMsgBox,
                  mensajeCupon.tipo === 'exito' ? styles.couponMsgSuccess : styles.couponMsgError,
                ]}
              >
                <Ionicons
                  name={mensajeCupon.tipo === 'exito' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={mensajeCupon.tipo === 'exito' ? '#065f46' : '#991b1b'}
                />
                <Text
                  style={[
                    styles.couponMsgText,
                    mensajeCupon.tipo === 'exito' ? styles.couponMsgTextSuccess : styles.couponMsgTextError,
                  ]}
                >
                  {mensajeCupon.texto}
                </Text>
              </View>
            )}
          </View>

          {/* RESUMEN DE COMPRA (HU-41) */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Resumen del Pedido</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>

            {descuento > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.discountText]}>Descuento cupón</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>- ${descuento.toFixed(2)}</Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total a Pagar</Text>
              <Text style={styles.totalValue}>${totalFinal.toFixed(2)}</Text>
            </View>

            {/* BOTÓN CHECKOUT */}
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => {
                if (!isAuthenticated) {
                  navigation.navigate('Auth', { screen: 'Login' });
                } else {
                  navigation.navigate('Checkout');
                }
              }}
            >
              <Text style={styles.checkoutBtnText}>Proceder al Pago</Text>
              <Ionicons name="lock-closed" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  clearBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorBannerText: {
    fontSize: 12,
    color: '#991b1b',
    flex: 1,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  itemsList: {
    gap: 12,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  itemImageBox: {
    width: 80,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  itemUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748b',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepperQty: {
    width: 28,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtotalBox: {
    alignItems: 'flex-end',
  },
  subtotalText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  removeBtn: {
    padding: 6,
  },
  couponCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  applyCouponBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  applyCouponBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  appliedCouponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
  },
  appliedCouponInfo: {
    flex: 1,
  },
  appliedCouponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedCouponCode: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 14,
    color: '#065f46',
  },
  appliedCouponPill: {
    backgroundColor: '#a7f3d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  appliedCouponPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#064e3b',
  },
  appliedCouponDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    fontWeight: '600',
  },
  removeCouponBtn: {
    padding: 4,
  },
  couponMsgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  couponMsgSuccess: {
    backgroundColor: '#ecfdf5',
  },
  couponMsgError: {
    backgroundColor: '#fef2f2',
  },
  couponMsgText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  couponMsgTextSuccess: {
    color: '#065f46',
  },
  couponMsgTextError: {
    color: '#991b1b',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  discountText: {
    color: '#059669',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  checkoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
