import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../services/auth.api';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nuevaContrasena.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!token.trim()) {
      setError('El token de seguridad es requerido.');
      return;
    }

    setLoading(true);

    try {
      await authApi.restablecerPassword({
        token: token.trim(),
        nuevaContrasena,
      });
      setExito(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al restablecer la contraseña. El token puede haber expirado.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  if (exito) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          🎉
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Contraseña Restablecida!</h2>
        <p className="text-sm text-gray-600 mb-6">
          Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva clave.
        </p>

        <Button onClick={() => navigate('/login')} className="w-full">
          Iniciar Sesión Ahora
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Nueva Contraseña 🔑</h2>
        <p className="text-sm text-gray-500 mt-1">Elige una contraseña nueva y segura para tu cuenta</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {!searchParams.get('token') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token de Seguridad</label>
            <Input
              type="text"
              required
              placeholder="Pega el código recibido por correo"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (Mínimo 6 caracteres)</label>
          <Input
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            value={nuevaContrasena}
            onChange={(e) => setNuevaContrasena(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
          <Input
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            value={confirmarContrasena}
            onChange={(e) => setConfirmarContrasena(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? 'Guardando nueva contraseña...' : 'Restablecer Contraseña'}
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
        ¿Recordaste tu contraseña anterior?{' '}
        <Link to="/login" className="text-black font-semibold hover:underline">
          Inicia Sesión
        </Link>
      </div>
    </div>
  );
};
