import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Layers, WifiOff } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { ModalCrearTienda } from '../tiendas/components/ModalCrearTienda';

export const NetflixHero: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [modalCrear, setModalCrear] = useState(false);

  const handleEmpezar = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      setModalCrear(true);
    } else {
      const q = new URLSearchParams();
      q.set('crearTienda', 'true');
      if (email.trim()) q.set('email', email.trim());
      navigate(`/registro?${q.toString()}`, { state: { emailPrellenado: email, crearTienda: true } });
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#FAF8F5] text-stone-900 pt-20 pb-16 md:pt-28 md:pb-24 border-b border-[#E7E1D7]">
      {/* Luz ambiental sutil y cálida */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] pointer-events-none opacity-40">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#EAE2D5] rounded-full blur-[100px]" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-[#F3ECE1] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
        {/* Badge Pill Editorial */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E7E1D7] text-xs font-semibold uppercase tracking-widest text-[#9B7B54] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#9B7B54]" />
          <span>Infraestructura E-Commerce SaaS Multi-Tienda</span>
        </div>

        {/* Titular Principal */}
        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal tracking-wide text-stone-900 leading-[1.15]">
            Crea tu tienda de moda.{' '}
            <span className="italic text-[#9B7B54]">Escala sin límites</span> con IA.
          </h1>
          <p className="font-serif italic text-lg sm:text-2xl text-stone-500 font-light">
            "Tecnología atelier y omnicanalidad para marcas contemporáneas."
          </p>
        </div>

        {/* Subtítulo Descriptivo */}
        <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Plataforma SaaS multi-tenant con probador virtual en tiempo real, punto de venta 100% offline y reportes
          dinámicos por voz. Gestiona múltiples tiendas con un solo correo y aislamiento absoluto.
        </p>

        {/* Formulario de Inicio Rápido */}
        <form
          onSubmit={handleEmpezar}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto pt-2"
        >
          {isAuthenticated ? (
            <input
              type="text"
              placeholder="Nombre de tu nueva tienda (ej. Moda Luna)..."
              value={nombreTienda}
              onChange={(e) => setNombreTienda(e.target.value)}
              className="w-full sm:flex-1 px-5 py-3.5 rounded-none bg-white border border-[#D5CCC0] text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 text-xs transition-all shadow-sm"
            />
          ) : (
            <input
              type="email"
              placeholder="Ingresa tu correo electrónico..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:flex-1 px-5 py-3.5 rounded-none bg-white border border-[#D5CCC0] text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 text-xs transition-all shadow-sm"
            />
          )}
          <button
            type="submit"
            className="w-full sm:w-auto px-7 py-3.5 rounded-none bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0"
          >
            <span>{isAuthenticated ? 'Crear mi Tienda' : 'Crear Tienda'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-stone-500">
          <span>14 días de prueba gratis</span>
          <span>·</span>
          <span>Sin tarjeta de crédito</span>
          <span>·</span>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="text-[#9B7B54] hover:text-stone-900 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>Ir al Panel Admin de mi tienda actual →</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/t/aura')}
              className="text-[#9B7B54] hover:text-stone-900 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>Ver tienda demo (/t/aura)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Modal para Crear Tienda */}
        <ModalCrearTienda
          isOpen={modalCrear}
          onClose={() => setModalCrear(false)}
          nombreInicial={nombreTienda}
        />

        {/* Pills de características clave estilo Atelier */}
        <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="bg-white border border-[#E7E1D7] p-4 shadow-sm hover:border-stone-900 transition-colors">
            <div className="w-8 h-8 rounded bg-[#FAF8F5] text-[#9B7B54] flex items-center justify-center mb-2.5">
              <Layers className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-stone-900 uppercase tracking-wider">Multi-Tienda</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Un correo, múltiples marcas</p>
          </div>

          <div className="bg-white border border-[#E7E1D7] p-4 shadow-sm hover:border-stone-900 transition-colors">
            <div className="w-8 h-8 rounded bg-[#FAF8F5] text-[#9B7B54] flex items-center justify-center mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-stone-900 uppercase tracking-wider">Probador Virtual</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Lucy 2.5 Realtime AI</p>
          </div>

          <div className="bg-white border border-[#E7E1D7] p-4 shadow-sm hover:border-stone-900 transition-colors">
            <div className="w-8 h-8 rounded bg-[#FAF8F5] text-[#9B7B54] flex items-center justify-center mb-2.5">
              <WifiOff className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-stone-900 uppercase tracking-wider">POS 100% Offline</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Sincronización atómica</p>
          </div>

          <div className="bg-white border border-[#E7E1D7] p-4 shadow-sm hover:border-stone-900 transition-colors">
            <div className="w-8 h-8 rounded bg-[#FAF8F5] text-[#9B7B54] flex items-center justify-center mb-2.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-stone-900 uppercase tracking-wider">Aislamiento RLS</p>
            <p className="text-[11px] text-stone-500 mt-0.5">PostgreSQL Row-Level Security</p>
          </div>
        </div>
      </div>
    </div>
  );
};
