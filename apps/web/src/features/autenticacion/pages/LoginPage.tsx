import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export const LoginPage: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center">Iniciar Sesión</h2>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
          <Input type="email" placeholder="usuario@ejemplo.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <Input type="password" placeholder="••••••••" />
        </div>
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        ¿No tienes cuenta? <Link to="/registro" className="text-black font-semibold">Regístrate</Link>
      </p>
    </div>
  );
};
