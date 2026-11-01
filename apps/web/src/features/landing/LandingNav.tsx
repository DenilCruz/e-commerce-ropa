import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LogOut, Plus, Sparkles } from 'lucide-react';
import { Magnetic } from '../../components/spatial';

type Props = {
  isAuthenticated: boolean;
  userName?: string;
  storeSlug: string;
  onNewStore: () => void;
  onLogout: () => void;
};

const LINKS = [
  { id: 'planes', label: 'Tarifas & Planes', href: '#planes' },
  { id: 'probador', label: 'Probador Virtual', to: '/probador', icon: true },
  { id: 'demo', label: 'Tienda Demo', to: '/t/aura' },
] as const;

export const LandingNav: React.FC<Props> = ({ isAuthenticated, userName, storeSlug, onNewStore, onLogout }) => {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <header className="aura-navwrap">
      <nav className="aura-capsule" aria-label="Principal">
        <Link to="/" className="aura-capsule__brand" aria-label="AURA, inicio">
          <span>AURA</span><em>SaaS</em>
        </Link>

        <ul className="aura-capsule__links" onMouseLeave={() => setHover(null)}>
          {LINKS.map((link) => (
            <li key={link.id} onMouseEnter={() => setHover(link.id)}>
              {hover === link.id && <motion.span layoutId="landing-nav-glow" className="aura-capsule__glow" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Magnetic strength={0.2}>
                {'href' in link
                  ? <a href={link.href} className="aura-capsule__link">{link.label}</a>
                  : <Link to={link.to} className="aura-capsule__link">{'icon' in link && <Sparkles aria-hidden="true" />}{link.label}</Link>}
              </Magnetic>
            </li>
          ))}
        </ul>

        <div className="aura-seg">
          {isAuthenticated ? (
            <>
              <span className="aura-seg__user" title={userName}>
                <i>{userName?.charAt(0).toUpperCase() || 'U'}</i><b>{userName || 'Mi cuenta'}</b>
              </span>
              <Magnetic strength={0.18}>
                <button type="button" onClick={onNewStore} className="aura-seg__btn aura-seg__btn--primary" title="Crear una tienda nueva" aria-label="Nueva tienda">
                  <Plus aria-hidden="true" /><span>Nueva tienda</span>
                </button>
              </Magnetic>
              <Magnetic strength={0.18}>
                <Link to={`/t/${storeSlug}`} className="aura-seg__btn aura-hide-sm" title="Ver tienda pública">
                  <span>{storeSlug !== 'aura' ? `Ver tienda (${storeSlug})` : 'Ver tienda'}</span>
                </Link>
              </Magnetic>
              <Magnetic strength={0.18}>
                <Link to="/admin/dashboard" className="aura-seg__btn aura-seg__btn--primary" title="Ir al panel de administración">
                  <span>Admin</span><ArrowRight aria-hidden="true" />
                </Link>
              </Magnetic>
              <button type="button" onClick={onLogout} className="aura-seg__icon" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut aria-hidden="true" /></button>
            </>
          ) : (
            <>
              <Magnetic strength={0.18}><Link to="/login" className="aura-seg__btn"><span>Iniciar sesión</span></Link></Magnetic>
              <Magnetic strength={0.18}>
                <Link to="/registro?crearTienda=true" className="aura-seg__btn aura-seg__btn--primary"><span>Crear tienda</span><ArrowRight aria-hidden="true" /></Link>
              </Magnetic>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
