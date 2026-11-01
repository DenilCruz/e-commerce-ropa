import { Component, lazy, PropsWithChildren, Suspense, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const SilkScene = lazy(() => import('./SilkScene'));
const CoutureScene = lazy(() => import('./CoutureScene'));

class SceneBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function SilkCanvasBackground({ className = '', variant = 'dark', kind = 'cloth' }: { className?: string; variant?: 'dark' | 'light'; kind?: 'cloth' | 'ribbon' | 'couture' }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Start active so the first frame always paints; the observer pauses it when off-screen.
  const [active, setActive] = useState(true);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2');
    setSupported(!!context);
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: '100px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`silk-background silk-background--${variant} ${supported ? 'silk-background--webgl' : ''} ${className}`} aria-hidden="true">
    <div className="silk-background__light" />
    <div className="silk-background__fallback" />
    {supported && <SceneBoundary><Suspense fallback={null}>{kind === 'couture' ? <CoutureScene reduced={reduced} active={active} /> : <SilkScene reduced={reduced} active={active} kind={kind} />}</Suspense></SceneBoundary>}
  </div>;
}
