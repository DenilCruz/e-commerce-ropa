import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NetflixHero } from './NetflixHero';
import { PricingSection } from './PricingSection';
import { LandingNav } from './LandingNav';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../autenticacion/services/auth.api';
import { toast } from 'sonner';
import { ModalCrearTienda } from '../tiendas/components/ModalCrearTienda';
import './landing-spatial.css';

export const LandingSaaSPage: React.FC = () => {
  const { user, isAuthenticated, logout, refreshToken } = useAuthStore();
  const [modalCrear, setModalCrear] = useState(false);

  const activeStoreSlug = (typeof window !== 'undefined' ? localStorage.getItem('tenant_slug') : null) || 'aura';

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      logout();
      toast.success('Sesión cerrada correctamente.');
    }
  };

  return (
    <div className="aura-landing min-h-screen bg-[#FAF8F5] text-stone-900 font-sans selection:bg-[#E7E1D7] selection:text-stone-900">
      <LandingNav
        isAuthenticated={isAuthenticated}
        userName={user?.nombre}
        storeSlug={activeStoreSlug}
        onNewStore={() => setModalCrear(true)}
        onLogout={handleLogout}
      />

      {/* Hero Editorial */}
      <NetflixHero />

      {/* Catálogo de Planes y Precios */}
      <PricingSection />

      {/* Footer Estilo Atelier */}
      <footer className="aura-footer border-t border-[#E7E1D7] bg-white py-12 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex items-center justify-center gap-2 font-serif text-sm tracking-widest uppercase text-stone-800">
            <span>AURA SaaS</span>
            <span className="text-stone-300">·</span>
            <span>Sistemas de Información 2</span>
            <span className="text-stone-300">·</span>
            <span>Metodología ICONIX</span>
          </div>
          <p className="font-light text-stone-500 text-xs">
            Tu tienda de moda en línea y en boutique, con inteligencia artificial que te ayuda a decidir.
          </p>
          <p className="text-[11px] text-stone-400 font-light">
            © {new Date().getFullYear()} AURA Omnichannel Technologies.
          </p>
        </div>
      </footer>

      {/* Modal para Crear Tienda */}
      <ModalCrearTienda
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
      />
    </div>
  );
};
