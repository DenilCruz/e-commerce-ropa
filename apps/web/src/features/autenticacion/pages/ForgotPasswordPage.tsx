import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../services/auth.api';
import { Mail, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.recuperarPassword({ correo });
      setMensaje(res.message);
      setEnviado(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar la solicitud.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Revisa tu Correo</h2>
        <p className="text-sm text-gray-600 mb-6">{mensaje}</p>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-left text-xs text-gray-600 mb-6">
          <p>Hemos enviado un enlace seguro para restablecer tu contraseña a <strong>{correo}</strong>.</p>
          <p className="mt-2 text-gray-500">
            El enlace es válido durante 1 hora. Si no lo encuentras, revisa tu carpeta de correo no deseado o spam.
          </p>
        </div>

        <div className="space-y-2">
          <Link to="/login">
            <Button className="w-full">Volver a Iniciar Sesión</Button>
          </Link>
          <button
            onClick={() => setEnviado(false)}
            className="w-full text-xs text-gray-500 hover:text-black py-2"
          >
            Intentar con otro correo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recuperar Contraseña</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico Registrado</label>
          <Input
            type="email"
            required
            placeholder="usuario@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
        ¿Recordaste tu contraseña?{' '}
        <Link to="/login" className="text-black font-semibold hover:underline">
          Inicia Sesión
        </Link>
      </div>
    </div>
  );
};
