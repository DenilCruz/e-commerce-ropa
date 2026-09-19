import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export const RegisterPage: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center">Crear Cuenta</h2>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <Input type="text" placeholder="Juan Pérez" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
          <Input type="email" placeholder="usuario@ejemplo.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <Input type="password" placeholder="••••••••" />
        </div>
        <Button type="submit" className="w-full">Registrarse</Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta? <Link to="/login" className="text-black font-semibold">Inicia Sesión</Link>
      </p>
    </div>
  );
};
