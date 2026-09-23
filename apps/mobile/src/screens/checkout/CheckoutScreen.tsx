import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';
import { paymentsApi, OrdenRespuesta } from '../../services/payments.api';
import { api } from '../../services/api';

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { cart, cupon, descuento, totalConDescuento, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);

  // Formulario de Envío
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState(user?.celular || '');
  const [ciudad, setCiudad] = useState('Santa Cruz');
  const [notas, setNotas] = useState('');
  const [geolocalizando, setGeolocalizando] = useState(false);

  // Método de pago: 'tarjeta' | 'contra_entrega' | 'qr'
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'contra_entrega' | 'qr'>('tarjeta');
  const [nroComprobanteQr, setNroComprobanteQr] = useState('');

  // Sesión oficial de Stripe Checkout
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);
  const [verificandoStripe, setVerificandoStripe] = useState(false);

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

  // Polling automático para verificar la sesión de Stripe en cuanto el usuario pague
  useEffect(() => {
    if (!stripeSessionId || ordenCompletada) return;

    const interval = setInterval(() => {
      verificarPagoStripe(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [stripeSessionId, ordenCompletada]);

  // OBTENER UBICACIÓN GPS
  const obtenerUbicacionGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      Alert.alert('GPS no disponible', 'La geolocalización no está soportada en tu dispositivo.');
      return;
    }

    setGeolocalizando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
          );
          const data = await res.json();
          if (data && data.display_name) {
            const road = data.address?.road || data.address?.pedestrian || data.address?.suburb || '';
            const suburb = data.address?.neighbourhood || data.address?.suburb || '';
            const town = data.address?.city || data.address?.town || 'Santa Cruz';
            const textoLimpio = [road, suburb, town].filter(Boolean).join(', ');
            setDireccion(textoLimpio || data.display_name);
            if (town) setCiudad(town);
          } else {
            setDireccion(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
          }
        } catch (err) {
          setDireccion(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        } finally {
          setGeolocalizando(false);
        }
      },
      (err) => {
        setGeolocalizando(false);
        Alert.alert('Error GPS', 'No se pudo obtener la ubicación: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // HU-56 / HU-57 / HU-58: Verificar estado de sesión oficial de Stripe
  const verificarPagoStripe = async (silencioso = false) => {
    if (!stripeSessionId) return;

    if (!silencioso) setVerificandoStripe(true);
    try {
      const res = await paymentsApi.consultarEstadoSesion(stripeSessionId);
      if (res.orden && (res.paymentStatus === 'paid' || res.status === 'complete')) {
        clearCart();
        setOrdenCompletada(res.orden);
        setStripeSessionId(null);
        setStripeUrl(null);
      } else if (!silencioso) {
        Alert.alert(
          'Pago en proceso',
          'Aún no se ha registrado la confirmación del pago en Stripe. Si ya completaste los datos en la página de Stripe, aguarda unos segundos y vuelve a presionar Verificar.'
        );
      }
    } catch (err: any) {
      if (!silencioso) {
        Alert.alert(
          'Estado del pago',
          err.response?.data?.message || err.message || 'No se pudo verificar el pago con Stripe.'
        );
      }
    } finally {
      if (!silencioso) setVerificandoStripe(false);
    }
  };

  // HU-56: Abrir Pasarela Oficial de Stripe (Hosted Checkout)
  const procesarPagoStripeOficial = async () => {
    if (!direccion.trim()) {
      setErrorMsg('Ingresa la dirección completa de entrega.');
      return;
    }
    if (!telefono.trim()) {
      setErrorMsg('Ingresa un número de teléfono de contacto.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      const res = await paymentsApi.crearSesionEmbebida({
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        cuponId: cupon?.id,
        metodoEnvioId,
        tipoEnvio,
        origen: 'mobile',
      });

      setStripeSessionId(res.sessionId);
      if (res.url) {
        setStripeUrl(res.url);
        await Linking.openURL(res.url);
      } else {
        throw new Error('No se recibió la URL de pago de Stripe.');
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          'Error al conectar con la pasarela oficial de Stripe.'
      );
    } finally {
      setProcesando(false);
    }
  };

  // PROCESAR PAGO POR QR SIMPLE
  const procesarPagoQr = async () => {
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
      const orden = await paymentsApi.pagoQr({
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        nroComprobante: nroComprobanteQr.trim() || undefined,
        cuponId: cupon?.id,
        metodoEnvioId,
        tipoEnvio,
      });

      clearCart();
      setOrdenCompletada(orden);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error al procesar la transferencia QR.');
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
      if (stripeSessionId) {
        verificarPagoStripe(false);
      } else {
        procesarPagoStripeOficial();
      }
    } else if (metodoPago === 'qr') {
      procesarPagoQr();
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
              {esAprobado ? 'Pago Aprobado (Confirmado)' : 'Pago Pendiente (Contra Entrega / QR)'}
            </Text>
          </View>

          <Text style={styles.successTitle}>¡Compra Exitosa!</Text>
          <Text style={styles.successSubtitle}>
            {esAprobado
              ? 'Tu pago ha sido procesado de forma segura. Tu pedido está en camino.'
              : 'Tu pedido ha sido registrado correctamente. Te notificaremos al preparar el envío.'}
          </Text>

          {/* CARD DE DETALLE */}
          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Nro. de Orden</Text>
              <Text style={styles.receiptValueBold}>{ordenCompletada.nroOrden}</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Fecha</Text>
              <Text style={styles.receiptValue}>
                {new Date(ordenCompletada.fecha).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Método de Pago</Text>
              <Text style={styles.receiptValue}>
                {ordenCompletada.pago?.metodoPago || metodoPago.toUpperCase()}
              </Text>
            </View>

            {ordenCompletada.envio?.numeroTracking && (
              <View style={styles.receiptShippingBox}>
                <View>
                  <Text style={styles.receiptShippingLabel}>Número de Tracking</Text>
                  <Text style={styles.receiptShippingCode}>{ordenCompletada.envio.numeroTracking}</Text>
                </View>
                <TouchableOpacity
                  style={styles.receiptTrackBtn}
                  onPress={() => navigation.navigate('Tracking', { orderId: ordenCompletada.ordenId })}
                >
                  <Text style={styles.receiptTrackBtnText}>Rastrear</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divider} />
            <Text style={styles.sectionHeading}>Items comprados</Text>

            {ordenCompletada.items.map((item) => (
              <View key={item.id} style={styles.receiptItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptItemTitle}>{item.nombre}</Text>
                  <Text style={styles.receiptItemSub}>
                    Cant: {item.cantidad} • Talla: {item.talla} • Color: {item.color}
                  </Text>
                </View>
                <Text style={styles.receiptItemPrice}>${item.subtotal.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total</Text>
              <Text style={styles.receiptTotal}>${ordenCompletada.total.toFixed(2)}</Text>
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

  const getAssetsUrl = () => {
    const baseURL = api.defaults.baseURL || 'http://192.168.0.5:3000/api/v1';
    return baseURL.replace('/api/v1', '');
  };

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={20} color="#0f172a" />
              <Text style={styles.cardTitle}>1. Datos de Entrega</Text>
            </View>

            {/* BOTÓN GPS */}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={obtenerUbicacionGPS}
              disabled={geolocalizando}
            >
              {geolocalizando ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Ionicons name="navigate" size={14} color="#059669" />
              )}
              <Text style={styles.gpsBtnText}>
                {geolocalizando ? 'Buscando GPS...' : 'Mi GPS'}
              </Text>
            </TouchableOpacity>
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

        {/* SECCIÓN 2: MÉTODO DE ENVÍO */}
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
                {subtotal >= 200 ? 'GRATIS' : '$15.00'}
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
              <Text style={styles.shippingPrice}>$30.00</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECCIÓN 3: MÉTODO DE PAGO (3 OPCIONES IGUAL QUE EN LA WEB) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0f172a" />
            <Text style={styles.cardTitle}>3. Método de Pago</Text>
          </View>

          {/* SELECTOR DE 3 PESTAÑAS DE PAGO */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[styles.methodTab, metodoPago === 'tarjeta' && styles.methodTabActive]}
              onPress={() => setMetodoPago('tarjeta')}
            >
              <Ionicons
                name="card-outline"
                size={18}
                color={metodoPago === 'tarjeta' ? '#4f46e5' : '#94a3b8'}
              />
              <Text style={[styles.methodTabText, metodoPago === 'tarjeta' && styles.methodTabTextActive]}>
                Stripe
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodTab, metodoPago === 'qr' && styles.methodTabActiveQr]}
              onPress={() => setMetodoPago('qr')}
            >
              <Ionicons
                name="qr-code-outline"
                size={18}
                color={metodoPago === 'qr' ? '#7e22ce' : '#94a3b8'}
              />
              <Text style={[styles.methodTabText, metodoPago === 'qr' && styles.methodTabTextActiveQr]}>
                QR Simple
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodTab, metodoPago === 'contra_entrega' && styles.methodTabActive]}
              onPress={() => setMetodoPago('contra_entrega')}
            >
              <Ionicons
                name="cash-outline"
                size={18}
                color={metodoPago === 'contra_entrega' ? '#000' : '#94a3b8'}
              />
              <Text
                style={[
                  styles.methodTabText,
                  metodoPago === 'contra_entrega' && styles.methodTabTextActive,
                ]}
              >
                Efectivo
              </Text>
            </TouchableOpacity>
          </View>

          {/* CONTENIDO SEGÚN EL MÉTODO DE PAGO */}
          {metodoPago === 'tarjeta' ? (
            <View style={{ marginTop: 12 }}>
              {stripeSessionId ? (
                /* SESIÓN OFICIAL DE STRIPE ACTIVA */
                <View style={styles.stripeActiveCard}>
                  <View style={styles.stripeActiveHeader}>
                    <Ionicons name="time" size={26} color="#4f46e5" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.stripeActiveTitle}>Sesión de Pago Stripe Abierta</Text>
                      <Text style={styles.stripeActiveSub}>
                        Se ha abierto el formulario oficial de Stripe por ${totalFinal.toFixed(2)} USD. Ingresa tu tarjeta y confirma tu compra.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stripeActiveButtonsRow}>
                    <TouchableOpacity
                      style={styles.stripeReopenBtn}
                      onPress={() => stripeUrl && Linking.openURL(stripeUrl)}
                    >
                      <Ionicons name="open-outline" size={16} color="#4f46e5" style={{ marginRight: 6 }} />
                      <Text style={styles.stripeReopenText}>Reabrir Stripe</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.stripeVerifyBtn}
                      onPress={() => verificarPagoStripe(false)}
                      disabled={verificandoStripe}
                    >
                      {verificandoStripe ? (
                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                      ) : (
                        <Ionicons name="checkmark-done" size={16} color="#fff" style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.stripeVerifyText}>
                        {verificandoStripe ? 'Verificando...' : 'Verificar Pago'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.stripeAutoCheckNote}>
                    🔄 Verificando confirmación de Stripe automáticamente cada 3 segundos...
                  </Text>
                </View>
              ) : (
                /* INVITACIÓN A PASARELA OFICIAL STRIPE */
                <View style={styles.stripePromoCard}>
                  <View style={styles.stripePromoHeader}>
                    <Ionicons name="shield-checkmark" size={28} color="#4f46e5" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.stripePromoTitle}>Pasarela Oficial Stripe</Text>
                      <Text style={styles.stripePromoSubtitle}>
                        Checkout oficial con certificación PCI-DSS Nivel 1.
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.stripePromoDesc}>
                    Al continuar, se abrirá el formulario oficial y seguro de Stripe con soporte para tarjetas de crédito y débito, encriptación bancaria y validación inmediata.
                  </Text>

                  <View style={styles.cardBrandsRow}>
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandBadgeText}>VISA</Text>
                    </View>
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandBadgeText}>MASTERCARD</Text>
                    </View>
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandBadgeText}>AMEX</Text>
                    </View>
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandBadgeText}>GOOGLE PAY</Text>
                    </View>
                  </View>

                  <View style={styles.stripeSecurityRow}>
                    <Ionicons name="lock-closed" size={14} color="#059669" />
                    <Text style={styles.stripeSecurityText}>
                      Tus datos viajan directamente a los servidores de Stripe de forma cifrada (SSL 256-bit).
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : metodoPago === 'qr' ? (
            /* OPCIÓN QR SIMPLE / TRANSFERENCIA */
            <View style={styles.qrBoxContainer}>
              <Text style={styles.qrBoxTitle}>Transferencia Bancaria QR Simple</Text>
              <Text style={styles.qrBoxSub}>
                Escanea el código QR con tu banca móvil (Banco Unión, BNB, BCP, Mercantil Santa Cruz, etc.)
              </Text>

              <View style={styles.qrImageWrapper}>
                <Image
                  source={{ uri: `${getAssetsUrl()}/uploads/qr_pago_aura.png` }}
                  style={styles.qrImage}
                  contentFit="contain"
                />
              </View>

              <Text style={styles.qrMontoText}>
                Monto a transferir: <Text style={styles.qrMontoBold}>${totalFinal.toFixed(2)} USD</Text>
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nro. de Comprobante / Referencia (Opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 98451203"
                  value={nroComprobanteQr}
                  onChangeText={setNroComprobanteQr}
                />
              </View>
            </View>
          ) : (
            /* OPCIÓN CONTRA ENTREGA */
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
            <Text style={styles.summaryVal}>${subtotal.toFixed(2)}</Text>
          </View>
          {descuento > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#059669' }]}>Descuento cupón</Text>
              <Text style={[styles.summaryVal, { color: '#059669' }]}>- ${descuento.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Envío</Text>
            <Text style={styles.summaryVal}>{costoEnvio === 0 ? 'Gratis' : `$${costoEnvio.toFixed(2)}`}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 6 }]}>
            <Text style={styles.summaryTotalLabel}>Total a Pagar</Text>
            <Text style={styles.summaryTotalVal}>${totalFinal.toFixed(2)}</Text>
          </View>
        </View>

        {/* BOTÓN FINAL */}
        <TouchableOpacity
          style={[styles.payBtn, (procesando || verificandoStripe) && { opacity: 0.7 }]}
          disabled={procesando || verificandoStripe}
          onPress={handleProcesar}
        >
          {procesando || verificandoStripe ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.payBtnText}>
                {metodoPago === 'tarjeta'
                  ? stripeSessionId
                    ? 'Verificar Estado de Pago Stripe'
                    : `Pagar con Formulario Oficial Stripe ($${totalFinal.toFixed(2)})`
                  : metodoPago === 'qr'
                  ? `Confirmar Pago QR ($${totalFinal.toFixed(2)})`
                  : `Confirmar Pedido ($${totalFinal.toFixed(2)})`}
              </Text>
              <Ionicons
                name={metodoPago === 'tarjeta' && !stripeSessionId ? 'open-outline' : 'lock-closed'}
                size={18}
                color="#fff"
              />
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
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gpsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
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
  methodSelector: { flexDirection: 'row', gap: 8, marginTop: 4 },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  methodTabActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  methodTabActiveQr: { borderColor: '#7e22ce', backgroundColor: '#faf5ff' },
  methodTabText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  methodTabTextActive: { color: '#4f46e5' },
  methodTabTextActiveQr: { color: '#7e22ce' },
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
  qrBoxContainer: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#f3e8ff',
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
    gap: 10,
    alignItems: 'center',
  },
  qrBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6b21a8',
  },
  qrBoxSub: {
    fontSize: 11,
    color: '#7e22ce',
    textAlign: 'center',
    lineHeight: 16,
  },
  qrImageWrapper: {
    width: 180,
    height: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrMontoText: {
    fontSize: 12,
    color: '#581c87',
  },
  qrMontoBold: {
    fontSize: 15,
    fontWeight: '900',
    color: '#6b21a8',
  },
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
  // ESTILOS PASARELA OFICIAL STRIPE
  stripePromoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  stripePromoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stripePromoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e1b4b',
  },
  stripePromoSubtitle: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 2,
  },
  stripePromoDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardBrandsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  brandBadge: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  stripeSecurityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
  },
  stripeSecurityText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '500',
    flex: 1,
  },
  stripeActiveCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  stripeActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stripeActiveTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#312e81',
  },
  stripeActiveSub: {
    fontSize: 11,
    color: '#4338ca',
    marginTop: 2,
    lineHeight: 16,
  },
  stripeActiveButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  stripeReopenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#6366f1',
    paddingVertical: 10,
    borderRadius: 10,
  },
  stripeReopenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  stripeVerifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
  },
  stripeVerifyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  stripeAutoCheckNote: {
    fontSize: 11,
    color: '#6366f1',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});
