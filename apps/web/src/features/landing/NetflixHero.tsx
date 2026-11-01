import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Layers, WifiOff } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { ModalCrearTienda } from '../tiendas/components/ModalCrearTienda';
import { InteractiveSpatialCard, SilkCanvasBackground } from '../../components/spatial';
import { coutureState } from '../../components/spatial/coutureState';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const ASSETS_URL = API_URL.replace('/api/v1', '');
type HeroDress = { id: string; nombre: string; precio: string; imagen: string };

export const NetflixHero: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const drag = useRef<number | null>(null);
  const [dress, setDress] = useState<HeroDress | null>(null);

  // A real, featured dress from the demo store is rebuilt in 3D from its product photo.
  useEffect(() => {
    let off = false;
    fetch(`${API_URL}/productos`, { headers: { 'X-Tenant-Slug': 'aura' } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: any[]) => {
        if (off || !Array.isArray(list)) return;
        const dresses = list.filter((p) => p.activo !== false && /vestido/i.test(p.nombre) && p.imagenes?.length);
        const pick = dresses.find((p) => p.destacado && /gala/i.test(p.nombre)) || dresses.find((p) => p.destacado) || dresses[0];
        if (!pick) return;
        const img = pick.imagenes.find((i: any) => i.principal) || pick.imagenes[0];
        const path: string = img.url;
        setDress({ id: pick.id, nombre: pick.nombre, precio: pick.precio, imagen: path.startsWith('http') ? path : `${ASSETS_URL}${path.startsWith('/uploads') ? path : `/uploads/${path.replace(/^\//, '')}`}` });
      })
      .catch(() => {});
    return () => { off = true; };
  }, []);

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
      <SilkCanvasBackground className="aura-hero__silk" variant="dark" kind="couture" dressUrl={dress?.imagen} />
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
          onPointerMove={(e) => { if (drag.current !== null) { coutureState.spin += (e.clientX - drag.current) * 0.01; drag.current = e.clientX; } }}
          onPointerUp={() => { drag.current = null; coutureState.dragging = false; }}
          onPointerCancel={() => { drag.current = null; coutureState.dragging = false; }}
        >
          <p className="aura-hero__hint">Arrastra para girar la pieza · 360°</p>
          {dress && (
            <Link to={`/t/aura/producto/${dress.id}`} className="aura-hero__piece" onPointerDown={(e) => e.stopPropagation()}>
              <span>Pieza de la colección</span><strong>{dress.nombre}</strong><em>${Number(dress.precio).toFixed(0)} · Ver en tienda <ArrowRight aria-hidden="true" /></em>
            </Link>
          )}
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
  );
};
