import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Phone,
  FileText,
  ChevronRight,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { useCartStore } from '../../../store/cart.store';
import { useAuthStore } from '../../../store/auth.store';
import { paymentsApi } from '../services/payments.api';
import { OrdenRespuesta } from '../types';

declare global {
  interface Window {
    Stripe?: any;
  }
}

const STRIPE_PUBLIC_KEY =
  import.meta.env.VITE_STRIPE_PUBLIC_KEY ||
  'pk_test_51UHsanC3rRVxMYcMuVMARIsjpwRZHWjLoKv57X7WIu9Lk9Ic101Cz5uPrZo16gYrMOA9NrCkmJ0RBPXEiuAADGTt003eAaVPVh';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, cupon, descuento, totalConDescuento, cargarCarrito, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  // Estados del formulario de envío
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('Santa Cruz');
  const [telefono, setTelefono] = useState(user?.celular || '');
  const [notas, setNotas] = useState('');

  // Método de pago: 'tarjeta' | 'contra_entrega'
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'contra_entrega'>('tarjeta');

  // Datos de tarjeta de crédito/débito
  const [nombreTitular, setNombreTitular] = useState(user?.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : '');
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [expiracion, setExpiracion] = useState('');
  const [cvc, setCvc] = useState('');

  // Estados de proceso
  const [procesando, setProcesando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [ordenCompletada, setOrdenCompletada] = useState<OrdenRespuesta | null>(null);

  useEffect(() => {
    cargarCarrito();
  }, []);

  const items = cart?.items || [];
  const subtotal = cart?.total || 0;
  const envio = subtotal >= 200 || subtotal === 0 ? 0 : 15;
  const totalFinal = Number(Math.max(0, (totalConDescuento || subtotal) + envio).toFixed(2));

  // Formateo inteligente de tarjeta
  const handleNumeroTarjetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setNumeroTarjeta(formatted);
  };

  const handleExpiracionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiracion(raw);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvc(raw);
  };

  // Detección de tipo de tarjeta
  const getTipoTarjeta = () => {
    const clean = numeroTarjeta.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (/^5[1-5]/.test(clean)) return 'MASTERCARD';
    if (/^3[47]/.test(clean)) return 'AMEX';
    return 'TARJETA';
  };

  // HU-56 / HU-58: Procesar Pago con Tarjeta en Stripe
  const procesarPagoTarjeta = async () => {
    if (!direccion.trim()) {
      setErrorPago('Por favor ingresa la dirección de entrega.');
      return;
    }
    if (!telefono.trim()) {
      setErrorPago('Por favor ingresa un número de teléfono de contacto.');
      return;
    }

    const cleanCard = numeroTarjeta.replace(/\s/g, '');
    if (cleanCard.length < 15) {
      setErrorPago('Por favor ingresa un número de tarjeta válido (16 dígitos).');
      return;
    }

    const [expMonth, expYear] = expiracion.split('/');
    if (!expMonth || !expYear || Number(expMonth) < 1 || Number(expMonth) > 12) {
      setErrorPago('Ingresa una fecha de expiración válida (MM/AA).');
      return;
    }

    if (cvc.length < 3) {
      setErrorPago('Ingresa un código CVC válido.');
      return;
    }

    setProcesando(true);
    setErrorPago(null);

    try {
      // 1. Crear PaymentIntent en backend
      const intentData = await paymentsApi.crearIntento({
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        cuponId: cupon?.id,
      });

      // 2. Inicializar Stripe SDK en cliente
      const stripe = window.Stripe ? window.Stripe(STRIPE_PUBLIC_KEY) : null;

      let paymentIntentId = intentData.paymentIntentId;

      if (stripe) {
        // Confirmar con Stripe usando tarjeta tokenizada
        const fullYear = expYear.length === 2 ? `20${expYear}` : expYear;
        const result = await stripe.confirmCardPayment(intentData.clientSecret, {
          payment_method: {
            card: {
              number: cleanCard,
              exp_month: parseInt(expMonth, 10),
              exp_year: parseInt(fullYear, 10),
              cvc: cvc,
            },
            billing_details: {
              name: nombreTitular || 'Cliente',
              phone: telefono,
            },
          },
        });

        if (result.error) {
          throw new Error(result.error.message || 'La tarjeta fue rechazada por Stripe.');
        }
        paymentIntentId = result.paymentIntent.id;
      }

      // 3. Confirmar en backend y registrar pedido (HU-58)
      const orden = await paymentsApi.confirmarTarjeta({
        paymentIntentId,
        direccionEnvio: `${direccion}, ${ciudad}`,
        telefono,
        notas,
        cuponId: cupon?.id,
      });

      clearCart();
      setOrdenCompletada(orden);
    } catch (err: any) {
      setErrorPago(err.response?.data?.message || err.message || 'Error al procesar el pago.');
    } finally {
      setProcesando(false);
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
      });

      clearCart();
      setOrdenCompletada(orden);
    } catch (err: any) {
      setErrorPago(err.response?.data?.message || err.message || 'Error al procesar la orden contra entrega.');
    } finally {
      setProcesando(false);
    }
  };

  const handleProcesarCompra = (e: React.FormEvent) => {
    e.preventDefault();
    if (metodoPago === 'tarjeta') {
      procesarPagoTarjeta();
    } else {
      procesarPagoContraEntrega();
    }
  };

  // =========================================================================
  // VISTA: PANTALLA DE COMPROBANTE Y ESTADO DEL PAGO (HU-57)
  // =========================================================================
  if (ordenCompletada) {
    const esAprobado = ordenCompletada.pago?.estado === 'APROBADO';
    const esPendiente = ordenCompletada.pago?.estado === 'PENDIENTE';

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

            {/* LISTA DE PRENDAS COMPRADAS */}
            <div className="pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500 uppercase font-semibold block mb-3">Prendas Pedidas</span>
              <div className="space-y-2">
                {ordenCompletada.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm py-1">
                    <div>
                      <span className="font-semibold text-gray-800">{item.nombre}</span>
                      <span className="text-xs text-gray-500 block">
                        Talla: {item.talla} · Color: {item.color} · Cant: {item.cantidad}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900">Bs. {item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTALES */}
            <div className="pt-4 border-t border-gray-200 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Bs. {ordenCompletada.subtotal.toFixed(2)}</span>
              </div>
              {ordenCompletada.descuento > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Descuento aplicado</span>
                  <span>- Bs. {ordenCompletada.descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Costo de Envío</span>
                <span>{ordenCompletada.costoEnvio === 0 ? 'Gratis' : `Bs. ${ordenCompletada.costoEnvio.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-300">
                <span>Total Pagado</span>
                <span>Bs. {ordenCompletada.total.toFixed(2)}</span>
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
              to="/pedidos"
              className="w-full sm:w-auto px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 flex items-center justify-center gap-2 text-sm shadow-lg transition"
            >
              <span>Ver Mis Pedidos</span>
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
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <MapPin className="w-5 h-5 text-gray-900" />
                <h2 className="text-lg font-bold text-gray-900">1. Dirección de Entrega</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Dirección Completa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Av. San Martín #450, Edif. Torre Real Depto 3B"
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

            {/* SECCIÓN 2: MÉTODO DE PAGO */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-900" />
                  <h2 className="text-lg font-bold text-gray-900">2. Método de Pago Seguro</h2>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Encriptado SSL 256-bit
                </span>
              </div>

              {/* SELECTOR DE PESTAÑAS DE PAGO */}
              <div className="grid grid-cols-2 gap-3">
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
                    <p className="text-xs text-gray-500">Procesamiento seguro instantáneo</p>
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
                    <p className="text-xs text-gray-500">Pagas en efectivo al recibir</p>
                  </div>
                </button>
              </div>

              {/* CONTENIDO SEGÚN MÉTODO DE PAGO */}
              {metodoPago === 'tarjeta' ? (
                <div className="space-y-5 pt-2">
                  {/* PREVIEW DE TARJETA DE CRÉDITO DINÁMICA */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-10 h-8 rounded-md bg-amber-400/80 border border-amber-300/40 relative flex items-center justify-center">
                        <div className="w-6 h-4 border border-amber-900/30 rounded-sm"></div>
                      </div>
                      <span className="font-black tracking-widest text-sm text-gray-300">
                        {getTipoTarjeta()}
                      </span>
                    </div>

                    <div className="text-lg sm:text-xl font-mono tracking-widest mb-4">
                      {numeroTarjeta || '•••• •••• •••• ••••'}
                    </div>

                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block">Titular</span>
                        <span className="font-semibold tracking-wide uppercase">
                          {nombreTitular || 'NOMBRE TITULAR'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase block">Expira</span>
                        <span className="font-semibold">{expiracion || 'MM/AA'}</span>
                      </div>
                    </div>
                  </div>

                  {/* FORMULARIO DE TARJETA */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Nombre en la Tarjeta *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. JUAN PEREZ"
                        value={nombreTitular}
                        onChange={(e) => setNombreTitular(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Número de Tarjeta (Stripe Test: 4242 4242...) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="4242 •••• •••• 4242"
                          value={numeroTarjeta}
                          onChange={handleNumeroTarjetaChange}
                          className="w-full pl-3.5 pr-12 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {getTipoTarjeta()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Vencimiento (MM/AA) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="12/28"
                          value={expiracion}
                          onChange={handleExpiracionChange}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          CVC / CVV *
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="123"
                          value={cvc}
                          onChange={handleCvcChange}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition text-center"
                        />
                      </div>
                    </div>
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
                    <span>Se recomienda tener el cambio exacto de <strong>Bs. {totalFinal.toFixed(2)}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: RESUMEN DE COMPRA */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm sticky top-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 pb-3 border-b border-gray-100">
                Resumen del Pedido ({cart?.totalItems || 0} prendas)
              </h2>

              {/* LISTADO DE ITEMS */}
              <div className="max-h-72 overflow-y-auto space-y-3 divide-y divide-gray-100 pr-1">
                {items.map((item) => {
                  const variante = item.variante;
                  const prod = variante?.producto;
                  const img = prod?.imagenes?.[0]?.url;

                  return (
                    <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                      <div className="w-14 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {img ? (
                          <img
                            src={img.startsWith('http') ? img : `http://localhost:3000${img}`}
                            alt={prod?.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{prod?.nombre}</p>
                        <p className="text-xs text-gray-500">
                          Talla: {variante?.talla?.nombre || 'Única'} · Color: {variante?.color?.nombre || 'Original'}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">Cant: {item.cantidad}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          Bs. {(Number(item.precioUnitario || prod?.precio || 0) * item.cantidad).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESGLOSE FINANCIERO */}
              <div className="pt-4 border-t border-gray-200 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">Bs. {subtotal.toFixed(2)}</span>
                </div>

                {descuento > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Descuento cupón</span>
                    <span>- Bs. {descuento.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600 items-center">
                  <span>Envío a domicilio</span>
                  <span className="font-semibold text-gray-900">
                    {envio === 0 ? <span className="text-emerald-600 uppercase font-bold text-xs">Gratis</span> : `Bs. ${envio.toFixed(2)}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-base font-bold text-gray-900">Total a Pagar</span>
                    <span className="block text-[11px] text-gray-500">Impuestos y tasas incluidos</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    Bs. {totalFinal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* BOTÓN SUBMIT DE PAGO */}
              <button
                type="submit"
                disabled={procesando || items.length === 0}
                className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 font-bold py-4 px-6 rounded-xl text-center shadow-lg transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                {procesando ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Procesando {metodoPago === 'tarjeta' ? 'con Stripe...' : 'pedido...'}</span>
                  </div>
                ) : (
                  <>
                    <span>
                      {metodoPago === 'tarjeta'
                        ? `Pagar Bs. ${totalFinal.toFixed(2)} con Stripe`
                        : `Confirmar Pedido (Bs. ${totalFinal.toFixed(2)})`}
                    </span>
                    <Lock className="w-4 h-4" />
                  </>
                )}
              </button>

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
    </div>
  );
};
