import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export type ImageSequenceCanvasProps = {
  images: string[];
  alt: string;
  className?: string;
  mode?: 'scroll-scrub' | 'drag-and-hover-orbit';
  controls?: boolean;
  onAngleChange?: (angle: number) => void;
  objectFit?: 'contain' | 'cover';
};

export function ImageSequenceCanvas({ images, alt, className = '', mode = 'drag-and-hover-orbit', controls = false, onAngleChange, objectFit = 'contain' }: ImageSequenceCanvasProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const loaded = useRef<HTMLImageElement[]>([]);
  const state = useRef({ progress: 0.5 });
  const change = useRef(onAngleChange);
  change.current = onAngleChange;
  const [progress, setProgress] = useState(0.5);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  const drag = useRef<{ x: number; progress: number; moved: boolean } | null>(null);
  const multiple = images.length > 1;
  const key = images.filter(Boolean).join('\n');

  const draw = useCallback(() => {
    const el = canvas.current;
    const frames = loaded.current;
    if (!el || !frames.length || !root.current) return;
    const p = state.current.progress;
    const frame = frames[Math.min(frames.length - 1, Math.floor(p * frames.length))];
    const width = root.current.clientWidth;
    const height = root.current.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (el.width !== Math.round(width * dpr) || el.height !== Math.round(height * dpr)) {
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
    }
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const scale = objectFit === 'cover' ? Math.max(width / frame.width, height / frame.height) : Math.min(width / frame.width, height / frame.height);
    const perspective = frames.length === 1 && !reduced ? (p - 0.5) : 0;
    const zoom = 1 + Math.abs(perspective) * 0.035;
    const w = frame.width * scale * zoom;
    const h = frame.height * scale * zoom;
    ctx.drawImage(frame, (width - w) / 2 + perspective * width * 0.035, (height - h) / 2, w, h);
    el.style.transform = `perspective(1000px) rotateY(${perspective * 12}deg)`;
    setProgress(p);
    change.current?.(p * 360);
  }, [objectFit, reduced]);

  const go = useCallback((value: number) => {
    const progress = Math.max(0, Math.min(1, value));
    gsap.killTweensOf(state.current);
    if (reduced) { state.current.progress = progress; draw(); }
    else gsap.to(state.current, { progress, duration: 0.55, ease: 'power3.out', onUpdate: draw });
  }, [draw, reduced]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setFailed(false);
    loaded.current = [];
    const urls = key.split('\n').filter(Boolean);
    // Bounded eager loading; long sequences remain ordered and never create an idle render loop.
    const selected = urls.length > 120 ? urls.filter((_, i) => i % Math.ceil(urls.length / 120) === 0) : urls;
    Promise.all(selected.map(url => new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    }))).then(frames => {
      if (cancelled) return;
      loaded.current = frames.filter((frame): frame is HTMLImageElement => !!frame);
      setReady(loaded.current.length > 0);
      setFailed(loaded.current.length === 0);
      draw();
    });
    const observer = new ResizeObserver(draw);
    if (root.current) observer.observe(root.current);
    return () => { cancelled = true; observer.disconnect(); gsap.killTweensOf(state.current); };
  }, [key, draw]);

  useEffect(() => {
    if (mode !== 'scroll-scrub' || reduced || !root.current) return;
    const tween = gsap.quickTo(state.current, 'progress', { duration: 0.5, ease: 'power3.out', onUpdate: draw });
    const trigger = ScrollTrigger.create({ trigger: root.current, start: 'top 75%', end: 'bottom top', onUpdate: self => tween(self.progress) });
    return () => { trigger.kill(); tween.tween.kill(); };
  }, [mode, reduced, draw]);

  return <div ref={root} className={`image-sequence ${className}`} style={{ '--orbit-progress': progress } as CSSProperties}
    onPointerDown={event => {
      if ((event.target as HTMLElement).closest('input, button')) return;
      drag.current = { x: event.clientX, progress: state.current.progress, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (!root.current) return;
      if (drag.current) {
        const dx = event.clientX - drag.current.x;
        drag.current.moved ||= Math.abs(dx) > 8;
        go(drag.current.progress + dx / root.current.clientWidth);
      } else if (event.pointerType === 'mouse' && mode !== 'scroll-scrub' && !reduced) {
        const box = root.current.getBoundingClientRect();
        go((event.clientX - box.left) / box.width);
      }
    }}
    onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => { drag.current = null; }}
    onClickCapture={event => { if (drag.current?.moved) { event.preventDefault(); event.stopPropagation(); } drag.current = null; }}>
    {!ready && !failed && images[0] && <img className="image-sequence__placeholder" src={images[0]} alt="" style={{ objectFit }} />}
    <canvas ref={canvas} role="img" aria-label={alt} className={ready ? 'is-ready' : ''} />
    {failed && <div className="image-sequence__empty">Imagen no disponible</div>}
    {controls && <div className="image-sequence__controls" data-lenis-prevent>
      <label><span>{multiple ? 'Explorar vistas' : 'Explorar perspectiva'}</span><span>{multiple ? `${Math.round(progress * (images.length - 1)) + 1} / ${images.length}` : 'Vista simulada'}</span>
        <input type="range" min="0" max="100" value={Math.round(progress * 100)} onChange={event => go(Number(event.target.value) / 100)} aria-label={multiple ? 'Ángulo de la secuencia' : 'Perspectiva de la fotografía'} />
      </label>
    </div>}
  </div>;
}
