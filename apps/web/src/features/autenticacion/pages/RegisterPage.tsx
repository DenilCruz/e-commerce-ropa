import React, { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Mail,
  AlertCircle,
  Sparkles,
  Store,
  ShoppingBag,
  ArrowRight,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../services/auth.api';

export const RegisterPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const planParam = (
    location.state?.planSeleccionado || searchParams.get('plan') || 'FREE_TRIAL'
  ).toUpperCase();

  const [modo, setModo] = useState<'tienda' | 'cliente'>(
    searchParams.get('cliente') ? 'cliente' : 'tienda'
  );

  const [planActivo, setPlanActivo] = useState<'FREE_TRIAL' | 'ESTANDAR' | 'CORPORATIVO'>(
    planParam === 'ESTANDAR' || planParam === 'CORPORATIVO' ? planParam : 'FREE_TRIAL'
  );

  const [nombreTienda, setNombreTienda] = useState(
    (location.state as any)?.nombreTienda || searchParams.get('tienda') || ''
  );

  const slugPreview = nombreTienda
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: (location.state as any)?.emailPrellenado || searchParams.get('email') || '',
    contrasena: '',
    celular: '',
    ci: '',
  });

  // Pasarela de pago de suscripción
  const [metodoPago, setMetodoPago] = useState<'STRIPE' | 'QR'>('STRIPE');
  const [datosTarjeta, setDatosTarjeta] = useState({
    numero: '4242 •••• •••• 4242',
    expiracion: '12/28',
    cvc: '888',
    titular: '',
  });
  const [transaccionExitosa, setTransaccionExitosa] = useState('');

  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [tokenVerificacion, setTokenVerificacion] = useState('');

  const precioPlan = planActivo === 'CORPORATIVO' ? 499 : planActivo === 'ESTANDAR' ? 199 : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrores([]);

    if (modo === 'tienda') {
      if (!nombreTienda.trim() || nombreTienda.trim().length < 3) {
        setErrores(['El nombre de tu tienda debe tener al menos 3 caracteres.']);
        return;
      }
      localStorage.setItem('pending_store_name', nombreTienda.trim());
      localStorage.setItem('pending_store_plan', planActivo);
    }

    setLoading(true);

    // Si es plan de pago, simular procesamiento en pasarela segura
    if (modo === 'tienda' && planActivo !== 'FREE_TRIAL') {
      await new Promise((r) => setTimeout(r, 1200));
      setTransaccionExitosa(`STR-SUB-${Math.floor(100000 + Math.random() * 900000)}`);
    }

    const payload: {
      nombre: string;
      apellido: string;
      correo: string;
      contrasena: string;
      celular?: string;
      ci?: string;
    } = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      correo: formData.correo.trim(),
      contrasena: formData.contrasena,
    };

    if (formData.celular && formData.celular.trim()) {
      payload.celular = formData.celular.trim();
    }
    if (formData.ci && formData.ci.trim()) {
      payload.ci = formData.ci.trim();
    }

    try {
      const res = await authApi.registro(payload);
      setMensajeExito(res.message);
      if (res.tokenVerificacion) {
        setTokenVerificacion(res.tokenVerificacion);
      }
      setRegistroExitoso(true);
    } catch (err: any) {
      if (!err.response) {
        setErrores([
          'No se pudo conectar con el servidor API. Asegúrate de que el backend esté encendido.',
        ]);
      } else {
        const responseData = err.response.data;
        if (Array.isArray(responseData?.message)) {
          setErrores(responseData.message);
        } else if (typeof responseData?.message === 'string') {
          setErrores([responseData.message]);
        } else {
          setErrores(['Error inesperado al procesar el registro. Inténtalo de nuevo.']);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (registroExitoso) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif">
          {modo === 'tienda' ? '¡Tu Tienda está lista!' : '¡Registro Exitoso!'}
        </h2>
        <p className="text-sm text-gray-600 mb-5">
          {modo === 'tienda'
            ? `Hemos preparado tu cuenta de Administrador para "${nombreTienda}". Solo confirma tu correo para activarla.`
            : (mensajeExito || 'Tu cuenta ha sido creada. Hemos enviado un correo con el enlace de verificación.')}
        </p>

        {modo === 'tienda' && (
          <div className="space-y-2 mb-4">
            {slugPreview && (
              <div className="p-3 bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg text-xs text-stone-700 inline-flex items-center gap-2">
                <span>Enlace reservado:</span>
                <code className="text-[#9B7B54] font-semibold">/t/{slugPreview}</code>
              </div>
            )}

            {planActivo !== 'FREE_TRIAL' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 text-left space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Suscripción Pagada y Aprobada ({precioPlan} Bs)</span>
                </p>
                <p className="text-[11px] text-emerald-700">
                  ID Transacción: <code className="font-mono font-bold">{transaccionExitosa || 'STR-SUB-982143'}</code> · Plan {planActivo}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-left text-xs text-blue-900 mb-5 space-y-2">
          <p className="font-semibold flex items-center gap-1.5 text-sm">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Confirmación de correo</span>
          </p>
          <p>
            Enviamos las instrucciones a <strong>{formData.correo}</strong>. Si estás en entorno local o de evaluación:
          </p>
          {tokenVerificacion && (
            <div className="pt-1">
              <Link
                to={`/verificar-email?token=${tokenVerificacion}${
                  modo === 'tienda' && nombreTienda
                    ? `&tienda=${encodeURIComponent(nombreTienda.trim())}&plan=${encodeURIComponent(planActivo)}`
                    : ''
                }`}
              >
                <Button
                  variant="outline"
                  className="w-full bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold shadow-sm text-xs py-2"
                >
                  ⚡ {modo === 'tienda' ? 'Activar mi cuenta y entrar a mi tienda' : 'Activar mi cuenta directamente'}
                </Button>
              </Link>
            </div>
          )}
        </div>

        <Link
          to={`/login${
            modo === 'tienda' && nombreTienda
              ? `?tienda=${encodeURIComponent(nombreTienda.trim())}&plan=${encodeURIComponent(planActivo)}`
              : ''
          }`}
        >
          <Button className="w-full">Ir al Inicio de Sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Selector de modo: Tienda vs Cliente */}
      <div className="flex border-b border-[#E7E1D7] mb-6">
        <button
          type="button"
          onClick={() => setModo('tienda')}
          className={`flex-1 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
            modo === 'tienda'
              ? 'border-stone-900 text-stone-900 bg-[#FAF8F5]'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Store className="w-4 h-4 text-[#9B7B54]" />
          <span>Crear mi Tienda</span>
        </button>
        <button
          type="button"
          onClick={() => setModo('cliente')}
          className={`flex-1 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
            modo === 'cliente'
              ? 'border-stone-900 text-stone-900 bg-[#FAF8F5]'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Soy Comprador</span>
        </button>
      </div>

      <div className="text-center mb-6">
        {modo === 'tienda' ? (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#E7E1D7] text-xs font-semibold uppercase tracking-wider text-[#9B7B54] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {planActivo === 'CORPORATIVO'
                  ? 'Suscripción: Plan Corporativo (499 Bs/mes)'
                  : planActivo === 'ESTANDAR'
                  ? 'Suscripción: Plan Estándar (199 Bs/mes)'
                  : '14 Días de Prueba Gratis · Plan Free Trial'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-serif">
              Crea tu Tienda en AURA
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {planActivo !== 'FREE_TRIAL'
                ? `Completa tus datos y activa tu suscripción al ${planActivo === 'CORPORATIVO' ? 'Plan Corporativo' : 'Plan Estándar'}.`
                : 'Configura tu marca y accede de inmediato a tu panel de administración.'}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-serif">
              Crea tu cuenta de Cliente
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Regístrate para comprar y gestionar tus pedidos de ropa
            </p>
          </>
        )}
      </div>

      {errores.length > 0 && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>Por favor corrige los siguientes campos:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-red-700">
            {errores.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        {/* Selector de Plan y Nombre de Tienda en Modo Tienda */}
        {modo === 'tienda' && (
          <>
            <div className="p-3.5 bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg space-y-2">
              <label className="block text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#9B7B54]" />
                <span>Nombre de tu Tienda o Marca</span>
              </label>
              <Input
                type="text"
                name="nombreTienda"
                required
                placeholder="Ej. Mi Marca Atelier"
                value={nombreTienda}
                onChange={(e) => setNombreTienda(e.target.value)}
                disabled={loading}
              />
              <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-0.5">
                <span>Enlace único de tu tienda:</span>
                <code className="text-[#9B7B54] font-medium bg-white px-2 py-0.5 border border-[#E7E1D7] rounded">
                  /t/{slugPreview || 'mi-tienda'}
                </code>
              </div>
            </div>

            {/* Selector de Plan interactivo */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-stone-800 uppercase tracking-wider">
                Plan de Suscripción:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPlanActivo('FREE_TRIAL')}
                  className={`p-2.5 text-left border rounded transition-all ${
                    planActivo === 'FREE_TRIAL'
                      ? 'border-stone-900 bg-white ring-1 ring-stone-900'
                      : 'border-[#E7E1D7] bg-[#FAF8F5] text-stone-600 hover:bg-white'
                  }`}
                >
                  <span className="block text-xs font-bold text-stone-900">Free Trial</span>
                  <span className="block text-[11px] text-[#9B7B54] font-medium">0 Bs</span>
                  <span className="block text-[9px] text-stone-400">14 días gratis</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlanActivo('ESTANDAR')}
                  className={`p-2.5 text-left border rounded transition-all ${
                    planActivo === 'ESTANDAR'
                      ? 'border-stone-900 bg-white ring-1 ring-stone-900'
                      : 'border-[#E7E1D7] bg-[#FAF8F5] text-stone-600 hover:bg-white'
                  }`}
                >
                  <span className="block text-xs font-bold text-stone-900">Estándar</span>
                  <span className="block text-[11px] text-[#9B7B54] font-medium">199 Bs/m</span>
                  <span className="block text-[9px] text-stone-400">POS + Sync</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlanActivo('CORPORATIVO')}
                  className={`p-2.5 text-left border rounded transition-all ${
                    planActivo === 'CORPORATIVO'
                      ? 'border-stone-900 bg-white ring-1 ring-stone-900'
                      : 'border-[#E7E1D7] bg-[#FAF8F5] text-stone-600 hover:bg-white'
                  }`}
                >
                  <span className="block text-xs font-bold text-stone-900">Corporativo</span>
                  <span className="block text-[11px] text-[#9B7B54] font-medium">499 Bs/m</span>
                  <span className="block text-[9px] text-stone-400">ML + BI</span>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {modo === 'tienda' ? 'Nombre del Propietario' : 'Nombre'}
            </label>
            <Input
              type="text"
              name="nombre"
              required
              placeholder="Juan"
              value={formData.nombre}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {modo === 'tienda' ? 'Apellido del Propietario' : 'Apellido'}
            </label>
            <Input
              type="text"
              name="apellido"
              required
              placeholder="Pérez"
              value={formData.apellido}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Correo Electrónico {modo === 'tienda' && '(Acceso de Administrador)'}
          </label>
          <Input
            type="email"
            name="correo"
            required
            placeholder="juan.perez@ejemplo.com"
            value={formData.correo}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Contraseña (Mínimo 6 caracteres)
          </label>
          <Input
            type="password"
            name="contrasena"
            required
            minLength={6}
            placeholder="••••••••"
            value={formData.contrasena}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Celular (Opcional)</label>
            <Input
              type="tel"
              name="celular"
              placeholder="77123456"
              value={formData.celular}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">CI (Opcional)</label>
            <Input
              type="text"
              name="ci"
              placeholder="12345678"
              value={formData.ci}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>

        {/* Pasarela de Pago Integrada si es Plan de Pago */}
        {modo === 'tienda' && planActivo !== 'FREE_TRIAL' && (
          <div className="p-4 bg-white border border-[#E7E1D7] rounded-lg space-y-3 shadow-xs mt-2">
            <div className="flex items-center justify-between border-b border-[#E7E1D7] pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-[#9B7B54]" />
                <span>Pasarela de Pago de Suscripción</span>
              </div>
              <span className="text-xs font-bold text-[#9B7B54] bg-[#FAF8F5] px-2 py-0.5 border border-[#E7E1D7] rounded">
                Total: {precioPlan} Bs / mes
              </span>
            </div>

            {/* Selector Tarjeta vs QR */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('STRIPE')}
                className={`py-2 px-3 border rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                  metodoPago === 'STRIPE'
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-[#FAF8F5] text-stone-600 border-[#E7E1D7] hover:bg-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Tarjeta Stripe</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('QR')}
                className={`py-2 px-3 border rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                  metodoPago === 'QR'
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-[#FAF8F5] text-stone-600 border-[#E7E1D7] hover:bg-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Simple (Bolivia)</span>
              </button>
            </div>

            {metodoPago === 'STRIPE' ? (
              <div className="space-y-2 pt-1 text-left">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                    Número de Tarjeta (Stripe Sandbox)
                  </label>
                  <input
                    type="text"
                    value={datosTarjeta.numero}
                    onChange={(e) => setDatosTarjeta({ ...datosTarjeta, numero: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-[#D5CCC0] rounded-sm focus:outline-none focus:border-stone-900 font-mono tracking-widest bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-0.5">Expiración</label>
                    <input
                      type="text"
                      value={datosTarjeta.expiracion}
                      onChange={(e) => setDatosTarjeta({ ...datosTarjeta, expiracion: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-[#D5CCC0] rounded-sm focus:outline-none focus:border-stone-900 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-0.5">CVC</label>
                    <input
                      type="text"
                      value={datosTarjeta.cvc}
                      onChange={(e) => setDatosTarjeta({ ...datosTarjeta, cvc: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-[#D5CCC0] rounded-sm focus:outline-none focus:border-stone-900 font-mono bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#FAF8F5] border border-[#E7E1D7] rounded text-center space-y-2">
                <p className="text-[11px] text-stone-600">Escanea con tu banca móvil (BCP, BNB, Banco Unión):</p>
                <div className="w-24 h-24 mx-auto bg-stone-900 p-2 rounded flex items-center justify-center text-white">
                  <QrCode className="w-20 h-20" />
                </div>
                <p className="text-xs font-semibold text-stone-800">
                  Total a Transferir: <span className="text-[#9B7B54]">{precioPlan} Bs</span>
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="w-full mt-4 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <span>{planActivo !== 'FREE_TRIAL' ? 'Procesando pago y suscripción...' : 'Procesando...'}</span>
          ) : modo === 'tienda' ? (
            <>
              <span>
                {planActivo !== 'FREE_TRIAL'
                  ? `Pagar ${precioPlan} Bs y Crear mi Tienda`
                  : 'Crear mi Tienda (14 días gratis)'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <span>Crear Cuenta</span>
          )}
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
        ¿Ya tienes una cuenta?{' '}
        <Link to="/login" className="text-black font-semibold hover:underline">
          Inicia Sesión
        </Link>
      </div>
    </div>
  );
};
