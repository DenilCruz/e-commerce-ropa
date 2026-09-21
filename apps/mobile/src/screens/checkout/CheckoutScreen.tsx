import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';
import { paymentsApi, OrdenRespuesta } from '../../services/payments.api';

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { cart, cupon, descuento, totalConDescuento, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);

  // Formulario de Envío
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState(user?.celular || '');
  const [ciudad, setCiudad] = useState('Santa Cruz');
  const [notas, setNotas] = useState('');

  // Método de pago: 'tarjeta' | 'contra_entrega'
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'contra_entrega'>('tarjeta');

  // Datos de tarjeta
  const [nombreTitular, setNombreTitular] = useState(user?.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : '');
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [expiracion, setExpiracion] = useState('');
  const [cvc, setCvc] = useState('');

  // Estados
  const [tipoEnvio, setTipoEnvio] = useState<'ESTANDAR' | 'EXPRESS'>('ESTANDAR');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ordenCompletada, setOrdenCompletada] = useState<OrdenRespuesta | null>(null);

  const subtotal = cart?.total || 0;
  const esExpress = tipoEnvio === 'EXPRESS';
  const costoEnvio = esExpress ? 30 : (subtotal >= 200 || subtotal === 0 ? 0 : 15);
  const totalFinal = Number(Math.max(0, (totalConDescuento || subtotal) + costoEnvio).toFixed(2));
  const metodoEnvioId = esExpress
    ? 'e2000000-0000-0000-0000-000000000002'
    : 'e1000000-0000-0000-0000-000000000001';

  const formatCardNumber = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setNumeroTarjeta(formatted);
  };

  const formatExp = (text: string) => {
    let raw = text.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiracion(raw);
  };

  // HU-56 / HU-58: Procesar Pago con Tarjeta
  const procesarPagoTarjeta = async () => {
    if (!direccion.trim()) {
      setErrorMsg('Ingresa la dirección completa de entrega.');
      return;
    }
    if (!telefono.trim()) {
      setErrorMsg('Ingresa un número de teléfono de contacto.');
      return;
    }
    const cleanCard = numeroTarjeta.replace(/\s/g, '');
    if (cleanCard.length < 15) {
      setErrorMsg('Ingresa un número de tarjeta válido (16 dígitos).');
      return;
    }
    if (expiracion.length < 5) {
      setErrorMsg('Ingresa el vencimiento (MM/AA).');
      return;
    }
    if (cvc.length < 3) {
      setErrorMsg('Ingresa el código CVC de seguridad.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      // 1. Crear PaymentIntent en backend
      const intentData = await paymentsApi.crearIntento({
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        cuponId: cupon?.id,
        metodoEnvioId,
        tipoEnvio,
      });

      // 2. Tokenizar y confirmar con Stripe o backend
      // En modo test de Stripe se confirma el PaymentIntent con el método de prueba
      const orden = await paymentsApi.confirmarTarjeta({
        paymentIntentId: intentData.paymentIntentId,
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        cuponId: cupon?.id,
        metodoEnvioId,
        tipoEnvio,
      });

      clearCart();
      setOrdenCompletada(orden);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error al procesar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  // HU-60: Procesar Pago Contra Entrega
  const procesarPagoContraEntrega = async () => {
    if (!direccion.trim()) {
      setErrorMsg('Ingresa la dirección de entrega.');
      return;
    }
    if (!telefono.trim()) {
      setErrorMsg('Ingresa un teléfono de contacto.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      const orden = await paymentsApi.pagoContraEntrega({
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        cuponId: cupon?.id,
        metodoEnvioId,
        tipoEnvio,
      });

      clearCart();
      setOrdenCompletada(orden);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error al registrar pedido contra entrega.');
    } finally {
      setProcesando(false);
    }
  };

  const handleProcesar = () => {
    if (metodoPago === 'tarjeta') {
      procesarPagoTarjeta();
    } else {
      procesarPagoContraEntrega();
    }
  };

  // =========================================================================
  // VISTA: COMPROBANTE Y ESTADO DEL PAGO (HU-57)
  // =========================================================================
  if (ordenCompletada) {
    const esAprobado = ordenCompletada.pago?.estado === 'APROBADO';

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={[styles.successIconBox, esAprobado ? styles.iconAprobado : styles.iconPendiente]}>
            <Ionicons
              name={esAprobado ? 'checkmark-circle' : 'time'}
              size={54}
              color={esAprobado ? '#059669' : '#d97706'}
            />
          </View>

          <View style={[styles.badgeContainer, esAprobado ? styles.badgeAprobado : styles.badgePendiente]}>
            <Text style={[styles.badgeText, esAprobado ? styles.badgeTextAprobado : styles.badgeTextPendiente]}>
              {esAprobado ? 'Pago Aprobado (Stripe)' : 'Pago Pendiente (Contra Entrega)'}
            </Text>
          </View>

          <Text style={styles.successTitle}>¡Compra Exitosa!</Text>
          <Text style={styles.successSubtitle}>
            {esAprobado
              ? 'Tu pago ha sido procesado de forma segura. Tu pedido está en camino.'
              : 'Tu pedido ha sido confirmado. Pagarás en efectivo al momento de recibirlo.'}
          </Text>

          {/* CARD DE DETALLE */}
          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Nro. de Orden</Text>
              <Text style={styles.receiptValueBold}>{ordenCompletada.nroOrden}</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Método de Pago</Text>
              <Text style={styles.receiptValue}>{ordenCompletada.pago?.metodoPago || 'Tarjeta'}</Text>
            </View>

            {ordenCompletada.pago?.idTransaccion && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Referencia</Text>
                <Text style={[styles.receiptValue, { fontSize: 11, color: '#6366f1' }]}>
                  {ordenCompletada.pago.idTransaccion}
                </Text>
              </View>
            )}

            {ordenCompletada.envio && (
              <View style={styles.receiptShippingBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptShippingLabel}>Guía de Seguimiento (HU-64)</Text>
                  <Text style={styles.receiptShippingCode}>{ordenCompletada.envio.numeroTracking}</Text>
                </View>
                <TouchableOpacity
                  style={styles.receiptTrackBtn}
                  onPress={() =>
                    navigation.navigate('Tracking', {
                      codigo: ordenCompletada.envio?.numeroTracking,
                    })
                  }
                >
                  <Text style={styles.receiptTrackBtnText}>Rastrear</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionHeading}>Prendas Pedidas ({ordenCompletada.items?.length || 0})</Text>
            {ordenCompletada.items?.map((it) => (
              <View key={it.id} style={styles.receiptItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptItemTitle}>{it.nombre}</Text>
                  <Text style={styles.receiptItemSub}>
                    {it.talla} / {it.color} · Cant: {it.cantidad}
                  </Text>
                </View>
                <Text style={styles.receiptItemPrice}>Bs. {it.subtotal.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total</Text>
              <Text style={styles.receiptTotal}>Bs. {ordenCompletada.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* BOTONES */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              navigation.navigate('Main', { screen: 'Orders' });
            }}
          >
            <Text style={styles.primaryBtnText}>Ver Mis Pedidos</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              navigation.navigate('Main', { screen: 'Catalog' });
            }}
          >
            <Text style={styles.secondaryBtnText}>Volver a la Tienda</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout y Pago Seguro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ERROR */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#b91c1c" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* SECCIÓN 1: DATOS DE ENVÍO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color="#0f172a" />
            <Text style={styles.cardTitle}>1. Datos de Entrega</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dirección Completa *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Av. San Martín #450, Depto 3B"
              value={direccion}
              onChangeText={setDireccion}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Ciudad *</Text>
              <TextInput style={styles.input} value={ciudad} onChangeText={setCiudad} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Teléfono *</Text>
              <TextInput
                style={styles.input}
                placeholder="77712345"
                keyboardType="phone-pad"
                value={telefono}
                onChangeText={setTelefono}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notas para el repartidor (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Dejar en portería"
              value={notas}
              onChangeText={setNotas}
            />
          </View>
        </View>

        {/* SECCIÓN 2: MÉTODO DE ENVÍO (HU-62 & HU-63) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="car-outline" size={20} color="#0f172a" />
            <Text style={styles.cardTitle}>2. Método de Envío</Text>
          </View>

          <View style={{ gap: 8, marginTop: 4 }}>
            {/* Opción Estándar */}
            <TouchableOpacity
              style={[
                styles.shippingOption,
                tipoEnvio === 'ESTANDAR' && styles.shippingOptionActive,
              ]}
              onPress={() => setTipoEnvio('ESTANDAR')}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.shippingTitle}>Envío Estándar Nacional</Text>
                <Text style={styles.shippingDesc}>2 a 3 días hábiles a domicilio</Text>
              </View>
              <Text style={styles.shippingPrice}>
                {subtotal >= 200 ? 'GRATIS' : 'Bs. 15.00'}
              </Text>
            </TouchableOpacity>

            {/* Opción Express */}
            <TouchableOpacity
              style={[
                styles.shippingOption,
                tipoEnvio === 'EXPRESS' && styles.shippingOptionActive,
              ]}
              onPress={() => setTipoEnvio('EXPRESS')}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.shippingTitle}>Envío Express 24h</Text>
                  <View style={styles.fastBadge}>
                    <Text style={styles.fastBadgeText}>Rápido</Text>
                  </View>
                </View>
                <Text style={styles.shippingDesc}>Entrega prioritaria en 24 horas</Text>
              </View>
              <Text style={styles.shippingPrice}>Bs. 30.00</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECCIÓN 3: MÉTODO DE PAGO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0f172a" />
            <Text style={styles.cardTitle}>3. Método de Pago</Text>
          </View>

          {/* SELECTOR */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[styles.methodTab, metodoPago === 'tarjeta' && styles.methodTabActive]}
              onPress={() => setMetodoPago('tarjeta')}
            >
              <Ionicons
                name="card-outline"
                size={20}
                color={metodoPago === 'tarjeta' ? '#000' : '#94a3b8'}
              />
              <Text style={[styles.methodTabText, metodoPago === 'tarjeta' && styles.methodTabTextActive]}>
                Tarjeta (Stripe)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodTab, metodoPago === 'contra_entrega' && styles.methodTabActive]}
              onPress={() => setMetodoPago('contra_entrega')}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={metodoPago === 'contra_entrega' ? '#000' : '#94a3b8'}
              />
              <Text
                style={[
                  styles.methodTabText,
                  metodoPago === 'contra_entrega' && styles.methodTabTextActive,
                ]}
              >
                Contra Entrega
              </Text>
            </TouchableOpacity>
          </View>

          {metodoPago === 'tarjeta' ? (
            <View style={{ marginTop: 12 }}>
              {/* TARJETA VISUAL */}
              <View style={styles.creditCardVisual}>
                <View style={styles.cardVisualTop}>
                  <View style={styles.cardChip} />
                  <Text style={styles.cardBrand}>STRIPE SECURE</Text>
                </View>
                <Text style={styles.cardNumberText}>
                  {numeroTarjeta || '•••• •••• •••• ••••'}
                </Text>
                <View style={styles.cardVisualBottom}>
                  <Text style={styles.cardHolderText}>{nombreTitular || 'NOMBRE TITULAR'}</Text>
                  <Text style={styles.cardExpText}>{expiracion || 'MM/AA'}</Text>
                </View>
              </View>

              {/* INPUTS DE TARJETA */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre en la Tarjeta *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="JUAN PEREZ"
                  autoCapitalize="characters"
                  value={nombreTitular}
                  onChangeText={setNombreTitular}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Número de Tarjeta (Stripe Test: 4242 4242...) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4242 4242 4242 4242"
                  keyboardType="number-pad"
                  value={numeroTarjeta}
                  onChangeText={formatCardNumber}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Vencimiento *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="12/28"
                    keyboardType="number-pad"
                    value={expiracion}
                    onChangeText={formatExp}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>CVC *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    value={cvc}
                    onChangeText={setCvc}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.codBox}>
              <Ionicons name="cube-outline" size={24} color="#b45309" />
              <Text style={styles.codText}>
                Pagarás en efectivo al momento de la entrega de tus prendas en tu domicilio.
              </Text>
            </View>
          )}
        </View>

        {/* RESUMEN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen del Pedido</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>Bs. {subtotal.toFixed(2)}</Text>
          </View>
          {descuento > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#059669' }]}>Descuento cupón</Text>
              <Text style={[styles.summaryVal, { color: '#059669' }]}>- Bs. {descuento.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Envío</Text>
            <Text style={styles.summaryVal}>{costoEnvio === 0 ? 'Gratis' : `Bs. ${costoEnvio.toFixed(2)}`}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 6 }]}>
            <Text style={styles.summaryTotalLabel}>Total a Pagar</Text>
            <Text style={styles.summaryTotalVal}>Bs. {totalFinal.toFixed(2)}</Text>
          </View>
        </View>

        {/* BOTÓN FINAL */}
        <TouchableOpacity
          style={[styles.payBtn, procesando && { opacity: 0.7 }]}
          disabled={procesando}
          onPress={handleProcesar}
        >
          {procesando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.payBtnText}>
                {metodoPago === 'tarjeta'
                  ? `Pagar Bs. ${totalFinal.toFixed(2)} con Stripe`
                  : `Confirmar Pedido (Bs. ${totalFinal.toFixed(2)})`}
              </Text>
              <Ionicons name="lock-closed" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  scrollContent: { padding: 16, gap: 16 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 12,
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600', flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  inputGroup: { gap: 6 },
  inputRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  methodSelector: { flexDirection: 'row', gap: 10, marginTop: 4 },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  methodTabActive: { borderColor: '#000', backgroundColor: '#fff' },
  methodTabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  methodTabTextActive: { color: '#000' },
  creditCardVisual: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  cardVisualTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardChip: { width: 34, height: 24, backgroundColor: '#fbbf24', borderRadius: 4 },
  cardBrand: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  cardNumberText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  cardVisualBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardHolderText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cardExpText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
  codBox: {
    backgroundColor: '#fef3c7',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  codText: { fontSize: 12, color: '#92400e', fontWeight: '600', flex: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: '#64748b' },
  summaryVal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  summaryTotalLabel: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  summaryTotalVal: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  payBtn: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // SUCCESS SCREEN STYLES
  successScroll: { padding: 24, alignItems: 'center' },
  successIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  iconAprobado: { backgroundColor: '#ecfdf5' },
  iconPendiente: { backgroundColor: '#fef3c7' },
  badgeContainer: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  badgeAprobado: { backgroundColor: '#d1fae5' },
  badgePendiente: { backgroundColor: '#fde68a' },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  badgeTextAprobado: { color: '#065f46' },
  badgeTextPendiente: { color: '#92400e' },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
  successSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    marginBottom: 20,
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  receiptValue: { fontSize: 13, color: '#0f172a', fontWeight: '700' },
  receiptValueBold: { fontSize: 15, color: '#0f172a', fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  sectionHeading: { fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  receiptItemTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  receiptItemSub: { fontSize: 11, color: '#64748b' },
  receiptItemPrice: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  receiptTotal: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  primaryBtn: {
    backgroundColor: '#000',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  shippingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  shippingOptionActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  shippingTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  shippingDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
  shippingPrice: { fontSize: 13, fontWeight: '800', color: '#4f46e5' },
  fastBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fastBadgeText: {
    color: '#92400e',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  receiptShippingBox: {
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  receiptShippingLabel: {
    fontSize: 10,
    color: '#6366f1',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  receiptShippingCode: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e1b4b',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  receiptTrackBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  receiptTrackBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
