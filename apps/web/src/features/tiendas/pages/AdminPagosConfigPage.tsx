import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { DatosLiquidacion, pagosConfigApi, StoreAdminPaymentConfig } from '../services/pagos-config.api';

const camposLiquidacion = {
  titularCuenta: 'Nombre del titular',
  banco: 'Banco',
  numeroCuenta: 'Número de cuenta',
};

const formatoSaldo = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' });

const etiquetasMovimiento = {
  QR: 'Venta de prueba por QR',
  STRIPE_PRUEBA: 'Venta con Stripe en modo prueba',
  RETIRO: 'Retiro de prueba',
};

export const AdminPagosConfigPage: React.FC = () => {
  const [configuracion, setConfiguracion] = useState<StoreAdminPaymentConfig | null>(null);
  const [datos, setDatos] = useState<DatosLiquidacion>({ titularCuenta: '', banco: '', numeroCuenta: '' });
  const [guardando, setGuardando] = useState(false);
  const [retirando, setRetirando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [error, setError] = useState('');
  const [errorRetiro, setErrorRetiro] = useState('');
  const [mensaje, setMensaje] = useState('');
  const solicitudRetiro = useRef<string>();

  useEffect(() => {
    let vigente = true;
    pagosConfigApi.obtenerAdmin().then((config) => {
      if (!vigente) return;
      setConfiguracion(config);
      setDatos({
        titularCuenta: config.tienda.titularCuenta ?? '',
        banco: config.tienda.banco ?? '',
        numeroCuenta: config.tienda.numeroCuenta ?? '',
      });
    }).catch(() => {
      if (vigente) setError('No se pudo cargar la configuración de pagos.');
    });
    return () => { vigente = false; };
  }, []);

  const saldo = configuracion?.billeteraSimulada.saldoAcumulado ?? 0;
  const cuentaGuardada = Boolean(
    configuracion?.tienda.titularCuenta?.trim() &&
    configuracion.tienda.banco?.trim() &&
    configuracion.tienda.numeroCuenta?.trim(),
  );

  const guardarDatos = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      setConfiguracion(await pagosConfigApi.actualizarAdmin({
        titularCuenta: datos.titularCuenta.trim(),
        banco: datos.banco.trim(),
        numeroCuenta: datos.numeroCuenta.trim(),
      }));
      setMensaje('Datos de liquidación guardados.');
    } catch (error: any) {
      setError(error.response?.data?.message || 'No se pudieron guardar los datos.');
    } finally {
      setGuardando(false);
    }
  };

  const simularRetiro = async () => {
    if (!cuentaGuardada || saldo <= 0 || retirando) return;
    solicitudRetiro.current ??= crypto.randomUUID();
    setRetirando(true);
    setErrorRetiro('');
    setMensaje('');
    try {
      const retiro = await pagosConfigApi.simularRetiro(solicitudRetiro.current);
      setConfiguracion(await pagosConfigApi.obtenerAdmin());
      solicitudRetiro.current = undefined;
      setModalAbierto(false);
      setMensaje(`Retiro simulado por ${formatoSaldo.format(retiro.monto)}. Comprobante: ${retiro.referencia}. No se transfirió dinero.`);
    } catch (error: any) {
      setErrorRetiro(error.response?.data?.message || 'No se pudo confirmar el retiro simulado. Puedes reintentar.');
    } finally {
      setRetirando(false);
    }
  };

  if (!configuracion) {
    return <p className="p-6" role={error ? 'alert' : 'status'}>{error || 'Cargando configuración de pagos…'}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="font-serif text-3xl text-stone-900">Pagos y liquidaciones</h1>
        <p className="text-sm text-stone-600">El checkout muestra el QR de demostración de AURA. Las compras de prueba generan saldo simulado para {configuracion.tienda.nombre}.</p>
      </header>

      {mensaje && <p role="status" className="break-words rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{mensaje}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}

      <section className="space-y-3 rounded-2xl border border-[#E7E1D7] bg-[#FAF8F5] p-6">
        <h2 className="font-serif text-xl">Saldo simulado disponible</h2>
        <p className="text-2xl font-semibold">{formatoSaldo.format(saldo)}</p>
        <p className="text-sm text-stone-600">Ventas simuladas: {configuracion.billeteraSimulada.totalVentas}</p>
        <p className="text-sm text-stone-600">Ventas aprobadas con Stripe en modo prueba: {formatoSaldo.format(configuracion.billeteraSimulada.totalStripePrueba)}</p>
        <button type="button" disabled={saldo <= 0} onClick={() => { setErrorRetiro(''); setModalAbierto(true); }}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          Solicitar retiro simulado
        </button>
      </section>

      <form onSubmit={guardarDatos} className="space-y-4 rounded-2xl border border-[#E7E1D7] bg-[#FAF8F5] p-6">
        <div>
          <h2 className="font-serif text-xl">Datos para liquidación</h2>
          <p className="text-sm text-stone-600">Estos datos se usan en la simulación de retiro y se guardan de forma privada para la tienda.</p>
        </div>
        {(Object.keys(camposLiquidacion) as Array<keyof DatosLiquidacion>).map((campo) => (
          <label key={campo} className="block space-y-1 text-sm font-medium">
            <span>{camposLiquidacion[campo]}</span>
            <input required maxLength={campo === 'numeroCuenta' ? 50 : campo === 'banco' ? 100 : 150}
              value={datos[campo]} onChange={(evento) => setDatos({ ...datos, [campo]: evento.target.value })}
              className="block w-full rounded-lg border border-[#E7E1D7] bg-white px-3 py-2" />
          </label>
        ))}
        <button type="submit" disabled={guardando}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar datos de liquidación'}
        </button>
      </form>

      <section className="space-y-3 rounded-2xl border border-[#E7E1D7] bg-[#FAF8F5] p-6">
        <h2 className="font-serif text-xl">Movimientos simulados recientes</h2>
        {configuracion.movimientos.length === 0 ? <p className="text-sm text-stone-600">Aún no hay movimientos.</p> : (
          <ul className="divide-y divide-[#E7E1D7]">
            {configuracion.movimientos.map((movimiento) => (
              <li key={movimiento.referencia} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p>{etiquetasMovimiento[movimiento.origen]}</p>
                  <p className="break-all text-xs text-stone-600">{movimiento.referencia}</p>
                </div>
                <div className="text-right">
                  <p>{formatoSaldo.format(movimiento.tipo === 'RETIRO' ? -movimiento.monto : movimiento.monto)}</p>
                  <time dateTime={movimiento.creadoEn} className="text-xs text-stone-600">{new Date(movimiento.creadoEn).toLocaleDateString('es-BO')}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal isOpen={modalAbierto} onClose={() => { if (!retirando) setModalAbierto(false); }} title="Simular liquidación de fondos">
        <div className="space-y-4">
          <p className="text-sm">Saldo disponible: <strong>{formatoSaldo.format(saldo)}</strong>. No se enviará dinero.</p>
          {!cuentaGuardada && <p role="alert" className="text-sm text-amber-900">Guarda el titular, el banco y el número de cuenta para habilitar el retiro simulado.</p>}
          {errorRetiro && <p role="alert" className="text-sm text-rose-800">{errorRetiro}</p>}
          <button type="button" disabled={!cuentaGuardada || saldo <= 0 || retirando} onClick={simularRetiro}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {retirando ? 'Registrando…' : 'Simular retiro'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
