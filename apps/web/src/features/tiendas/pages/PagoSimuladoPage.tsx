import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CreditCard, Loader2, Lock, QrCode, ShieldAlert } from 'lucide-react';
import { planesApi, type MetodoPagoSimulado } from '../services/planes.api';
import { PLAN_NOMBRES_FALLBACK, expiracionVigente, formatearNumeroDeTarjeta, numeroDeTarjetaValido } from '../utils/planes';

const TARJETAS_DE_PRUEBA = [
  { numero: '4242 4242 4242 4242', resultado: 'Pago aprobado' },
  { numero: '4000 0000 0000 0002', resultado: 'Tarjeta rechazada por el banco' },
  { numero: '4000 0000 0000 9995', resultado: 'Fondos insuficientes' },
  { numero: '4000 0000 0000 0069', resultado: 'Tarjeta vencida' },
];

const dinero = (monto: number) => monto.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const campo =
  'w-full px-3 py-2.5 text-sm border border-[#D5CCC0] rounded-sm bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900';

/**
 * Payment page of the simulated gateway. It looks and behaves like a hosted checkout: the server validates the card,
 * answers approved or declined, and only an approval creates the store (or activates the plan). No money moves.
 */
export const PagoSimuladoPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sesionId = params.get('session_id') ?? '';

  const [metodo, setMetodo] = useState<MetodoPagoSimulado>('TARJETA');
  const [titular, setTitular] = useState('');
  const [numero, setNumero] = useState('');
  const [expiracion, setExpiracion] = useState('');
  const [cvc, setCvc] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const { data: compra, isError, isLoading } = useQuery({
    queryKey: ['compra-simulada', sesionId],
    queryFn: () => planesApi.obtenerEstadoCompra(sesionId),
    enabled: !!sesionId,
    retry: false,
  });

  const validar = (): string[] => {
    if (metodo === 'QR') return [];
    const faltas: string[] = [];
    if (titular.trim().length < 2) faltas.push('Escribe el nombre que aparece en la tarjeta.');
    if (!numeroDeTarjetaValido(numero)) faltas.push('El número de tarjeta no es válido.');
    if (!expiracionVigente(expiracion)) faltas.push('La fecha de vencimiento no es válida o ya pasó. Usa el formato MM/AA.');
    if (!/^\d{3,4}$/.test(cvc.trim())) faltas.push('El código de seguridad debe tener 3 o 4 dígitos.');
    return faltas;
  };

  const pagar = async (e: React.FormEvent) => {
    e.preventDefault();
    setRechazo(null);
    const faltas = validar();
    setErrores(faltas);
    if (faltas.length > 0) return;

    setProcesando(true);
    try {
      await planesApi.pagarSimulado({
        sessionId: sesionId,
        metodo,
        ...(metodo === 'TARJETA' ? { numero, expiracion, cvc, titular } : {}),
      });
      navigate(`/planes/retorno?session_id=${encodeURIComponent(sesionId)}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setRechazo(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo procesar el pago. Inténtalo de nuevo.');
      setProcesando(false);
    }
  };

  const usarTarjetaDePrueba = (n: string) => {
    setMetodo('TARJETA');
    setNumero(n);
    setExpiracion('12/30');
    setCvc('123');
    if (!titular.trim()) setTitular('Cliente de Prueba');
    setErrores([]);
    setRechazo(null);
  };

  const tarjetaVacia = 'max-w-md mx-auto bg-white border border-[#E7E1D7] rounded-2xl p-8 text-center space-y-4';

  if (!sesionId || isError) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4 py-16">
        <div className={tarjetaVacia}>
          <AlertCircle className="w-10 h-10 text-rose-700 mx-auto" aria-hidden />
          <h1 className="font-serif text-2xl text-stone-900">No encontramos esta compra</h1>
          <p className="text-sm text-stone-600">El enlace de pago no es válido o ya no está disponible.</p>
          <Link to="/planes" className="inline-block px-5 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest">
            Ver planes
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading || !compra) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 text-[#9B7B54] animate-spin" aria-hidden />
        <span className="sr-only">Cargando tu compra…</span>
      </main>
    );
  }

  if (compra.estado !== 'PENDIENTE_PAGO') {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4 py-16">
        <div className={tarjetaVacia}>
          <h1 className="font-serif text-2xl text-stone-900">
            {compra.estado === 'ACTIVA' ? 'Esta compra ya está pagada' : 'Esta compra ya no está disponible'}
          </h1>
          <Link
            to={compra.estado === 'ACTIVA' ? `/planes/retorno?session_id=${encodeURIComponent(sesionId)}` : '/planes'}
            className="inline-block px-5 py-2.5 bg-stone-900 text-white text-xs uppercase tracking-widest"
          >
            {compra.estado === 'ACTIVA' ? 'Continuar' : 'Ver planes'}
          </Link>
        </div>
      </main>
    );
  }

  const planNombre = PLAN_NOMBRES_FALLBACK[compra.plan] ?? compra.plan;
  const cadaPeriodo = compra.periodo === 'ANUAL' ? 'año' : 'mes';

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-10 sm:py-16">
      <div className="max-w-4xl mx-auto space-y-6">
        <div
          role="note"
          className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-4 py-3 text-sm"
        >
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
          <p>
            <strong>Modo simulación.</strong> Esta es una pasarela de demostración: no se cobra nada y los datos de la tarjeta no se guardan.
            El resto del proceso funciona igual que con un cobro real.
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_1.3fr] gap-6">
          <section aria-labelledby="resumen" className="bg-white border border-[#E7E1D7] rounded-2xl p-6 space-y-4 h-fit">
            <h1 id="resumen" className="font-serif text-2xl text-stone-900">
              Resumen de tu suscripción
            </h1>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-600">Plan</dt>
                <dd className="font-semibold text-stone-900">{planNombre}</dd>
              </div>
              {compra.nombreTienda && (
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-600">Tienda</dt>
                  <dd className="font-semibold text-stone-900 text-right">{compra.nombreTienda}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-stone-600">Facturación</dt>
                <dd className="text-stone-900">{compra.periodo === 'ANUAL' ? 'Anual' : 'Mensual'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-[#E7E1D7] pt-3 text-base">
                <dt className="font-semibold text-stone-900">Total hoy</dt>
                <dd className="font-bold text-stone-900">{dinero(compra.monto)}</dd>
              </div>
            </dl>
            <p className="text-xs text-stone-600 leading-relaxed">
              Se renueva cada {cadaPeriodo} por {dinero(compra.monto)} hasta que canceles la renovación desde el panel.
              {compra.nombreTienda && <> Tu tienda se crea en cuanto se aprueba el pago.</>}
            </p>
          </section>

          <section aria-labelledby="pago" className="bg-white border border-[#E7E1D7] rounded-2xl p-6 space-y-5">
            <h2 id="pago" className="font-serif text-2xl text-stone-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#9B7B54]" aria-hidden />
              Pago
            </h2>

            <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'TARJETA', texto: 'Tarjeta', Icono: CreditCard },
                  { id: 'QR', texto: 'QR Simple', Icono: QrCode },
                ] as const
              ).map(({ id, texto, Icono }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={metodo === id}
                  onClick={() => setMetodo(id)}
                  className={`py-2.5 px-3 border rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                    metodo === id ? 'bg-stone-900 text-white border-stone-900' : 'bg-[#FAF8F5] text-stone-700 border-[#E7E1D7] hover:bg-white'
                  }`}
                >
                  <Icono className="w-4 h-4" aria-hidden />
                  {texto}
                </button>
              ))}
            </div>

            <form onSubmit={pagar} className="space-y-4" noValidate>
              {metodo === 'TARJETA' ? (
                <>
                  <div>
                    <label htmlFor="titular" className="block text-xs font-medium text-stone-700 mb-1">
                      Nombre en la tarjeta
                    </label>
                    <input id="titular" className={campo} autoComplete="cc-name" value={titular} onChange={(e) => setTitular(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="numero" className="block text-xs font-medium text-stone-700 mb-1">
                      Número de tarjeta
                    </label>
                    <input
                      id="numero"
                      className={`${campo} font-mono tracking-widest`}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="4242 4242 4242 4242"
                      value={numero}
                      onChange={(e) => setNumero(formatearNumeroDeTarjeta(e.target.value))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="expiracion" className="block text-xs font-medium text-stone-700 mb-1">
                        Vencimiento (MM/AA)
                      </label>
                      <input
                        id="expiracion"
                        className={`${campo} font-mono`}
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="12/30"
                        maxLength={7}
                        value={expiracion}
                        onChange={(e) => setExpiracion(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="cvc" className="block text-xs font-medium text-stone-700 mb-1">
                        Código de seguridad
                      </label>
                      <input
                        id="cvc"
                        className={`${campo} font-mono`}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        maxLength={4}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  <details className="text-xs text-stone-700 bg-[#FAF8F5] border border-[#E7E1D7] rounded p-3">
                    <summary className="cursor-pointer font-semibold">Tarjetas de prueba</summary>
                    <ul className="mt-2 space-y-1.5">
                      {TARJETAS_DE_PRUEBA.map((t) => (
                        <li key={t.numero} className="flex items-center justify-between gap-2">
                          <span>
                            <code className="font-mono">{t.numero}</code> · {t.resultado}
                          </span>
                          <button
                            type="button"
                            onClick={() => usarTarjetaDePrueba(t.numero)}
                            className="underline text-[#7A5F3E] hover:text-stone-900 shrink-0"
                          >
                            Usar
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <div className="text-center space-y-3 bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg p-5">
                  <p className="text-sm text-stone-700">Escanea el código con tu banca móvil y transfiere {dinero(compra.monto)}.</p>
                  <img src="/qr_pago_aura.png" alt="Código QR de pago simulado" className="w-40 h-40 mx-auto object-contain bg-white p-2 border border-[#E7E1D7]" />
                  <p className="text-xs text-stone-600">Al confirmar, la simulación da por recibida la transferencia.</p>
                </div>
              )}

              {errores.length > 0 && (
                <ul role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded p-3 space-y-1 list-disc list-inside">
                  {errores.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
              {rechazo && (
                <p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                  <span>{rechazo}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={procesando}
                className="w-full py-3 bg-stone-900 text-white text-xs uppercase tracking-widest font-medium flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-900"
              >
                {procesando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    <span>Procesando con el banco…</span>
                  </>
                ) : metodo === 'QR' ? (
                  <span>Ya hice la transferencia</span>
                ) : (
                  <span>Pagar {dinero(compra.monto)}</span>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-stone-600">
              <Link to="/planes?cancelado=1" className="underline hover:text-stone-900">
                Cancelar y volver a los planes
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};
