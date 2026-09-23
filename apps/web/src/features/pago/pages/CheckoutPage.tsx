import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Truck,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShoppingBag,
  MapPin,
  ChevronRight,
  Printer,
  RotateCcw,
  Loader2,
  Navigation,
  X,
  QrCode,
} from 'lucide-react';
import { useCartStore } from '../../../store/cart.store';
import { useAuthStore } from '../../../store/auth.store';
import { paymentsApi } from '../services/payments.api';
import { OrdenRespuesta } from '../types';
import { getImageUrl } from '../../../lib/utils';

declare global {
  interface Window {
    Stripe?: any;
    L?: any;
  }
}

const STRIPE_PUBLIC_KEY =
  (import.meta as any).env?.VITE_STRIPE_PUBLIC_KEY ||
  'pk_test_51UHsanC3rRVxMYcMuVMARIsjpwRZHWjLoKv57X7WIu9Lk9Ic101Cz5uPrZo16gYrMOA9NrCkmJ0RBPXEiuAADGTt003eAaVPVh';

export const CheckoutPage: React.FC = () => {
  const { cart, cupon, descuento, totalConDescuento, cargarCarrito, clearCart } = useCartStore();
  const { user } = useAuthStore();

  // Estados del formulario de envío
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('Santa Cruz');
  const [telefono, setTelefono] = useState(user?.celular || '');
  const [notas, setNotas] = useState('');

  // Selector interactivo de mapa (Leaflet / OpenStreetMap / GPS)
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null);
  const [modalMapaAbierto, setModalMapaAbierto] = useState(false);
  const [tempCoordenadas, setTempCoordenadas] = useState<{ lat: number; lng: number }>({
    lat: -17.7833,
    lng: -63.1821,
  });
  const [direccionGeocodificada, setDireccionGeocodificada] = useState('');
  const [cargandoGeocodificacion, setCargandoGeocodificacion] = useState(false);
  const [geolocalizando, setGeolocalizando] = useState(false);

  const mapModalRef = useRef<HTMLDivElement>(null);
  const mapModalInstanceRef = useRef<any>(null);
  const mapModalMarkerRef = useRef<any>(null);

  // Método de envío: 'ESTANDAR' | 'EXPRESS' (HU-62 & HU-63)
  const [tipoEnvio, setTipoEnvio] = useState<'ESTANDAR' | 'EXPRESS'>('ESTANDAR');

  // Método de pago: 'tarjeta' | 'contra_entrega' | 'qr'
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'contra_entrega' | 'qr'>('tarjeta');
  const [nroComprobanteQr, setNroComprobanteQr] = useState('');

  // Estado de Stripe Embedded Checkout
  const [embeddedSessionId, setEmbeddedSessionId] = useState<string | null>(null);
  const [cargandoEmbedded, setCargandoEmbedded] = useState(false);
  const checkoutInstanceRef = useRef<any>(null);

  // Estados de proceso
  const [procesando, setProcesando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [ordenCompletada, setOrdenCompletada] = useState<OrdenRespuesta | null>(null);

  useEffect(() => {
    cargarCarrito();
    return () => {
      if (checkoutInstanceRef.current) {
        checkoutInstanceRef.current.destroy();
        checkoutInstanceRef.current = null;
      }
    };
  }, []);

  // Inicializar o actualizar mapa interactivo del modal
  useEffect(() => {
    if (!modalMapaAbierto) return;

    const timer = setTimeout(() => {
      if (!mapModalRef.current) return;
      const L = window.L;
      if (!L) return;

      if (mapModalInstanceRef.current) {
        mapModalInstanceRef.current.remove();
        mapModalInstanceRef.current = null;
      }

      const initialLat = coordenadas?.lat || tempCoordenadas.lat;
      const initialLng = coordenadas?.lng || tempCoordenadas.lng;

      const map = L.map(mapModalRef.current).setView([initialLat, initialLng], 14);
      mapModalInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      mapModalMarkerRef.current = marker;

      const actualizarPunto = async (newLat: number, newLng: number) => {
        setTempCoordenadas({ lat: newLat, lng: newLng });
        marker.setLatLng([newLat, newLng]);

        setCargandoGeocodificacion(true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
          );
          const data = await res.json();
          if (data && data.display_name) {
            const road = data.address?.road || data.address?.pedestrian || data.address?.suburb || '';
            const suburb = data.address?.neighbourhood || data.address?.suburb || '';
            const town = data.address?.city || data.address?.town || 'Santa Cruz';
            const textoLimpio = [road, suburb, town].filter(Boolean).join(', ');
            setDireccionGeocodificada(textoLimpio || data.display_name);
          }
        } catch (err) {
          console.warn('Geocodificación inversa fallida:', err);
        } finally {
          setCargandoGeocodificacion(false);
        }
      };

      map.on('click', (e: any) => {
        actualizarPunto(e.latlng.lat, e.latlng.lng);
      });

      marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        actualizarPunto(pos.lat, pos.lng);
      });

      actualizarPunto(initialLat, initialLng);
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapModalInstanceRef.current) {
        mapModalInstanceRef.current.remove();
        mapModalInstanceRef.current = null;
      }
    };
  }, [modalMapaAbierto]);

  const abrirSelectorMapa = () => {
    setModalMapaAbierto(true);
  };

  const confirmarUbicacionModal = () => {
    setCoordenadas(tempCoordenadas);
    if (direccionGeocodificada) {
      setDireccion(direccionGeocodificada);
    }
    setModalMapaAbierto(false);
  };

  const obtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no es compatible con tu navegador.');
      return;
    }
    setGeolocalizando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords = { lat, lng };
        setCoordenadas(coords);
        setTempCoordenadas(coords);

        if (mapModalInstanceRef.current && mapModalMarkerRef.current) {
          mapModalInstanceRef.current.setView([lat, lng], 16);
          mapModalMarkerRef.current.setLatLng([lat, lng]);
        }

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
            setDireccionGeocodificada(textoLimpio || data.display_name);
          }
        } catch (err) {
          console.warn('Geocodificación inversa GPS fallida:', err);
        } finally {
          setGeolocalizando(false);
        }
      },
      (err) => {
        setGeolocalizando(false);
        alert('No se pudo acceder a tu ubicación GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const items = cart?.items || [];
  const subtotal = cart?.total || 0;
  const esExpress = tipoEnvio === 'EXPRESS';
  const costoEnvio = esExpress ? 30 : (subtotal >= 200 || subtotal === 0 ? 0 : 15);
  const totalFinal = Number(Math.max(0, (totalConDescuento || subtotal) + costoEnvio).toFixed(2));
  const metodoEnvioId = esExpress
    ? 'e2000000-0000-0000-0000-000000000002'
    : 'e1000000-0000-0000-0000-000000000001';

  // HU-56: Inicializar Stripe Embedded Checkout
  const inicializarEmbeddedCheckout = async () => {
    if (!direccion.trim()) {
      setErrorPago('Por favor ingresa primero la dirección de entrega antes de iniciar el pago.');
      return;
    }
    if (!telefono.trim()) {
      setErrorPago('Por favor ingresa un número de teléfono de contacto.');
      return;
    }

    setCargandoEmbedded(true);
    setErrorPago(null);

    try {
      if (checkoutInstanceRef.current) {
        checkoutInstanceRef.current.destroy();
        checkoutInstanceRef.current = null;
      }

      const res = await paymentsApi.crearSesionEmbebida({
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        cuponId: cupon?.id,
        metodoEnvioId,
        tipoEnvio,
        latitud: coordenadas?.lat,
        longitud: coordenadas?.lng,
      });

      setEmbeddedSessionId(res.sessionId);

      const stripe = window.Stripe ? window.Stripe(STRIPE_PUBLIC_KEY) : null;
      if (!stripe) {
        throw new Error('El SDK de Stripe no está disponible en la página.');
      }

      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: res.clientSecret,
      });

      checkoutInstanceRef.current = checkout;

      setTimeout(() => {
        const container = document.getElementById('stripe-embedded-checkout');
        if (container) {
          checkout.mount('#stripe-embedded-checkout');
        }
      }, 50);
    } catch (err: any) {
      setErrorPago(err.response?.data?.message || err.message || 'Error al inicializar Stripe Embedded Checkout.');
    } finally {
      setCargandoEmbedded(false);
    }
  };

  // HU-60: Procesar Pago Contra Entrega
  const procesarPagoContraEntrega = async () => {
    if (!direccion.trim()) {
      setErrorPago('Por favor ingresa la dirección de entrega.');
      return;
    }
    if (!telefono.trim()) {
      setErrorPago('Por favor ingresa un número de teléfono de contacto.');
      return;
    }

    setProcesando(true);
    setErrorPago(null);

    try {
      const orden = await paymentsApi.pagoContraEntrega({
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        cuponId: cupon?.id,
        metodoEnvioId,
        tipoEnvio,
        latitud: coordenadas?.lat,
        longitud: coordenadas?.lng,
      });

      clearCart();
      setOrdenCompletada(orden);
    } catch (err: any) {
      setErrorPago(err.response?.data?.message || err.message || 'Error al procesar la orden contra entrega.');
    } finally {
      setProcesando(false);
    }
  };

  // Pago con QR Simple / Transferencia Bancaria
  const procesarPagoQr = async () => {
    if (!direccion.trim()) {
      setErrorPago('Por favor ingresa la dirección de entrega.');
      return;
    }
    if (!telefono.trim()) {
      setErrorPago('Por favor ingresa un número de teléfono de contacto.');
      return;
    }

    setProcesando(true);
    setErrorPago(null);

    try {
      const orden = await paymentsApi.pagoQr({
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        nroComprobante: nroComprobanteQr || undefined,
        cuponId: cupon?.id,
        metodoEnvioId,
        tipoEnvio,
        latitud: coordenadas?.lat,
        longitud: coordenadas?.lng,
      });

      clearCart();
      setOrdenCompletada(orden);
    } catch (err: any) {
      setErrorPago(err.response?.data?.message || err.message || 'Error al procesar el pago por QR.');
    } finally {
      setProcesando(false);
    }
  };

  const handleProcesarCompra = (e: React.FormEvent) => {
    e.preventDefault();
    if (metodoPago === 'tarjeta') {
      if (!embeddedSessionId) {
        inicializarEmbeddedCheckout();
      }
    } else if (metodoPago === 'qr') {
      procesarPagoQr();
    } else {
      procesarPagoContraEntrega();
    }
  };

  // =========================================================================
  // VISTA: PANTALLA DE COMPROBANTE Y ESTADO DEL PAGO (HU-57)
  // =========================================================================
  if (ordenCompletada) {
    const esAprobado = ordenCompletada.pago?.estado === 'APROBADO';

    return (
      <div className="py-10 max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200 shadow-xl text-center">
          {/* ICONO DE ESTADO */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600">
            {esAprobado ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            ) : (
              <Clock className="w-12 h-12 text-amber-500" />
            )}
          </div>

          <span
            className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3 ${
              esAprobado
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {esAprobado ? 'Pago Aprobado con Éxito' : 'Pago Pendiente (Contra Entrega)'}
          </span>

          <h1 className="text-3xl font-black text-gray-900 mb-2">¡Gracias por tu compra!</h1>
          <p className="text-gray-600 max-w-md mx-auto mb-8 text-sm leading-relaxed">
            {esAprobado
              ? 'Hemos procesado tu pago de forma segura mediante Stripe. Tu pedido ya está en preparación.'
              : 'Tu pedido ha sido registrado con éxito. Podrás pagar en efectivo al momento de recibir tus prendas.'}
          </p>

          {/* TARJETA DE DETALLE DEL COMPROBANTE */}
          <div className="bg-gray-50 rounded-2xl p-6 text-left border border-gray-200 mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-gray-200 gap-2">
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Número de Orden</span>
                <p className="text-lg font-black text-gray-900">{ordenCompletada.nroOrden}</p>
              </div>
              <div className="sm:text-right">
                <span className="text-xs text-gray-500 uppercase font-semibold">Fecha y Hora</span>
                <p className="text-sm font-semibold text-gray-700">
                  {new Date(ordenCompletada.fecha).toLocaleString('es-BO')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Método de Pago</span>
                <p className="font-bold text-gray-800">{ordenCompletada.pago?.metodoPago}</p>
                {ordenCompletada.pago?.idTransaccion && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    Ref: {ordenCompletada.pago.idTransaccion}
                  </p>
                )}
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Estado del Pedido</span>
                <p className="font-bold text-gray-800">{ordenCompletada.estadoOrden}</p>
              </div>
            </div>

            {/* CÓDIGO DE SEGUIMIENTO / GUÍA */}
            <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-[11px] text-indigo-700 uppercase font-bold tracking-wider block">
                    Guía de Rastreo Asignada
                  </span>
                  <span className="font-mono font-bold text-indigo-950 text-sm">
                    {ordenCompletada.envio?.numeroTracking || `TRK-${ordenCompletada.nroOrden}`}
                  </span>
                </div>
              </div>
              <Link
                to={`/tracking/${ordenCompletada.envio?.numeroTracking || ordenCompletada.nroOrden}`}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Ver Mapa Leaflet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* LISTA DE PRENDAS COMPRADAS */}
            <div className="pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500 uppercase font-semibold block mb-3">Prendas Pedidas</span>
              <div className="space-y-2">
                {ordenCompletada.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-1">
                    <div>
                      <span className="font-semibold text-gray-800">{item.nombre}</span>
                      <span className="text-xs text-gray-500 block">
                        Talla: {item.talla} · Color: {item.color} · Cant: {item.cantidad}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTALES */}
            <div className="pt-4 border-t border-gray-200 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${ordenCompletada.subtotal.toFixed(2)}</span>
              </div>
              {ordenCompletada.descuento > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Descuento aplicado</span>
                  <span>- ${ordenCompletada.descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Costo de Envío</span>
                <span>{ordenCompletada.costoEnvio === 0 ? 'Gratis' : `$${ordenCompletada.costoEnvio.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-300">
                <span>Total Pagado</span>
                <span>${ordenCompletada.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ACCIONES */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 text-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprobante</span>
            </button>
            <Link
              to={`/tracking/${ordenCompletada.envio?.numeroTracking || ordenCompletada.nroOrden}`}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm shadow-md transition"
            >
              <Truck className="w-4 h-4" />
              <span>Rastrear Envío en Vivo</span>
            </Link>
            <Link
              to="/pedidos"
              className="w-full sm:w-auto px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 flex items-center justify-center gap-2 text-sm shadow-lg transition"
            >
              <span>Mis Pedidos</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA: CHECKOUT PRINCIPAL CON STRIPE Y CONTRA ENTREGA
  // =========================================================================
  return (
    <div className="py-8 max-w-7xl mx-auto px-4">
      {/* HEADER & STEPS */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <Link to="/carrito" className="hover:text-black">Carrito</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-black">Checkout y Pasarela de Pago</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Finalizar Compra</h1>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h2>
          <p className="text-gray-500 mb-6 text-sm">Agrega prendas antes de proceder al pago.</p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition"
          >
            Explorar Catálogo
          </Link>
        </div>
      ) : (
        <form onSubmit={handleProcesarCompra} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUMNA IZQUIERDA: DATOS DE ENVÍO Y PASARELA DE PAGO */}
          <div className="lg:col-span-7 space-y-6">
            {/* ERROR BANNER */}
            {errorPago && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1 font-medium">{errorPago}</div>
              </div>
            )}

            {/* SECCIÓN 1: DATOS DE ENVÍO */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-900" />
                  <h2 className="text-lg font-bold text-gray-900">1. Dirección de Entrega</h2>
                </div>

                {/* BOTONES MAPA Y GPS */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={abrirSelectorMapa}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition cursor-pointer shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Seleccionar en el Mapa</span>
                  </button>
                  <button
                    type="button"
                    onClick={obtenerUbicacionGPS}
                    disabled={geolocalizando}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {geolocalizando ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>{geolocalizando ? 'Detectando GPS...' : 'Mi GPS'}</span>
                  </button>
                </div>
              </div>

              {/* INDICADOR DE UBICACIÓN FIJADA EN MAPA */}
              {coordenadas && (
                <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Ubicación fijada en el mapa: <strong>Lat: {coordenadas.lat.toFixed(4)}, Lng: {coordenadas.lng.toFixed(4)}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={abrirSelectorMapa}
                    className="text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    Cambiar punto
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">
                      Dirección Completa *
                    </label>
                    <span className="text-[11px] text-gray-400">
                      O usa el botón "Seleccionar en el Mapa"
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Calle 3 #120, Barrio Equipetrol, Santa Cruz"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Ciudad / Departamento *
                  </label>
                  <select
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition font-medium"
                  >
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="La Paz">La Paz</option>
                    <option value="Cochabamba">Cochabamba</option>
                    <option value="Sucre">Sucre</option>
                    <option value="Tarija">Tarija</option>
                    <option value="Oruro">Oruro</option>
                    <option value="Potosí">Potosí</option>
                    <option value="Beni">Beni</option>
                    <option value="Pando">Pando</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Teléfono de Contacto *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 77712345"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Notas de entrega (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Instrucciones para el repartidor (ej. dejar en portería)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: MÉTODO DE ENVÍO (HU-62 & HU-63) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-gray-900" />
                  <h2 className="text-lg font-bold text-gray-900">2. Método de Envío</h2>
                </div>
                {subtotal >= 200 && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                    ¡Califica a Envío Estándar Gratis!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opción Estándar */}
                <button
                  type="button"
                  onClick={() => setTipoEnvio('ESTANDAR')}
                  className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    tipoEnvio === 'ESTANDAR'
                      ? 'border-stone-900 bg-[#F2ECE1] shadow-xs'
                      : 'border-[#D5CCC0] hover:border-stone-400 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-900">Envío Estándar Atelier</span>
                    <span className="font-semibold text-stone-900 text-xs uppercase tracking-luxury">
                      {subtotal >= 100 ? 'Cortesía' : '$10.00'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-light">2 a 3 días hábiles en empaque rígido protegido</p>
                </button>

                {/* Opción Express */}
                <button
                  type="button"
                  onClick={() => setTipoEnvio('EXPRESS')}
                  className={`p-4 rounded-xs border text-left transition flex flex-col justify-between ${
                    tipoEnvio === 'EXPRESS'
                      ? 'border-stone-900 bg-[#F2ECE1] shadow-xs'
                      : 'border-[#D5CCC0] hover:border-stone-400 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-stone-900">Envío Express Prioritario</span>
                      <span className="text-[9px] uppercase tracking-luxury bg-stone-900 text-white px-1.5 py-0.5">
                        24h
                      </span>
                    </div>
                    <span className="font-semibold text-stone-900 text-xs">
                      $20.00
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-light">Entrega prioritaria asegurada en 24 horas</p>
                </button>
              </div>
            </div>

            {/* SECCIÓN 3: MÉTODO DE PAGO */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-900" />
                  <h2 className="text-lg font-bold text-gray-900">3. Método de Pago Seguro</h2>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Encriptado SSL 256-bit
                </span>
              </div>

              {/* SELECTOR DE PESTAÑAS DE PAGO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setMetodoPago('tarjeta')}
                  className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    metodoPago === 'tarjeta'
                      ? 'border-black bg-gray-50/70 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard className={`w-5 h-5 ${metodoPago === 'tarjeta' ? 'text-black' : 'text-gray-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                      Stripe
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Tarjeta Débito/Crédito</p>
                    <p className="text-xs text-gray-500">Procesamiento instantáneo</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPago('qr')}
                  className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    metodoPago === 'qr'
                      ? 'border-purple-700 bg-purple-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <QrCode className={`w-5 h-5 ${metodoPago === 'qr' ? 'text-purple-700' : 'text-gray-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      QR Simple
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Transferencia QR</p>
                    <p className="text-xs text-gray-500">Banca móvil nacional</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPago('contra_entrega')}
                  className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                    metodoPago === 'contra_entrega'
                      ? 'border-black bg-gray-50/70 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Truck className={`w-5 h-5 ${metodoPago === 'contra_entrega' ? 'text-black' : 'text-gray-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      Efectivo
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Pago Contra Entrega</p>
                    <p className="text-xs text-gray-500">Pagas al recibir paquete</p>
                  </div>
                </button>
              </div>

              {/* CONTENIDO SEGÚN MÉTODO DE PAGO */}
              {metodoPago === 'tarjeta' ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Stripe Embedded Checkout Oficial</h4>
                        <p className="text-xs text-gray-500">Formulario seguro incrustado con cifrado bancario de Stripe</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                      PCI-DSS Verificado
                    </span>
                  </div>

                  {/* CONTENEDOR DE STRIPE EMBEDDED CHECKOUT */}
                  {!embeddedSessionId ? (
                    <div className="p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                        <CreditCard className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-gray-900">Pasarela de Tarjetas Lista</h4>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                          Acepta tarjetas de débito/crédito (Visa, Mastercard, Amex) y métodos digitales de forma directa.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={inicializarEmbeddedCheckout}
                        disabled={cargandoEmbedded}
                        className="px-6 py-3.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition shadow-lg inline-flex items-center gap-2 cursor-pointer"
                      >
                        {cargandoEmbedded ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Iniciando Pasarela Stripe...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Abrir Formulario Seguro de Tarjeta</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                        <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Formulario Seguro de Stripe Activo
                        </span>
                        <button
                          type="button"
                          onClick={inicializarEmbeddedCheckout}
                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reiniciar formulario</span>
                        </button>
                      </div>
                      <div
                        id="stripe-embedded-checkout"
                        className="w-full min-h-[420px] bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm p-2"
                      ></div>
                    </div>
                  )}
                </div>
              ) : metodoPago === 'qr' ? (
                /* OPCIÓN: PAGO CON QR SIMPLE */
                <div className="space-y-4 pt-2">
                  <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">Transferencia Bancaria QR Simple</h4>
                        <p className="text-xs text-gray-500">Paga al instante escaneando el código con tu banca móvil</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
                      QR Oficial
                    </span>
                  </div>

                  <div className="bg-white border-2 border-dashed border-purple-200 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                    <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-200 inline-block">
                      <img
                        src="/qr_pago_aura.png"
                        alt="Código QR de Pago AURA"
                        className="w-56 h-56 object-contain rounded-xl"
                      />
                    </div>

                    <div className="space-y-1 max-w-sm">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Monto a transferir:</p>
                      <p className="text-2xl font-black text-gray-900 font-mono">
                        ${totalFinal.toFixed(2)} USD <span className="text-xs font-normal text-gray-500">(o equivalente en Bs)</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        1. Abre tu aplicación bancaria móvil (Banco Unión, BNB, BCP, Mercantil Santa Cruz, etc.).<br />
                        2. Escanea el código QR de arriba y confirma la transacción.<br />
                        3. Ingresa tu número de comprobante o referencia y confirma tu pedido.
                      </p>
                    </div>

                    <div className="w-full max-w-sm text-left pt-2 border-t border-gray-100">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Nro. de Comprobante / Referencia Bancaria (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. TRX-984321 o número de operación"
                        value={nroComprobanteQr}
                        onChange={(e) => setNroComprobanteQr(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none transition"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={procesarPagoQr}
                      disabled={procesando}
                      className="w-full max-w-sm py-4 bg-purple-700 text-white text-sm font-black rounded-xl hover:bg-purple-800 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {procesando ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Confirmando Pago QR...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Ya transferí · Confirmar Pedido</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* OPCION: PAGO CONTRA ENTREGA */
                <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <Truck className="w-5 h-5 text-amber-700" />
                    <span>Pago en Efectivo al Recibir el Paquete</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    No necesitas ingresar ninguna tarjeta de crédito ahora. Tu pedido será despachado a tu dirección y le pagarás el monto total en efectivo directamente al repartidor cuando te entregue las prendas.
                  </p>
                  <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Se recomienda tener el cambio exacto de <strong>${totalFinal.toFixed(2)}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: RESUMEN DE COMPRA */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 border border-[#E7E1D7] sticky top-6 space-y-6">
              <h2 className="font-serif text-lg font-normal text-stone-900 pb-3 border-b border-[#E7E1D7]">
                Resumen del Pedido ({cart?.totalItems || 0} prendas)
              </h2>

              {/* LISTADO DE ITEMS */}
              <div className="max-h-72 overflow-y-auto space-y-3 divide-y divide-[#E7E1D7] pr-1">
                {items.map((item: any) => {
                  const prod = item.producto;
                  const img = prod?.imagen || prod?.imagenes?.[0]?.url;
                  const tallaNombre = item.talla?.nombre || item.variante?.talla?.nombre || 'Única';
                  const colorNombre = item.color?.nombre || item.variante?.color?.nombre || 'Original';

                  return (
                    <div key={item.id || item.varianteId} className="pt-3 first:pt-0 flex gap-3 items-center">
                      <div className="w-14 h-18 bg-[#F2ECE1] overflow-hidden shrink-0 flex items-center justify-center border border-[#E7E1D7]">
                        {img ? (
                          <img
                            src={getImageUrl(img)}
                            alt={prod?.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x500?text=Prenda';
                            }}
                          />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm text-stone-900 truncate">{prod?.nombre}</p>
                        <p className="text-xs text-stone-500">
                          Talla: {tallaNombre} · Color: {colorNombre}
                        </p>
                        <p className="text-xs text-stone-500 font-medium">Cant: {item.cantidad}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-stone-900 font-sans">
                          ${(Number(item.precioUnitario || prod?.precioBase || 0) * item.cantidad).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESGLOSE FINANCIERO */}
              <div className="pt-4 border-t border-[#E7E1D7] space-y-2 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">${subtotal.toFixed(2)}</span>
                </div>

                {descuento > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Descuento cupón</span>
                    <span>- ${descuento.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Envío a domicilio</span>
                  <span className="font-semibold text-stone-900">
                    {costoEnvio === 0 ? <span className="text-emerald-700 uppercase tracking-luxury font-medium text-[10px]">Cortesía</span> : `$${costoEnvio.toFixed(2)}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#E7E1D7] flex justify-between items-baseline">
                  <div>
                    <span className="font-serif text-base uppercase tracking-wider text-stone-900">Total a Pagar</span>
                    <span className="block text-[10px] text-stone-400">Impuestos y tasas incluidos (USD)</span>
                  </div>
                  <div className="font-serif text-2xl font-medium text-stone-900">
                    ${totalFinal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* BOTÓN SUBMIT DE PAGO */}
              {metodoPago === 'tarjeta' && embeddedSessionId ? (
                <div className="p-4 bg-[#F2ECE1] border border-[#D5CCC0] rounded-xs text-center space-y-1 text-xs text-stone-800">
                  <div className="font-medium flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#9B7B54]" />
                    <span>Completa el pago en el formulario seguro de Stripe</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Haz clic en el botón oficial "Pagar" dentro del formulario de Stripe arriba.
                  </p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={procesando || items.length === 0 || cargandoEmbedded}
                  className="w-full bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 text-xs uppercase tracking-luxury py-4 px-6 rounded-none text-center shadow-sm transition flex items-center justify-center gap-2 cursor-pointer font-medium"
                >
                  {procesando || cargandoEmbedded ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    <>
                      <span>
                        {metodoPago === 'tarjeta'
                          ? `Abrir Pasarela de Pago ($${totalFinal.toFixed(2)})`
                          : metodoPago === 'qr'
                          ? `Confirmar Pago por QR ($${totalFinal.toFixed(2)})`
                          : `Confirmar Pedido en Efectivo ($${totalFinal.toFixed(2)})`}
                      </span>
                      <Lock className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}

              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                  <span>Pasarela 100% Segura</span>
                </span>
                <span className="flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                  <span>Garantía de Reembolso</span>
                </span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* MODAL DE SELECTOR INTERACTIVO DE MAPA (LEAFLET / OPENSTREETMAP) */}
      {modalMapaAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* CABECERA DEL MODAL */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">Seleccionar Punto en el Mapa</h3>
                  <p className="text-xs text-gray-500">Haz clic o arrastra el marcador 📍 hasta la puerta de tu casa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMapaAbierto(false)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CONTENEDOR DEL MAPA LEAFLET */}
            <div className="relative flex-1 min-h-[360px] bg-gray-100">
              <div ref={mapModalRef} className="w-full h-full min-h-[360px] z-0" />

              {/* BOTÓN FLOTANTE GPS */}
              <button
                type="button"
                onClick={obtenerUbicacionGPS}
                disabled={geolocalizando}
                className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm px-3.5 py-2 rounded-xl shadow-lg border border-gray-200 text-xs font-bold text-gray-800 hover:bg-white flex items-center gap-1.5 transition cursor-pointer"
              >
                {geolocalizando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{geolocalizando ? 'Obteniendo GPS...' : 'Usar mi GPS'}</span>
              </button>
            </div>

            {/* PIE DEL MODAL: DIRECCIÓN DETECTADA Y CONFIRMACIÓN */}
            <div className="p-5 bg-gray-50 border-t border-gray-100 space-y-3">
              <div className="text-xs">
                <span className="font-bold text-gray-500 uppercase block mb-1">
                  Dirección Detectada Automáticamente:
                </span>
                <div className="p-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 flex items-center gap-2 min-h-[42px] shadow-sm">
                  {cargandoGeocodificacion ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
                      <span className="text-gray-400">Identificando nombre de calle y zona...</span>
                    </>
                  ) : (
                    <span>{direccionGeocodificada || 'Haz clic en el mapa para ubicar tu dirección exacta...'}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalMapaAbierto(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarUbicacionModal}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar esta Ubicación</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
