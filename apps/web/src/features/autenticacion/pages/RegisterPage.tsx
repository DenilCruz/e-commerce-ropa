import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../services/auth.api';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    celular: '',
    ci: '',
  });

  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrores([]);
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
      setRegistroExitoso(true);
    } catch (err: any) {
      if (!err.response) {
        setErrores([
          'No se pudo conectar con el servidor API (http://localhost:3000). Asegúrate de que el backend esté encendido.',
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Registro Exitoso!</h2>
        <p className="text-sm text-gray-600 mb-6">
          {mensajeExito || 'Hemos enviado un correo con el enlace de verificación para activar tu cuenta.'}
        </p>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left text-xs text-blue-800 mb-6 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Revisa tu bandeja de entrada:</span>
          </p>
          <p>Enviamos el correo a <strong>{formData.correo}</strong>.</p>
          <p className="text-blue-600">
            ¿Pruebas en desarrollo? Puedes verificar los logs de envío en{' '}
            <a
              href="https://mailtrap.io/sending/email_logs"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-blue-900"
            >
              Mailtrap Logs
            </a>
          </p>
        </div>

        <Link to="/login">
          <Button className="w-full">Ir al Inicio de Sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Crea tu cuenta</h2>
        <p className="text-sm text-gray-500 mt-1">Regístrate para comprar y gestionar tus pedidos</p>
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

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Apellido</label>
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Correo Electrónico</label>
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña (Mínimo 6 caracteres)</label>
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

        <Button type="submit" className="w-full mt-4" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
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
