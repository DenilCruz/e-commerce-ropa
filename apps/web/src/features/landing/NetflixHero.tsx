import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Layers, WifiOff } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { ModalCrearTienda } from '../tiendas/components/ModalCrearTienda';
import { SilkCanvasBackground, SpatialGlassCard } from '../../components/spatial';

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
    <section className="aura-hero">
      <SilkCanvasBackground className="aura-hero__silk" variant="dark" />
      <div className="aura-hero__inner">
        <div className="aura-hero__title">
          <h1>Crea tu tienda de moda. <em>Escala sin límites con IA.</em></h1>
          <p>Vende en línea y en tu boutique desde un solo lugar, con inteligencia artificial que te ayuda a decidir.</p>
        </div>

        <div className="aura-hero__action">
          <form onSubmit={handleEmpezar} className="aura-hero__form">
            {isAuthenticated ? (
              <input aria-label="Nombre de tu nueva tienda" type="text" placeholder="Nombre de tu nueva tienda (ej. Moda Luna)..." value={nombreTienda} onChange={(e) => setNombreTienda(e.target.value)} />
            ) : (
              <input aria-label="Correo electrónico" type="email" placeholder="Ingresa tu correo electrónico..." value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
            <button type="submit"><span>{isAuthenticated ? 'Crear mi Tienda' : 'Crear Tienda'}</span><ArrowRight aria-hidden="true" /></button>
          </form>
          <div className="aura-hero__proof">
            <span>14 días de prueba gratis</span><span>Sin tarjeta de crédito</span>
            {isAuthenticated ? (
              <button type="button" onClick={() => navigate('/admin/dashboard')}>Ir al Panel Admin de mi tienda actual <ArrowRight aria-hidden="true" /></button>
            ) : (
              <button type="button" onClick={() => navigate('/t/aura')}>Ver tienda de ejemplo <ArrowRight aria-hidden="true" /></button>
            )}
          </div>
        </div>

        <div className="aura-hero__stage" role="group" aria-label="Capacidades de AURA">
          <div className="aura-hero__features">
            <SpatialGlassCard dark strength={1.5} className="aura-feature aura-feature--one">
              <Layers aria-hidden="true" /><div><strong>Todas tus marcas</strong><span>Maneja varias tiendas con un solo correo.</span></div>
            </SpatialGlassCard>
            <SpatialGlassCard dark strength={1.5} className="aura-feature aura-feature--two">
              <Zap aria-hidden="true" /><div><strong>Probador virtual</strong><span>Tus clientes se prueban la ropa antes de comprar.</span></div>
            </SpatialGlassCard>
            <SpatialGlassCard dark strength={1.5} className="aura-feature aura-feature--three">
              <WifiOff aria-hidden="true" /><div><strong>Vende sin internet</strong><span>La caja sigue funcionando y se sincroniza al volver la conexión.</span></div>
            </SpatialGlassCard>
            <SpatialGlassCard dark strength={1.5} className="aura-feature aura-feature--four">
              <ShieldCheck aria-hidden="true" /><div><strong>Datos protegidos</strong><span>Cada tienda guarda su información separada y segura.</span></div>
            </SpatialGlassCard>
          </div>
        </div>
      </div>
      <ModalCrearTienda isOpen={modalCrear} onClose={() => setModalCrear(false)} nombreInicial={nombreTienda} />
    </section>
  );
};
