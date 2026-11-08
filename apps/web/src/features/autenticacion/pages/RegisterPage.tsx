import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Mail,
  AlertCircle,
  Sparkles,
  Store,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../services/auth.api';
import { guardarAltaPendiente, precioDelPlan, type PeriodoCompra } from '../../tiendas/utils/planes';

export const RegisterPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { slug } = useParams<{ slug?: string }>();

  // Si hay slug en la URL (/t/:slug/registro) o en query params (?slug=...), es una tienda específica
  const storeSlug = slug || searchParams.get('slug') || searchParams.get('tienda_slug') || '';
  const esContextoTienda = Boolean(storeSlug);

  // Modo automático según el contexto:
  // - En contexto de tienda -> exclusivamente 'cliente' (comprador de esa tienda)
  // - En contexto SaaS general -> exclusivamente 'tienda' (creación de nueva tienda)
  const modo: 'tienda' | 'cliente' = esContextoTienda ? 'cliente' : 'tienda';

  useEffect(() => {
    if (esContextoTienda && storeSlug) {
      localStorage.setItem('tenant_slug', storeSlug);
    }
  }, [esContextoTienda, storeSlug]);

  const planParam = (
    (location.state as any)?.planSeleccionado || searchParams.get('plan') || 'FREE_TRIAL'
  ).toUpperCase();

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

  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [tokenVerificacion, setTokenVerificacion] = useState('');

  const periodo: PeriodoCompra = (
    (location.state as any)?.periodo || searchParams.get('periodo') || 'MENSUAL'
  ).toUpperCase() === 'ANUAL'
    ? 'ANUAL'
    : 'MENSUAL';
  const precioPlan = precioDelPlan(planActivo, periodo);
  const unidadPlan = periodo === 'ANUAL' ? 'año' : 'mes';

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
      guardarAltaPendiente({ nombre: nombreTienda, plan: planActivo, periodo });
    }

    setLoading(true);

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
              <div className="p-3 bg-[#FAF8F5] border border-[#E7E1D7] rounded-lg text-xs text-stone-700 text-left space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#9B7B54]" />
                  <span>
                    Falta el pago: {planActivo === 'CORPORATIVO' ? 'Corporativo' : 'Estándar'} · ${precioPlan} por {unidadPlan}
                  </span>
                </p>
                <p className="text-[11px] text-stone-600">
                  Al activar tu cuenta pasas a la pasarela de pago. Tu tienda se crea cuando el pago se aprueba.
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
                    ? `&tienda=${encodeURIComponent(nombreTienda.trim())}&plan=${encodeURIComponent(planActivo)}&periodo=${periodo}`
                    : esContextoTienda
                    ? `&slug=${encodeURIComponent(storeSlug)}`
                    : ''
                }`}
              >
                <Button
                  variant="outline"
                  className="w-full bg-[#FAF8F5] text-stone-900 border-[#E7E1D7] hover:bg-[#F2ECE1] hover:text-[#9B7B54] font-semibold shadow-xs text-xs py-2"
                >
                  {modo === 'tienda' ? 'Activar mi cuenta y entrar a mi tienda' : 'Activar mi cuenta directamente'}
                </Button>
              </Link>
            </div>
          )}
        </div>

        <Link
          to={
            modo === 'tienda' && nombreTienda
              ? `/login?tienda=${encodeURIComponent(nombreTienda.trim())}&plan=${encodeURIComponent(planActivo)}&periodo=${periodo}`
              : esContextoTienda
              ? (slug ? `/t/${storeSlug}/login` : `/login?slug=${storeSlug}`)
              : '/login'
          }
        >
          <Button className="w-full">Ir al Inicio de Sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado según contexto (sin selector de pestañas) */}
      <div className="text-center mb-6">
        {modo === 'tienda' ? (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#E7E1D7] text-xs font-semibold uppercase tracking-wider text-[#9B7B54] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {planActivo === 'CORPORATIVO'
                  ? 'Suscripción: Plan Corporativo ($100/mes)'
                  : planActivo === 'ESTANDAR'
                  ? 'Suscripción: Plan Estándar ($20/mes)'
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#E7E1D7] text-xs font-semibold uppercase tracking-wider text-stone-700 mb-3">
              <Store className="w-3.5 h-3.5 text-[#9B7B54]" />
              <span>Tienda: <strong className="text-stone-900">{storeSlug}</strong></span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-serif">
              Crea tu cuenta de Comprador
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Regístrate para realizar compras y gestionar tus pedidos en esta tienda
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
                  <span className="block text-[11px] text-[#9B7B54] font-medium">$0</span>
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
                  <span className="block text-[11px] text-[#9B7B54] font-medium">$20/m</span>
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
                  <span className="block text-[11px] text-[#9B7B54] font-medium">$100/m</span>
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

        {/* El cobro ocurre en la pasarela, después de verificar el correo: aquí solo se muestra lo que se va a pagar */}
        {modo === 'tienda' && planActivo !== 'FREE_TRIAL' && (
          <div className="p-4 bg-white border border-[#E7E1D7] rounded-lg space-y-1.5 shadow-xs mt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-[#9B7B54]" aria-hidden />
                <span>Tu suscripción</span>
              </div>
              <span className="text-xs font-bold text-[#9B7B54] bg-[#FAF8F5] px-2 py-0.5 border border-[#E7E1D7] rounded">
                ${precioPlan} / {unidadPlan}
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Plan {planActivo === 'CORPORATIVO' ? 'Corporativo' : 'Estándar'}. Primero creamos tu cuenta y confirmas tu correo; después
              pagas en la pasarela y tu tienda se crea en cuanto se aprueba el pago.
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full mt-4 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <span>Creando tu cuenta...</span>
          ) : modo === 'tienda' ? (
            <>
              <span>
                {planActivo !== 'FREE_TRIAL' ? 'Crear mi cuenta y continuar al pago' : 'Crear mi Tienda (14 días gratis)'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <span>Crear Cuenta de Comprador</span>
          )}
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
        ¿Ya tienes una cuenta?{' '}
        <Link
          to={esContextoTienda ? (slug ? `/t/${storeSlug}/login` : `/login?slug=${storeSlug}`) : '/login'}
          className="text-black font-semibold hover:underline"
        >
          Inicia Sesión
        </Link>
        {esContextoTienda && (
          <div className="mt-3 text-xs text-stone-400">
            ¿Quieres vender tus propios productos?{' '}
            <Link to="/registro" className="text-[#9B7B54] hover:underline font-medium">
              Crea tu propia tienda en AURA
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
