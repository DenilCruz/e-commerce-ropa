import { HTMLAttributes, PointerEvent, ReactNode, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useReducedMotion } from './useReducedMotion';

type Props = Pick<HTMLAttributes<HTMLDivElement>, 'id' | 'role' | 'aria-label'> & {
  children: ReactNode;
  className?: string;
  dark?: boolean;
  /** Maximum tilt on each axis, in degrees. */
  maxTilt?: number;
  /** How far the card rises towards the viewer on hover, in px. */
  lift?: number;
  hoverScale?: number;
  /** Replaces the cursor-lit border with an animated beam that travels around the card. */
  beam?: boolean;
};

/**
 * Glass card with 3D tilt, lift, a cursor spotlight on the surface and border, and inner layers
 * that move forward on hover (see .ispatial in spatial.css). Honors prefers-reduced-motion.
 */
export function InteractiveSpatialCard({ children, className = '', dark = false, maxTilt = 8, lift = 8, hoverScale = 1.025, beam = false, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const spring = { stiffness: 220, damping: 20, mass: 0.5 };
  const rotateX = useSpring(rx, spring);
  const rotateY = useSpring(ry, spring);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== 'mouse') return;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
    if (reduced) return;
    ry.set((x / rect.width - 0.5) * 2 * maxTilt);
    rx.set((0.5 - y / rect.height) * 2 * maxTilt);
  };
  const leave = () => { setHover(false); rx.set(0); ry.set(0); };

  const raised = hover && !reduced;
  return <motion.div
    {...rest}
    ref={ref}
    onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(true); }}
    onPointerMove={move}
    onPointerLeave={leave}
    onFocusCapture={() => setHover(true)}
    onBlurCapture={leave}
    className={`spatial-glass ispatial ${dark ? 'spatial-glass--dark' : ''} ${beam ? 'ispatial--beam' : ''} ${hover ? 'is-hovered' : ''} ${className}`}
    style={{ rotateX, rotateY, transformStyle: 'preserve-3d', transformPerspective: 1000 }}
    animate={{ y: raised ? -lift : 0, scale: raised ? hoverScale : 1 }}
    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
  >
    {children}
  </motion.div>;
}
