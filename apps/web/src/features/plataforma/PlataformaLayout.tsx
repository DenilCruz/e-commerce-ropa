import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../autenticacion/services/auth.api';
import { IrATienda } from './components/IrATienda';
import { FOCO } from './components/ui';
import { marcarEntradaATienda } from './lib/acceso';

const PESTANAS = [
  { to: '/plataforma', label: 'Resumen', end: true },
  { to: '/plataforma/tiendas', label: 'Tiendas', end: false },
  { to: '/plataforma/suscripciones', label: 'Suscripciones', end: false },
];

export const PlataformaLayout: React.FC = () => {
  const navigate = useNavigate();
  const { logout, refreshToken, user } = useAuthStore();

  // Back in the console: /admin goes to the console again
  useEffect(() => marcarEntradaATienda(false), []);

  const cerrarSesion = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch (err) {
      console.error('Error al cerrar sesión de la consola:', err);
    } finally {
      logout();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans">
      <header className="bg-[#161513] text-stone-100 border-b border-[#2A2723]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-[10px] font-mono tracking-[0.16em] uppercase text-[#9B7B54]">Operador de plataforma</p>
            <h1 className="font-serif text-xl tracking-wide">Consola de plataforma</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-xs text-stone-400 truncate max-w-[16rem]">{user?.correo}</span>
            <IrATienda />
            <button
              type="button"
              onClick={cerrarSesion}
              className={`flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 font-medium ${FOCO}`}
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav aria-label="Secciones de la consola" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
          {PESTANAS.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              end={p.end}
              className={({ isActive }) =>
                `px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap ${FOCO} ${
                  isActive ? 'border-[#9B7B54] text-white' : 'border-transparent text-stone-400 hover:text-white'
                }`
              }
            >
              {p.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
};
