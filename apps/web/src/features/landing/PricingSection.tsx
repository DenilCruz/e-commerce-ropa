import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  X,
  Loader2,
  CreditCard,
  ShieldCheck,
  Building2,
  Store,
  ArrowRight,
  Shirt,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { usePlanLimites } from '../tiendas/hooks/usePlanLimites';
import { tiendasApi } from '../tiendas/services/tiendas.api';
import { esDueno } from '../../lib/roles';
import { planesApi } from '../tiendas/services/planes.api';
import { iniciarAltaDeTienda } from '../tiendas/services/alta-tienda';
import { PLAN_NOMBRES_FALLBACK, esBajaDePlan, esPlanDePago, limpiarAltaPendiente, precioDelPlan } from '../tiendas/utils/planes';
import { MiTienda } from '../tiendas/types';
import { Modal } from '../../components/ui/Modal';
import { motion } from 'framer-motion';
import { InteractiveSpatialCard, Magnetic } from '../../components/spatial';

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { metricas, actualizando, cambiarPlan } = usePlanLimites();
  const queryClient = useQueryClient();

  const [anual, setAnual] = useState<boolean>(false);
  const [planAActualizar, setPlanAActualizar] = useState<'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO' | null>(null);

  // Pago del plan: el cobro ocurre en la pasarela (simulada o Stripe); aquí solo se prepara y se redirige
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Quien ya inició sesión pero todavía no tiene tienda: elige plan y pone el nombre de la que va a crear
  const [planNuevaTienda, setPlanNuevaTienda] = useState<'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO' | null>(null);
  const [nombreNuevaTienda, setNombreNuevaTienda] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: misTiendas = [], isSuccess: tiendasListas } = useQuery<MiTienda[]>({
    queryKey: ['mis-tiendas-pricing', user?.id],
    queryFn: tiendasApi.listarMias,
    enabled: !!user,
  });

  // Identificar la tienda que administra el usuario. Un cliente que solo compra no administra ninguna:
  // la tienda activa de su sesión no es suya, así que no se le ofrece cambiar su plan.
  const tiendasAdmin = misTiendas.filter((t) => esDueno(t.rol));
  const tiendaDestino = tiendasAdmin.find((t) => t.esActiva) || tiendasAdmin[0] || (metricas?.tienda && esDueno(user?.rol) ? {
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
      descripcion: 'Prueba lo esencial para vender tu ropa, sin pagar nada al inicio.',
      limites: {
        sucursales: '1 tienda física',
        usuarios: '2 Usuarios / Empleados',
        productos: 'Hasta 30 productos',
      },
      caracteristicas: [
        { texto: 'Tienda en línea lista para celular y computador', incluido: true },
        { texto: 'Bolsa de compras y checkout', incluido: true },
        { texto: 'Probador Virtual con IA básico', incluido: true },
        { texto: 'Punto de Venta (POS) Offline', incluido: false },
        { texto: 'Pregúntale a la IA por tus ventas, hablando', incluido: false },
        { texto: 'Predicción de ventas y análisis de clientes', incluido: false },
        { texto: 'Soporte prioritario 24/7', incluido: false },
      ],
      cta: 'Comenzar Gratis',
      destacado: false,
    },
    {
      id: 'ESTANDAR' as const,
      nombre: 'Plan Estándar',
      subtitulo: 'Para marcas en crecimiento',
      precio: anual ? 16 : 20,
      periodo: anual ? 'USD / mes (facturado anualmente)' : 'USD / mes',
      descripcion: 'Vende omnicanal en boutique física y digital con sincronización offline.',
      limites: {
        sucursales: 'Hasta 3 tiendas físicas',
        usuarios: 'Hasta 10 Usuarios / Empleados',
        productos: 'Hasta 300 productos',
      },
      caracteristicas: [
        { texto: 'Todo lo del plan Free Trial', incluido: true },
        { texto: 'Punto de Venta POS 100% Offline con sync', incluido: true },
        { texto: 'Pregúntale a la IA por tus ventas, hablando', incluido: true },
        { texto: 'Descarga tus reportes en PDF y Excel', incluido: true },
        { texto: 'Cobra con tarjeta y con QR bancario', incluido: true },
        { texto: 'Predicción de lo que vas a vender', incluido: false },
        { texto: 'Grupos de clientes según cómo compran', incluido: false },
      ],
      cta: 'Elegir Estándar',
      destacado: true,
    },
    {
      id: 'CORPORATIVO' as const,
      nombre: 'Plan Corporativo',
      subtitulo: 'Para franquicias y marcas consolidadas',
      precio: anual ? 80 : 100,
      periodo: anual ? 'USD / mes (facturado anualmente)' : 'USD / mes',
      descripcion: 'Inteligencia artificial que anticipa tus ventas, más soporte prioritario todos los días.',
      limites: {
        sucursales: 'Tiendas físicas ilimitadas',
        usuarios: 'Usuarios Ilimitados',
        productos: 'Productos Ilimitados',
      },
      caracteristicas: [
        { texto: 'Todo lo del plan Estándar', incluido: true },
        { texto: 'Sabe qué prendas reponer antes de que se agoten', incluido: true },
        { texto: 'Descubre qué tipo de cliente compra más', incluido: true },
        { texto: 'Paneles claros para dueño, vendedor y cliente', incluido: true },
        { texto: 'Todas las tiendas que quieras, con datos separados', incluido: true },
        { texto: 'Soporte prioritario, todos los días', incluido: true },
        { texto: 'Capacitación personalizada para tu equipo', incluido: true },
      ],
      cta: 'Elegir Corporativo',
      destacado: false,
    },
  ];

  const handleSeleccionarPlan = (planId: 'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO') => {
    if (!isAuthenticated) {
      const periodo = anual ? 'ANUAL' : 'MENSUAL';
      navigate(`/registro?crearTienda=true&plan=${planId}&periodo=${periodo}`, {
        state: { planSeleccionado: planId, crearTienda: true, periodo },
      });
      return;
    }

    if (!tiendaDestino) {
      // Sin la lista de tiendas no se sabe si ya tiene una: no se abre ningún modal todavía
      if (!tiendasListas) {
        toast.info('Estamos cargando tus tiendas. Vuelve a intentarlo en un momento.');
        return;
      }
      setErrorModal(null);
      setNombreNuevaTienda('');
      setPlanNuevaTienda(planId);
      return;
    }

    if (planActualTienda === planId) {
      return;
    }

    setErrorModal(null);
    setPlanAActualizar(planId);
  };

  const planElegidoObj = planes.find((p) => p.id === planAActualizar);
  const montoAPagar = planElegidoObj ? (anual ? planElegidoObj.precio * 12 : planElegidoObj.precio) : 0;
  const esBaja = !!planAActualizar && esBajaDePlan(planActualTienda, planAActualizar);

  // Si la tienda activa en la sesión no es la administrada, se selecciona antes de operar sobre su plan
  const asegurarTiendaActiva = async () => {
    if (tiendaDestino && !tiendaDestino.esActiva) {
      const sesion = await tiendasApi.seleccionar(tiendaDestino.id);
      useAuthStore.getState().setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
      localStorage.setItem('tenant_slug', sesion.tienda?.slug || 'aura');
    }
  };

  const mensajeDeError = (err: any, porDefecto: string) => {
    const msg = err?.response?.data?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg || porDefecto;
  };

  // Subir de plan: se paga en Stripe y el plan lo activa el webhook, no esta pantalla
  const pagarConStripe = async () => {
    if (!esPlanDePago(planAActualizar)) return;
    setProcesando(true);
    setErrorModal(null);
    try {
      await asegurarTiendaActiva();
      const checkout = await planesApi.crearCheckout(planAActualizar, anual ? 'ANUAL' : 'MENSUAL');
      window.location.assign(checkout.url);
    } catch (err) {
      setErrorModal(mensajeDeError(err, 'No se pudo abrir el pago. Inténtalo de nuevo.'));
      setProcesando(false);
    }
  };

  // Crear la primera tienda: gratis al instante, de pago después de aprobar el pago
  const crearPrimeraTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planNuevaTienda) return;
    const nombre = nombreNuevaTienda.trim();
    if (nombre.length < 3) {
      setErrorModal('El nombre de tu tienda debe tener al menos 3 caracteres.');
      return;
    }
    setProcesando(true);
    setErrorModal(null);
    try {
      const resultado = await iniciarAltaDeTienda({ nombre, plan: planNuevaTienda, periodo: anual ? 'ANUAL' : 'MENSUAL' });
      if (resultado.destino === 'PASARELA') {
        window.location.assign(resultado.url);
        return;
      }
      const sesion = resultado.sesion;
      localStorage.removeItem('el-magnifico-cart-storage');
      localStorage.setItem('tenant_slug', sesion.tienda?.slug || 'aura');
      useAuthStore.getState().setAuth(sesion.usuario, sesion.accessToken, sesion.refreshToken);
      window.location.assign('/admin');
    } catch (err) {
      setErrorModal(mensajeDeError(err, 'No se pudo crear tu tienda. Inténtalo de nuevo.'));
      setProcesando(false);
    }
  };

  // Bajar de plan no cuesta nada
  const confirmarBaja = async () => {
    if (!planAActualizar) return;
    setProcesando(true);
    try {
      await asegurarTiendaActiva();
      await cambiarPlan(planAActualizar);
      // La lista de tiendas (con su plan) sigue en caché: se refresca para que la pantalla muestre el plan nuevo
      await queryClient.invalidateQueries({ queryKey: ['mis-tiendas-pricing'] });
      setPlanAActualizar(null);
    } catch {
      // el hook ya muestra el error
    } finally {
      setProcesando(false);
    }
  };

  // Tras crear la tienda con un plan de pago elegido, se abre directamente su pago
  const planElegidoEnUrl = searchParams.get('elegido');
  useEffect(() => {
    if (!isAuthenticated || !tiendaDestino || !esPlanDePago(planElegidoEnUrl)) return;
    const siguiente = new URLSearchParams(searchParams);
    siguiente.delete('elegido');
    setSearchParams(siguiente, { replace: true });
    if (planActualTienda !== planElegidoEnUrl) setPlanAActualizar(planElegidoEnUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, tiendaDestino?.id, planElegidoEnUrl]);

  // Stripe devuelve aquí al cliente que cierra el pago sin completarlo
  useEffect(() => {
    if (searchParams.get('cancelado') === '1') {
      // Walking away from the payment also drops the store asked for at sign-up, so the next login does not reopen it
      limpiarAltaPendiente();
      toast.info('Cancelaste el pago. No se hizo ningún cargo y no se creó ni cambió nada.');
      const siguiente = new URLSearchParams(searchParams);
      siguiente.delete('cancelado');
      setSearchParams(siguiente, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="planes" className="aura-pricing bg-[#FAF8F5] py-20 text-stone-900 border-t border-[#E7E1D7] relative">
      <div className="aura-pricing__content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Encabezado */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-serif text-3xl sm:text-5xl font-normal tracking-wide text-stone-900">
            Planes a la medida de tu boutique
          </h2>
          <p className="text-sm text-stone-600 font-light leading-relaxed">
            Comienza gratis con 14 días de prueba. Crece a tu ritmo y cambia de plan en cualquier momento sin contratos
            forzosos.
          </p>

          {isAuthenticated && tiendaDestino && (
            <div className="pt-1">
              <Magnetic strength={0.12}><div className="aura-store-chip inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E1D7] text-xs text-stone-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tienda para Upgrade: <strong>{tiendaDestino.nombre}</strong></span>
                <span className="text-stone-300">|</span>
                <span className="text-[#9B7B54] font-medium">Plan actual: {planActualTienda}</span>
              </div></Magnetic>
            </div>
          )}

          {/* Selector Mensual / Anual con cápsula deslizante */}
          <div className="pt-4 flex items-center justify-center">
            <div className="aura-billing" role="radiogroup" aria-label="Periodo de facturación">
              {[{ valor: false, etiqueta: 'Mensual' }, { valor: true, etiqueta: 'Anual' }].map((opcion) => (
                <Magnetic key={opcion.etiqueta} strength={0.2}>
                  <button type="button" role="radio" aria-checked={anual === opcion.valor} onClick={() => setAnual(opcion.valor)} className="aura-billing__opt">
                    {anual === opcion.valor && <motion.span layoutId="billing-pill" className="aura-billing__pill" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                    <span className="aura-billing__label">{opcion.etiqueta}</span>
                    {opcion.valor && <span className="aura-billing__save">20% ahorro</span>}
                  </button>
                </Magnetic>
              ))}
            </div>
          </div>
        </div>

        {/* Tarjetas de Precios */}
        <div className="aura-pricing__grid grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {planes.map((plan) => {
            const esPlanActual = Boolean(isAuthenticated && planActualTienda === plan.id);

            return (
              <InteractiveSpatialCard
                key={plan.id}
                dark
                beam
                maxTilt={6}
                lift={12}
                className={`aura-plan-card relative flex flex-col justify-between rounded-[28px] border ${plan.destacado ? 'aura-plan-card--featured' : ''}`}
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
                        {plan.precio === 0 ? 'Gratis' : `$${plan.precio}`}
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
                  <div className="ispatial-z bg-stone-50/80 p-4 rounded-2xl border border-[#E7E1D7] space-y-1.5 text-xs">
                    <p className="font-semibold text-stone-800 text-[10px] uppercase tracking-wider">
                      Lo que incluye:
                    </p>
                    <p className="aura-plan-limit"><Building2 aria-hidden="true" /> {plan.limites.sucursales}</p>
                    <p className="aura-plan-limit"><Users aria-hidden="true" /> {plan.limites.usuarios}</p>
                    <p className="aura-plan-limit"><Shirt aria-hidden="true" /> {plan.limites.productos}</p>
                  </div>

                  {/* Lista de Características */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      Lo que podrás hacer:
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
              </InteractiveSpatialCard>
            );
          })}
        </div>
      </div>

      {/* Cambio de plan: subir va a Stripe; bajar se confirma sin cobro */}
      <Modal
        isOpen={!!planAActualizar}
        onClose={() => {
          if (!procesando) setPlanAActualizar(null);
        }}
        title={esBaja ? 'Cambiar de plan' : 'Pagar tu plan'}
      >
        <div className="space-y-5 text-stone-900">
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Plan para:</p>
              <p className="font-serif text-base font-semibold text-stone-900 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[#9B7B54]" />
                <span>{tiendaDestino?.nombre || 'Mi Tienda'}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-[#9B7B54]">{esBaja ? 'Sin costo' : `$${montoAPagar}`}</span>
              <span className="text-[11px] text-stone-500 block">
                {planElegidoObj?.nombre}
                {!esBaja && (anual ? ' · anual' : ' · mensual')}
              </span>
            </div>
          </div>

          {esBaja ? (
            <div className="space-y-3">
              {planActualTienda && planActualTienda !== 'FREE_TRIAL' && (
                <div role="note" className="p-3.5 bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#9B7B54] shrink-0 mt-0.5" aria-hidden />
                  <p className="text-xs text-stone-700 leading-relaxed">
                    <strong className="text-stone-900">Ya tienes un plan superior ({PLAN_NOMBRES_FALLBACK[planActualTienda] ?? planActualTienda}).</strong>{' '}
                    No hace falta pagar este plan. Si bajas, no se devuelve lo que ya pagaste.
                  </p>
                </div>
              )}
              <p className="text-xs text-stone-600 leading-relaxed">
                Pasar a este plan no tiene costo. Algunas capacidades del plan actual dejarán de estar disponibles y se aplicarán los límites del nuevo
                plan.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-white border border-[#E7E1D7] rounded-lg flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#9B7B54] shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-stone-600 leading-relaxed">
                Pagarás en una página de pago segura; nosotros nunca guardamos los datos de tu tarjeta. Tu plan se activa automáticamente en cuanto se
                confirma el pago y se renueva cada {anual ? 'año' : 'mes'} hasta que canceles la renovación.
              </p>
            </div>
          )}

          {errorModal && (
            <p role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed">
              {errorModal}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-[#E7E1D7]">
            <button
              type="button"
              onClick={() => setPlanAActualizar(null)}
              disabled={procesando}
              className="w-full sm:w-auto px-5 py-2.5 border border-[#D5CCC0] text-xs uppercase tracking-widest text-stone-700 hover:bg-[#FAF8F5]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={esBaja ? confirmarBaja : pagarConStripe}
              disabled={procesando}
              className="w-full sm:w-auto justify-center px-6 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-semibold hover:bg-stone-800 disabled:opacity-60 flex items-center gap-2 shadow-md"
            >
              {procesando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{esBaja ? 'Cambiando…' : 'Abriendo el pago…'}</span>
                </>
              ) : esBaja ? (
                <span>Confirmar cambio</span>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Continuar al pago · ${montoAPagar}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Quien todavía no tiene tienda: el nombre de la que va a crear */}
      <Modal
        isOpen={!!planNuevaTienda}
        onClose={() => {
          if (!procesando) setPlanNuevaTienda(null);
        }}
        title="Crea tu tienda"
      >
        <form onSubmit={crearPrimeraTienda} className="space-y-5 text-stone-900" noValidate>
          {planNuevaTienda && (
            <div className="p-3.5 bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Tu plan</p>
                <p className="font-serif text-base font-semibold text-stone-900">{PLAN_NOMBRES_FALLBACK[planNuevaTienda]}</p>
              </div>
              <span className="text-lg font-bold text-[#9B7B54]">
                {planNuevaTienda === 'FREE_TRIAL'
                  ? 'Gratis 14 días'
                  : `$${precioDelPlan(planNuevaTienda, anual ? 'ANUAL' : 'MENSUAL')} / ${anual ? 'año' : 'mes'}`}
              </span>
            </div>
          )}
          <div>
            <label htmlFor="nombre-nueva-tienda" className="block text-xs font-medium text-stone-700 mb-1">
              Nombre de tu tienda o marca
            </label>
            <input
              id="nombre-nueva-tienda"
              value={nombreNuevaTienda}
              onChange={(e) => setNombreNuevaTienda(e.target.value)}
              placeholder="Ej. Mi Marca Atelier"
              maxLength={100}
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-[#D5CCC0] rounded-sm bg-white text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              {planNuevaTienda === 'FREE_TRIAL'
                ? 'Se crea al instante y entras a tu panel.'
                : 'Después te llevamos al pago. Tu tienda se crea en cuanto se aprueba.'}
            </p>
          </div>
          {errorModal && (
            <p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded p-3">
              {errorModal}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPlanNuevaTienda(null)}
              disabled={procesando}
              className="w-full sm:w-auto px-5 py-2.5 border border-[#D5CCC0] text-xs uppercase tracking-widest text-stone-700 hover:bg-[#FAF8F5]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="w-full sm:w-auto justify-center px-6 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest font-semibold hover:bg-stone-800 disabled:opacity-60 flex items-center gap-2 shadow-md"
            >
              {procesando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden />
                  <span>Un momento…</span>
                </>
              ) : (
                <>
                  <span>{planNuevaTienda === 'FREE_TRIAL' ? 'Crear mi tienda' : 'Continuar al pago'}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
