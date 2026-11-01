import { PointerEvent, ReactNode, useRef } from 'react';

/**
 * Hover light for pills and buttons. The label never moves: the wrapper only publishes the cursor
 * position as --mx/--my, and the child's CSS uses it to paint a soft glow behind the text.
 * (`strength` is accepted for backwards compatibility and ignored.)
 */
export function Magnetic({ children, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const move = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return <span ref={ref} className={className} style={{ display: 'inline-flex' }} onPointerMove={move}>{children}</span>;
}
