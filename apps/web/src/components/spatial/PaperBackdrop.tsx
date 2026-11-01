import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * A quiet paper grid fixed behind the page: fine and major rules, a faint grain and a soft light that
 * follows the cursor. Pure CSS, so it costs nothing on the GPU and works on the sign-in screens too.
 */
export function PaperBackdrop({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.style.setProperty('--px', `${e.clientX}px`); el.style.setProperty('--py', `${e.clientY}px`); });
    };
    const scroll = () => el.style.setProperty('--sy', `${window.scrollY}`);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    scroll();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('scroll', scroll); };
  }, [reduced]);

  return <div ref={ref} className={`aura-paper ${className}`} aria-hidden="true" />;
}
