import { HTMLAttributes, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function use3DTilt(strength = 3) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const reset = () => {
    ref.current?.style.setProperty('--tilt-x', '0deg');
    ref.current?.style.setProperty('--tilt-y', '0deg');
  };
  return {
    ref,
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduced || event.pointerType !== 'mouse' || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      ref.current.style.setProperty('--tilt-x', `${(0.5 - y) * strength}deg`);
      ref.current.style.setProperty('--tilt-y', `${(x - 0.5) * strength}deg`);
      ref.current.style.setProperty('--light-x', `${x * 100}%`);
      ref.current.style.setProperty('--light-y', `${y * 100}%`);
    },
    onPointerLeave: reset,
    onBlur: reset,
  };
}

type Props = HTMLAttributes<HTMLDivElement> & { dark?: boolean; strength?: number };

export function SpatialGlassCard({ children, className = '', dark = false, strength = 3, ...props }: Props) {
  const tilt = use3DTilt(strength);
  return <div {...props} {...tilt} className={`spatial-glass ${dark ? 'spatial-glass--dark' : ''} ${className}`}>{children}</div>;
}
