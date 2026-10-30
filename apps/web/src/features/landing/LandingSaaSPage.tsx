import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { NetflixHero } from './NetflixHero';
import { PricingSection } from './PricingSection';
import { Sparkles, ArrowRight, LogOut, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../autenticacion/services/auth.api';
import { toast } from 'sonner';
import { ModalCrearTienda } from '../tiendas/components/ModalCrearTienda';

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
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans selection:bg-[#E7E1D7] selection:text-stone-900">
      {/* Barra de Navegación AURA SaaS */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-[#E7E1D7] px-4 sm:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="group flex items-center gap-2">
              <span className="font-serif text-2xl tracking-[0.25em] font-normal uppercase text-stone-900 group-hover:text-[#9B7B54] transition-colors">
                AURA
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#EAE2D5] text-[#9B7B54] border border-[#D5CCC0]">
                SaaS
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-7 text-xs uppercase tracking-widest font-medium text-stone-600">
              <a href="#planes" className="hover:text-stone-900 transition-colors">
                Tarifas & Planes
              </a>
              <Link to="/probador" className="hover:text-stone-900 transition-colors flex items-center gap-1 text-[#9B7B54]">
                <Sparkles className="w-3.5 h-3.5" /> Probador Virtual
              </Link>
              <Link to="/t/aura" className="hover:text-stone-900 transition-colors">
                Tienda Demo
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E1D7] text-xs text-stone-700">
                  <span className="w-5 h-5 rounded-full bg-[#EAE2D5] text-stone-800 flex items-center justify-center text-[10px] font-semibold border border-[#D5CCC0]">
                    {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <span className="font-medium max-w-[120px] truncate">{user?.nombre || 'Mi Cuenta'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCrear(true)}
                  className="px-3.5 py-2 bg-[#9B7B54] hover:bg-[#856642] text-white font-medium text-xs uppercase tracking-widest transition-all shadow-sm flex items-center gap-1"
                  title="Crear una tienda nueva"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Tienda</span>
                </button>
                <Link
                  to={`/t/${activeStoreSlug}`}
                  className="px-3.5 py-2 border border-[#D5CCC0] text-stone-800 hover:border-stone-900 text-xs uppercase tracking-widest font-medium transition-all"
                  title="Ver tienda pública"
                >
                  {activeStoreSlug !== 'aura' ? `Ver Tienda (${activeStoreSlug})` : 'Ver Tienda'}
                </Link>
                <Link
                  to="/admin/dashboard"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5"
                  title="Ir al panel de administración"
                >
                  <span>Admin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-stone-500 hover:text-stone-900 hover:bg-[#F2ECE1] transition-colors border border-transparent hover:border-[#E7E1D7]"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs uppercase tracking-widest font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/registro?crearTienda=true"
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-md"
                >
                  Crear Tienda
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Editorial */}
      <NetflixHero />

      {/* Catálogo de Planes y Precios */}
      <PricingSection />

      {/* Footer Estilo Atelier */}
      <footer className="border-t border-[#E7E1D7] bg-white py-12 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex items-center justify-center gap-2 font-serif text-sm tracking-widest uppercase text-stone-800">
            <span>AURA SaaS</span>
            <span className="text-stone-300">·</span>
            <span>Sistemas de Información 2</span>
            <span className="text-stone-300">·</span>
            <span>Metodología ICONIX</span>
          </div>
          <p className="font-light text-stone-500 text-xs">
            Arquitectura Multi-Tenant con aislamiento por fila en PostgreSQL RLS, React y algoritmos de Machine Learning.
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
