import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Layers, WifiOff } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { ModalCrearTienda } from '../tiendas/components/ModalCrearTienda';
import { InteractiveSpatialCard, SilkCanvasBackground } from '../../components/spatial';
import { coutureState } from '../../components/spatial/coutureState';
import { elegirPrendasCarrusel, type PrendaHero } from './heroPrendas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const ASSETS_URL = API_URL.replace('/api/v1', '');
type HeroItem = PrendaHero;

export const NetflixHero: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const drag = useRef<number | null>(null);
  const [items, setItems] = useState<HeroItem[]>(() => elegirPrendasCarrusel([], ASSETS_URL));
  const [active, setActive] = useState(0);

  // A subscribed store with cut-outs replaces the example. With no subscription, the example stays.
  useEffect(() => {
    let off = false;
    fetch(`${API_URL}/productos`, { headers: { 'X-Tenant-Slug': 'aura' } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown) => { if (!off) setItems(elegirPrendasCarrusel(list, ASSETS_URL)); })
      .catch(() => { if (!off) setItems(elegirPrendasCarrusel([], ASSETS_URL)); });
    return () => { off = true; };
  }, []);
  useEffect(() => coutureState.onActive(setActive), []);
  const piece = items[active] ?? items[0];

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
    <>
    <section className="aura-hero">
      <SilkCanvasBackground className="aura-hero__silk" variant="dark" kind="couture" items={items} onSelectItem={(id) => navigate(id.startsWith('ejemplo-') ? '/t/aura' : `/t/aura/producto/${id}`)} />
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

        <div
          className="aura-hero__stage"
          role="group"
          aria-label="Capacidades de AURA"
          onPointerDown={(e) => { drag.current = e.clientX; coutureState.dragging = true; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (drag.current !== null && coutureState.hero > 0.3) { coutureState.spin += (e.clientX - drag.current) * 0.01; drag.current = e.clientX; } }}
          onPointerUp={() => { drag.current = null; coutureState.dragging = false; }}
          onPointerCancel={() => { drag.current = null; coutureState.dragging = false; }}
        >
          <p className="aura-hero__hint">Desliza para ver la colección</p>
          <div className="aura-hero__features">
            <InteractiveSpatialCard dark className="aura-feature aura-feature--one">
              <Layers aria-hidden="true" /><div><strong>Todas tus marcas</strong><span>Maneja varias tiendas con un solo correo.</span></div>
            </InteractiveSpatialCard>
            <InteractiveSpatialCard dark className="aura-feature aura-feature--two">
              <Zap aria-hidden="true" /><div><strong>Probador virtual</strong><span>Tus clientes se prueban la ropa antes de comprar.</span></div>
            </InteractiveSpatialCard>
            <InteractiveSpatialCard dark className="aura-feature aura-feature--three">
              <WifiOff aria-hidden="true" /><div><strong>Vende sin internet</strong><span>La caja sigue funcionando y se sincroniza al volver la conexión.</span></div>
            </InteractiveSpatialCard>
            <InteractiveSpatialCard dark className="aura-feature aura-feature--four">
              <ShieldCheck aria-hidden="true" /><div><strong>Datos protegidos</strong><span>Cada tienda guarda su información separada y segura.</span></div>
            </InteractiveSpatialCard>
          </div>
        </div>
      </div>
      <ModalCrearTienda isOpen={modalCrear} onClose={() => setModalCrear(false)} nombreInicial={nombreTienda} />
    </section>

    {/* Scrolling through this section turns the gallery: one panel after another, each one large and in focus. */}
    <section id="aura-gallery-run" className="aura-gallery-run" aria-label="Colección" style={{ height: `${Math.max(items.length, 4) * 58}vh` }}>
      {piece && (
        <div className="aura-gallery-run__sticky">
          <p className="aura-gallery-run__count"><b>{String(active + 1).padStart(2, '0')}</b> / {String(items.length).padStart(2, '0')}</p>
          <Link to={piece.ejemplo ? '/t/aura' : `/t/aura/producto/${piece.id}`} className="aura-gallery-run__caption">
            <span>{piece.ejemplo ? 'Ejemplo' : 'Colección AURA'}</span>
            <strong key={piece.id}>{piece.nombre}</strong>
            <em>{piece.ejemplo ? 'Ver tienda de ejemplo' : `$${Number(piece.precio).toFixed(0)} · Ver en tienda`} <ArrowRight aria-hidden="true" /></em>
          </Link>
        </div>
      )}
    </section>
    </>
  );
};
