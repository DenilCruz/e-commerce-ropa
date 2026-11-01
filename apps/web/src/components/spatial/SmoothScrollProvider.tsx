import { PropsWithChildren, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }: PropsWithChildren) {
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  useEffect(() => {
    // Operational screens, touch scrolling and reduced motion retain native behavior.
    if (reduced || pathname.startsWith('/admin') || !window.matchMedia('(pointer: fine)').matches) return;
    const lenis = new Lenis({ duration: 0.85, smoothWheel: true, anchors: true, prevent: node => !!node.closest('[role="dialog"], [data-lenis-prevent]') });
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  }, [reduced, pathname]);
  return <>{children}</>;
}
