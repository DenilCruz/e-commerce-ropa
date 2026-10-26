import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../services/auth.api';
import { tiendasApi } from '../../tiendas/services/tiendas.api';
import { useAuthStore } from '../../../store/auth.store';
import { useCartStore } from '../../../store/cart.store';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authApi.login({ correo, contrasena });
      setAuth(data.usuario, data.accessToken, data.refreshToken);
      useCartStore.getState().sincronizarTrasLogin().catch(console.error);

      // Si había una tienda pendiente de crear en el flujo de registro SaaS
      const tiendaPendiente = searchParams.get('tienda') || localStorage.getItem('pending_store_name');
      const planPendiente = searchParams.get('plan') || localStorage.getItem('pending_store_plan') || 'FREE_TRIAL';
      if (tiendaPendiente && tiendaPendiente.trim() && data.usuario.emailVerificado) {
        try {
          const resTienda = await tiendasApi.crear({
            nombre: tiendaPendiente.trim(),
            plan: planPendiente,
          });
          localStorage.removeItem('pending_store_name');
          localStorage.removeItem('pending_store_plan');
          localStorage.removeItem('el-magnifico-cart-storage');
          localStorage.setItem('tenant_slug', resTienda.tienda?.slug || 'aura');
          setAuth(resTienda.usuario, resTienda.accessToken, resTienda.refreshToken);
          window.location.assign('/admin');
          return;
        } catch (storeErr: any) {
          console.warn('No se pudo auto-crear la tienda tras login:', storeErr);
        }
      }

      if (from) {
        navigate(from, { replace: true });
      } else if (data.usuario.rol === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/catalogo', { replace: true });
      }
    } catch (err: any) {
      if (!err.response) {
        setError('No se pudo conectar con el servidor API (http://localhost:3000). Asegúrate de que el backend esté encendido.');
      } else {
        const msg = err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">¡Bienvenido de nuevo!</h2>
        <p className="text-sm text-gray-500 mt-1">Ingresa a tu cuenta para continuar con tus compras</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
          <Input
            type="email"
            required
            placeholder="juan.perez@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <Link
              to="/recuperar-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            type="password"
            required
            placeholder="••••••••"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
        ¿Aún no tienes una cuenta?{' '}
        <Link to="/registro" className="text-black font-semibold hover:underline">
          Regístrate gratis
        </Link>
      </div>
    </div>
  );
};
