import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Sparkles, Store, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../services/auth.api';
import { tiendasApi } from '../../tiendas/services/tiendas.api';
import { useAuthStore } from '../../../store/auth.store';
import { destinoTrasCrearTienda } from '../../tiendas/utils/planes';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser, setAuth } = useAuthStore();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [loading, setLoading] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tiendaPendiente =
    searchParams.get('tienda') || localStorage.getItem('pending_store_name') || '';

  const [creandoTienda, setCreandoTienda] = useState(false);
  const [errorTienda, setErrorTienda] = useState<string | null>(null);

  const ejecutarVerificacion = async (tokenParaVerificar: string) => {
    if (!tokenParaVerificar.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await authApi.verificarEmail({ token: tokenParaVerificar.trim() });
      setMensaje(res.message);
      setVerificado(true);

      if (user) {
        setUser({ ...user, emailVerificado: true });
      }
    } catch (err: any) {
      if (!err.response) {
        setError(
          'No se pudo conectar con el servidor API (http://localhost:3000). Asegúrate de que el backend esté encendido.'
        );
      } else {
        const msg =
          err.response?.data?.message ||
          'Error al verificar el correo electrónico. El enlace puede haber expirado.';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAprovisionarTienda = async () => {
    if (!tiendaPendiente.trim()) return;
    setCreandoTienda(true);
    const planPendiente = searchParams.get('plan') || localStorage.getItem('pending_store_plan') || 'FREE_TRIAL';
    try {
      const res = await tiendasApi.crear({
        nombre: tiendaPendiente.trim(),
        plan: planPendiente,
      });
      localStorage.removeItem('pending_store_name');
      localStorage.removeItem('pending_store_plan');
      localStorage.removeItem('el-magnifico-cart-storage');
      localStorage.setItem('tenant_slug', res.tienda?.slug || 'aura');
      setAuth(res.usuario, res.accessToken, res.refreshToken);
      window.location.assign(destinoTrasCrearTienda(planPendiente));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'No se pudo aprovisionar la tienda automáticamente.';
      setErrorTienda(Array.isArray(msg) ? msg.join(', ') : msg);
      setCreandoTienda(false);
    }
  };

  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken) {
      ejecutarVerificacion(queryToken);
    }
  }, [searchParams]);

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    ejecutarVerificacion(token);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verificando tu cuenta...</h2>
        <p className="text-sm text-gray-500">Por favor espera un momento mientras confirmamos tu correo.</p>
      </div>
    );
  }

  if (verificado) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 font-serif">¡Correo Verificado!</h2>
        <p className="text-sm text-gray-600 mb-6">
          {mensaje || 'Tu cuenta ha sido verificada exitosamente.'}
        </p>

        {tiendaPendiente ? (
          <div className="space-y-4 text-left p-4 bg-[#FAF8F5] border border-[#E7E1D7] rounded-xl mb-4">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <Store className="w-4 h-4 text-[#9B7B54]" />
              <span>Tienda pendiente de aprovisionamiento</span>
            </div>
            <p className="text-xs text-stone-600">
              Marca: <strong className="text-stone-900">{tiendaPendiente}</strong> (Plan Free Trial 14 días).
            </p>

            {errorTienda && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {errorTienda}
              </div>
            )}

            {user ? (
              <Button
                onClick={handleAprovisionarTienda}
                disabled={creandoTienda}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {creandoTienda ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aprovisionando tienda...</span>
                  </>
                ) : (
                  <>
                    <span>Aprovisionar y entrar al Panel Admin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            ) : (
              <Link to={`/login?tienda=${encodeURIComponent(tiendaPendiente)}`}>
                <Button className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <span>Iniciar Sesión para Aprovisionar mi Tienda</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button onClick={() => navigate('/catalogo')} className="w-full">
              Explorar Catálogo de Ropa
            </Button>
            {!user && (
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Iniciar Sesión
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-serif">Verificación de Correo</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ingresa el código recibido en tu correo electrónico para activar tu cuenta
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmitManual}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Token de Verificación</label>
          <Input
            type="text"
            required
            placeholder="Pega el código o token de verificación"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full">
          Confirmar y Activar Cuenta
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
        ¿Deseas volver a la tienda?{' '}
        <Link to="/catalogo" className="text-black font-semibold hover:underline">
          Ir al Catálogo
        </Link>
      </div>
    </div>
  );
};
