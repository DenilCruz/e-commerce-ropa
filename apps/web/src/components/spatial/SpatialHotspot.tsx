import { CSSProperties, useState } from 'react';

type Props = { label: string; detail?: string; x: number; y: number; angle?: number; className?: string };

export function SpatialHotspot({ label, detail, x, y, angle = 0, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const style = { left: `${x + Math.sin(angle * Math.PI / 180) * 3}%`, top: `${y}%` } as CSSProperties;
  return <button type="button" className={`spatial-hotspot ${open ? 'is-open' : ''} ${className}`} style={style} onClick={() => setOpen(!open)} aria-expanded={detail ? open : undefined}>
    <span className="spatial-hotspot__point" aria-hidden="true" />
    <span className="spatial-hotspot__label">{label}{open && detail && <span className="spatial-hotspot__detail">{detail}</span>}</span>
  </button>;
}
