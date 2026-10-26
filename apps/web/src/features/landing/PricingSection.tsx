import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  X,
  Loader2,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { usePlanLimites } from '../tiendas/hooks/usePlanLimites';
import { tiendasApi } from '../tiendas/services/tiendas.api';
import { MiTienda } from '../tiendas/types';
import { Modal } from '../../components/ui/Modal';

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { metricas, actualizando, cambiarPlan } = usePlanLimites();

  const [anual, setAnual] = useState<boolean>(false);
  const [planAActualizar, setPlanAActualizar] = useState<'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO' | null>(null);

  // Estados de pasarela de pago para la suscripción
  const [metodoPago, setMetodoPago] = useState<'STRIPE' | 'QR'>('STRIPE');
  const [pagoProcesando, setPagoProcesando] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [transaccionId, setTransaccionId] = useState('');
  const [datosTarjeta, setDatosTarjeta] = useState({
    numero: '4242 •••• •••• 4242',
    expiracion: '12/28',
    cvc: '888',
    titular: user ? `${user.nombre} ${user.apellido || ''}`.trim() : 'Juan Pérez',
  });

  const { data: misTiendas = [] } = useQuery<MiTienda[]>({
    queryKey: ['mis-tiendas-pricing', user?.id],
    queryFn: tiendasApi.listarMias,
    enabled: !!user,
  });

  // Identificar la tienda que administra el usuario
  const tiendasAdmin = misTiendas.filter((t) => t.rol === 'ADMIN');
  const tiendaDestino = tiendasAdmin.find((t) => t.esActiva) || tiendasAdmin[0] || (metricas?.tienda ? {
    id: metricas.tienda.id,
    nombre: metricas.tienda.nombre,
    slug: metricas.tienda.slug,
    plan: metricas.tienda.plan,
    rol: 'ADMIN',
    esActiva: true,
  } : null);

  const planActualTienda = isAuthenticated && tiendaDestino ? (tiendaDestino.plan || metricas?.plan?.id || 'FREE_TRIAL') : null;

  const planes = [
    {
      id: 'FREE_TRIAL' as const,
      nombre: 'Free Trial',
      subtitulo: 'Para validar tu marca',
      precio: 0,
      periodo: '14 días de prueba gratis',
      descripcion: 'Prueba todas las funcionalidades básicas de atelier sin costo inicial.',
      limites: {
        sucursales: '1 Sucursal',
        usuarios: '2 Usuarios / Empleados',
        productos: 'Hasta 30 productos',
      },
      caracteristicas: [
        { texto: 'Catálogo web responsive atelier', incluido: true },
        { texto: 'Bolsa de compras y checkout', incluido: true },
        { texto: 'Probador Virtual con IA básico', incluido: true },
        { texto: 'Punto de Venta (POS) Offline', incluido: false },
        { texto: 'Reportes por Voz con IA (Groq)', incluido: false },
        { texto: 'Machine Learning (Random Forest & K-Means)', incluido: false },
        { texto: 'Soporte prioritario 24/7', incluido: false },
      ],
      cta: 'Comenzar Gratis',
      destacado: false,
    },
    {
      id: 'ESTANDAR' as const,
      nombre: 'Plan Estándar',
      subtitulo: 'Para marcas en crecimiento',
      precio: anual ? 159 : 199,
      periodo: anual ? 'Bs / mes (facturado anualmente)' : 'Bs / mes',
      descripcion: 'Vende omnicanal en boutique física y digital con sincronización offline.',
      limites: {
        sucursales: 'Hasta 3 Sucursales',
        usuarios: 'Hasta 10 Usuarios / Empleados',
        productos: 'Hasta 300 productos',
      },
      caracteristicas: [
        { texto: 'Todo lo del plan Free Trial', incluido: true },
        { texto: 'Punto de Venta POS 100% Offline con sync', incluido: true },
        { texto: 'Reportes dinámicos por voz (Groq/Ollama)', incluido: true },
        { texto: 'Exportación a PDF y Excel (.xlsx)', incluido: true },
        { texto: 'Pasarela de pagos Stripe y QR bancario', incluido: true },
        { texto: 'Machine Learning: Predicción de Demanda', incluido: false },
        { texto: 'Machine Learning: Segmentación K-Means', incluido: false },
      ],
      cta: 'Elegir Estándar',
      destacado: true,
    },
    {
      id: 'CORPORATIVO' as const,
      nombre: 'Plan Corporativo',
      subtitulo: 'Para franquicias y marcas consolidadas',
      precio: anual ? 399 : 499,
      periodo: anual ? 'Bs / mes (facturado anualmente)' : 'Bs / mes',
      descripcion: 'Inteligencia Artificial avanzada, algoritmos predictivos y soporte atelier 24/7.',
      limites: {
        sucursales: 'Sucursales Ilimitadas',
        usuarios: 'Usuarios Ilimitados',
        productos: 'Productos Ilimitados',
      },
      caracteristicas: [
        { texto: 'Todo lo del plan Estándar', incluido: true },
        { texto: 'Random Forest: Predicción de demanda de stock', incluido: true },
        { texto: 'K-Means: Segmentación de clientes (Silhouette)', incluido: true },
        { texto: 'Dashboards BI para Dueño, Vendedor y Cliente', incluido: true },
        { texto: 'Multi-tienda con aislamiento RLS ilimitado', incluido: true },
        { texto: 'SLA garantizado y soporte prioritario 24/7', incluido: true },
        { texto: 'Capacitación personalizada para tu equipo', incluido: true },
      ],
      cta: 'Elegir Corporativo',
      destacado: false,
    },
  ];

  const handleSeleccionarPlan = (planId: 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO') => {
    if (!isAuthenticated) {
      navigate(`/registro?crearTienda=true&plan=${planId}`, {
        state: { planSeleccionado: planId, crearTienda: true },
      });
      return;
    }

    if (planActualTienda === planId) {
      return;
    }

    setPagoExitoso(false);
    setPlanAActualizar(planId);
  };

  const planElegidoObj = planes.find((p) => p.id === planAActualizar);
  const montoAPagar = planElegidoObj ? (anual ? planElegidoObj.precio * 12 : planElegidoObj.precio) : 0;

  const ejecutarPagoYSuscripcion = async () => {
    if (!planAActualizar) return;
    setPagoProcesando(true);
    try {
      // 1. Si la tienda activa en la sesión no es la administrada, seleccionarla
      if (tiendaDestino && !tiendaDestino.esActiva) {
        const sesion = await tiendasApi.seleccionar(tiendaDestino.id);
        useAuthStore.getState().setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
        localStorage.setItem('tenant_slug', sesion.tienda?.slug || 'aura');
      }

      // 2. Simulación de procesamiento en pasarela segura (1.2 segundos)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // 3. Ejecutar actualización del plan en el backend
      await cambiarPlan(planAActualizar);

      setTransaccionId(`STR-SUB-${Math.floor(100000 + Math.random() * 900000)}`);
      setPagoExitoso(true);
    } catch (err) {
      console.error('Error al procesar el pago de la suscripción:', err);
    } finally {
      setPagoProcesando(false);
    }
  };

  return (
    <section id="planes" className="bg-[#FAF8F5] py-20 text-stone-900 border-t border-[#E7E1D7] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Encabezado */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs uppercase tracking-widest text-[#9B7B54] font-semibold">
            Tarifas & Suscripciones
          </p>
          <h2 className="font-serif text-3xl sm:text-5xl font-normal tracking-wide text-stone-900">
            Planes a la medida de tu boutique
          </h2>
          <p className="text-sm text-stone-600 font-light leading-relaxed">
            Comienza gratis con 14 días de prueba. Crece a tu ritmo y cambia de plan en cualquier momento sin contratos
            forzosos.
          </p>

          {isAuthenticated && tiendaDestino && (
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E1D7] text-xs text-stone-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tienda para Upgrade: <strong>{tiendaDestino.nombre}</strong></span>
                <span className="text-stone-300">|</span>
                <span className="text-[#9B7B54] font-medium">Plan actual: {planActualTienda}</span>
              </div>
            </div>
          )}

          {/* Toggle Mensual / Anual */}
          <div className="pt-4 flex items-center justify-center gap-4">
            <span className={`text-xs uppercase tracking-wider ${!anual ? 'font-bold text-stone-900' : 'text-stone-500'}`}>
              Mensual
            </span>
            <button
              type="button"
              onClick={() => setAnual(!anual)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-stone-800 transition-colors duration-200 ease-in-out focus:outline-none"
              role="switch"
              aria-checked={anual}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  anual ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs uppercase tracking-wider flex items-center gap-1.5 ${anual ? 'font-bold text-stone-900' : 'text-stone-500'}`}>
              <span>Anual</span>
              <span className="bg-[#FAF8F5] text-[#9B7B54] border border-[#E7E1D7] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                20% AHORRO
              </span>
            </span>
          </div>
        </div>

        {/* Tarjetas de Precios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {planes.map((plan) => {
            const esPlanActual = Boolean(isAuthenticated && planActualTienda === plan.id);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-none border transition-all duration-300 ${
                  plan.destacado
                    ? 'bg-white border-stone-900 shadow-xl md:-translate-y-2'
                    : 'bg-[#FAF8F5] border-[#E7E1D7] shadow-sm hover:shadow-md'
                }`}
              >
                {plan.destacado && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] uppercase tracking-widest font-semibold px-4 py-1 shadow-sm">
                    Recomendado para Boutiques
                  </div>
                )}

                <div className="p-8 space-y-6">
                  {/* Encabezado del Plan */}
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl text-stone-900 font-normal">
                      {plan.nombre}
                    </h3>
                    <p className="text-xs text-stone-500 font-light">{plan.subtitulo}</p>
                  </div>

                  {/* Precio */}
                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-stone-900">
                        {plan.precio === 0 ? 'Gratis' : `${plan.precio} Bs`}
                      </span>
                      {plan.precio > 0 && (
                        <span className="text-xs text-stone-500 font-light">/ mes</span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 font-light">{plan.periodo}</p>
                  </div>

                  <p className="text-xs text-stone-600 font-light leading-relaxed border-t border-[#E7E1D7] pt-4">
                    {plan.descripcion}
                  </p>

                  {/* Cuotas / Límites del Plan */}
                  <div className="bg-stone-50/80 p-3.5 border border-[#E7E1D7] space-y-1.5 text-xs">
                    <p className="font-semibold text-stone-800 text-[10px] uppercase tracking-wider">
                      Cuotas de Infraestructura:
                    </p>
                    <p className="text-stone-600">🏛️ {plan.limites.sucursales}</p>
                    <p className="text-stone-600">👥 {plan.limites.usuarios}</p>
                    <p className="text-stone-600">👗 {plan.limites.productos}</p>
                  </div>

                  {/* Lista de Características */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      Capacidades Atelier:
                    </p>
                    <ul className="space-y-2.5 text-xs text-stone-700">
                      {plan.caracteristicas.map((caract, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          {caract.incluido ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                          )}
                          <span className={caract.incluido ? 'font-normal' : 'text-stone-400 line-through font-light'}>
                            {caract.texto}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Botón de Acción */}
                <div className="p-8 pt-0">
                  <button
                    type="button"
                    onClick={() => handleSeleccionarPlan(plan.id)}
                    disabled={esPlanActual || actualizando}
                    className={`w-full py-3 px-4 text-xs uppercase tracking-widest font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                      esPlanActual
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : plan.destacado
                        ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-md hover:shadow-lg'
                        : 'bg-white text-stone-900 border border-stone-900 hover:bg-stone-900 hover:text-white'
                    }`}
                  >
                    {esPlanActual ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Plan Activo</span>
                      </>
                    ) : (
                      <span>{plan.cta}</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Pasarela de Pagos & Checkout de Suscripción */}
      <Modal
        isOpen={!!planAActualizar}
        onClose={() => {
          if (!pagoProcesando) {
            setPlanAActualizar(null);
            setPagoExitoso(false);
          }
        }}
        title={pagoExitoso ? 'Recibo de Suscripción' : 'Pasarela de Suscripción SaaS'}
      >
        {pagoExitoso ? (
          <div className="text-center py-3 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-2xl text-stone-900 font-normal">
                ¡Pago Procesado con Éxito!
              </h3>
              <p className="text-xs text-stone-500">
                Tu tienda ha sido actualizada y las capacidades premium están habilitadas.
              </p>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-[#E7E1D7] text-left text-xs space-y-2 rounded-lg">
              <div className="flex justify-between border-b border-[#E7E1D7] pb-2">
                <span className="text-stone-500">Tienda:</span>
                <strong className="text-stone-900">{tiendaDestino?.nombre || 'Mi Tienda'}</strong>
              </div>
              <div className="flex justify-between border-b border-[#E7E1D7] pb-2">
                <span className="text-stone-500">Plan Activado:</span>
                <strong className="text-[#9B7B54] font-semibold">{planElegidoObj?.nombre}</strong>
              </div>
              <div className="flex justify-between border-b border-[#E7E1D7] pb-2">
                <span className="text-stone-500">ID de Transacción:</span>
                <code className="text-stone-700 font-mono text-[11px]">{transaccionId}</code>
              </div>
              <div className="flex justify-between pt-1 text-sm font-bold">
                <span className="text-stone-800">Total Facturado:</span>
                <span className="text-stone-900">{montoAPagar} Bs</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.assign('/admin')}
                className="flex-1 py-3 bg-stone-900 text-white font-semibold text-xs uppercase tracking-widest hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
              >
                <span>Ir al Panel de Administración</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPlanAActualizar(null)}
                className="px-5 py-3 border border-[#E7E1D7] text-xs uppercase tracking-widest text-stone-600 hover:bg-[#FAF8F5]"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-stone-900">
            {/* Resumen del Plan */}
            <div className="p-3.5 bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Suscripción para:</p>
                <p className="font-serif text-base font-semibold text-stone-900 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#9B7B54]" />
                  <span>{tiendaDestino?.nombre || 'Mi Tienda'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#9B7B54]">{montoAPagar} Bs</span>
                <span className="text-[11px] text-stone-500 block">{anual ? 'Pago anual' : 'Mensual'}</span>
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-800 uppercase tracking-wider">
                Selecciona tu Método de Pago:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMetodoPago('STRIPE')}
                  className={`p-3 border rounded-lg flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                    metodoPago === 'STRIPE'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                      : 'border-[#E7E1D7] text-stone-600 hover:bg-[#FAF8F5]'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Tarjeta Stripe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago('QR')}
                  className={`p-3 border rounded-lg flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                    metodoPago === 'QR'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                      : 'border-[#E7E1D7] text-stone-600 hover:bg-[#FAF8F5]'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR Simple (Bolivia)</span>
                </button>
              </div>
            </div>

            {/* Formulario de Pago según método */}
            {metodoPago === 'STRIPE' ? (
              <div className="p-4 bg-white border border-[#E7E1D7] rounded-lg space-y-3 shadow-xs">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">
                    Número de Tarjeta (Stripe Sandbox)
                  </label>
                  <input
                    type="text"
                    value={datosTarjeta.numero}
                    onChange={(e) => setDatosTarjeta({ ...datosTarjeta, numero: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D5CCC0] rounded-sm focus:outline-none focus:border-stone-900 font-mono tracking-widest"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">Expiración</label>
                    <input
                      type="text"
                      value={datosTarjeta.expiracion}
                      onChange={(e) => setDatosTarjeta({ ...datosTarjeta, expiracion: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-[#D5CCC0] rounded-sm focus:outline-none focus:border-stone-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">CVC</label>
                    <input
                      type="text"
                      value={datosTarjeta.cvc}
                      onChange={(e) => setDatosTarjeta({ ...datosTarjeta, cvc: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-[#D5CCC0] rounded-sm focus:outline-none focus:border-stone-900 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-1">Titular de la Tarjeta</label>
                  <input
                    type="text"
                    value={datosTarjeta.titular}
                    onChange={(e) => setDatosTarjeta({ ...datosTarjeta, titular: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#D5CCC0] rounded-sm focus:outline-none focus:border-stone-900 uppercase text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white border border-[#E7E1D7] rounded-lg text-center space-y-3">
                <p className="text-xs text-stone-600">
                  Escanea con tu aplicación de banca móvil favorita (BCP, BNB, Banco Unión, BMSC):
                </p>
                <div className="w-36 h-36 mx-auto bg-stone-900 p-2 rounded-lg flex items-center justify-center text-white">
                  <QrCode className="w-32 h-32" />
                </div>
                <div className="text-xs text-stone-700 font-semibold">
                  Monto a Transferir: <span className="text-[#9B7B54] text-sm">{montoAPagar} Bs</span>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E1D7]">
              <button
                type="button"
                onClick={() => setPlanAActualizar(null)}
                disabled={pagoProcesando}
                className="px-5 py-2.5 border border-[#D5CCC0] text-xs uppercase tracking-widest text-stone-700 hover:bg-[#FAF8F5]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarPagoYSuscripcion}
                disabled={pagoProcesando}
                className="px-6 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-semibold hover:bg-stone-800 flex items-center gap-2 shadow-md"
              >
                {pagoProcesando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validando Pago Seguro...</span>
                  </>
                ) : (
                  <>
                    <span>Pagar {montoAPagar} Bs y Activar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};
