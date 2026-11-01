import { Component, KeyboardEvent, PointerEvent, PropsWithChildren, lazy, Suspense, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const DressScene = lazy(() => import('./DressScene'));

class SceneBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

const wrap = (deg: number) => ((deg % 360) + 360) % 360;
export const webglAvailable = () => {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};

export type Dress3DProps = {
  /** Rotation in degrees (0-360). 0 shows the front of the dress. */
  angle: number;
  onAngleChange: (angle: number) => void;
  /** Pauses the render loop while the 3D view is hidden. */
  active?: boolean;
  className?: string;
};

/** Interactive 3D silk dress: drag, use the arrow keys, or drive `angle` from a slider. */
export function Dress3D({ angle, onAngleChange, active = true, className = '' }: Dress3DProps) {
  const reduced = useReducedMotion();
  const [supported] = useState(webglAvailable);
  const drag = useRef<{ x: number; angle: number } | null>(null);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, angle };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onAngleChange(wrap(drag.current.angle + (e.clientX - drag.current.x) * 0.6));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); onAngleChange(wrap(angle - 12)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); onAngleChange(wrap(angle + 12)); }
  };

  if (!supported) return null;
  return <div
    className={`dress-3d ${className}`}
    role="slider"
    tabIndex={0}
    aria-label="Girar vestido en 3D"
    aria-valuemin={0}
    aria-valuemax={360}
    aria-valuenow={Math.round(angle)}
    onPointerDown={down}
    onPointerMove={move}
    onPointerUp={up}
    onPointerCancel={up}
    onKeyDown={key}
  >
    <SceneBoundary><Suspense fallback={null}><DressScene angle={angle} reduced={reduced} active={active} /></Suspense></SceneBoundary>
  </div>;
}
