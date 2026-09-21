import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../services/auth.api';
import { useAuthStore } from '../../../store/auth.store';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [loading, setLoading] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ejecutarVerificacion = async (tokenParaVerificar: string) => {
    if (!tokenParaVerificar.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await authApi.verificarEmail({ token: tokenParaVerificar.trim() });
      setMensaje(res.message);
      setVerificado(true);

      // Si el usuario ya estaba logueado, actualizar el flag local
      if (user) {
        setUser({ ...user, emailVerificado: true });
      }
    } catch (err: any) {
      if (!err.response) {
        setError('No se pudo conectar con el servidor API (http://localhost:3000). Asegúrate de que el backend esté encendido.');
      } else {
        const msg = err.response?.data?.message || 'Error al verificar el correo electrónico. El enlace puede haber expirado.';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setLoading(false);
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
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Correo Verificado!</h2>
        <p className="text-sm text-gray-600 mb-6">
          {mensaje || 'Tu cuenta ha sido verificada exitosamente. Ya puedes disfrutar de todas las funcionalidades.'}
        </p>

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
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Verificación de Correo</h2>
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
