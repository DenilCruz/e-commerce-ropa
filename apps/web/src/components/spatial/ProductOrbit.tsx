import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { CanvasTexture, Color, CylinderGeometry, DoubleSide, Group, MathUtils, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { coutureState } from './coutureState';

export type OrbitItem = { id: string; nombre: string; precio: string; imagen: string };

const RADIUS = 2.7;
const PANEL_H = 2.0;
const RISE = 0.06; // each piece sits a touch higher than the previous one, so the carousel climbs gently

/**
 * Paints one piece: the transparent cut-out centred and whole, with a soft contact shadow and nothing
 * else behind it, so the garment is the only thing the carousel shows.
 */
function garmentTexture(img: CanvasImageSource & { width: number; height: number }, panelAspect: number) {
  const H = 1280;
  const W = Math.round(H * panelAspect);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const pad = 0.08;
  const scale = Math.min((W * (1 - pad * 2)) / img.width, (H * (1 - pad * 2)) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = H * 0.04;
  ctx.shadowOffsetY = H * 0.022;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** 0 while the page rests at the top (only the first piece is on stage), 1 once the visitor has started scrolling. */
const revealed = () => MathUtils.smoothstep(coutureState.hero, 0.08, 0.55);

/** A soft pool of shade for the resting piece to stand in. */
function floorShadow() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(128, 64, 0, 128, 64, 128);
  r.addColorStop(0, 'rgba(0,0,0,0.62)');
  r.addColorStop(0.45, 'rgba(0,0,0,0.26)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.setTransform(1, 0, 0, 0.5, 0, 32);
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function Panel({ item, index, angle, y, arc, onSelect }: { item: OrbitItem; index: number; angle: number; y: number; arc: number; onSelect?: (id: string) => void }) {
  const photo = useTexture(item.imagen);
  const face = useRef<MeshBasicMaterial>(null);
  const hover = useRef(false);
  const geometry = useMemo(() => new CylinderGeometry(RADIUS, RADIUS, PANEL_H, 28, 1, true, -arc / 2, arc), [arc]);
  const dim = useMemo(() => new Color(), []);
  const texture = useMemo(() => garmentTexture(photo.image as HTMLImageElement, (RADIUS * arc) / PANEL_H), [photo, arc]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const m = face.current;
    if (!m) return;
    // The panel facing the viewer is lit; the ones going around the back fall into shadow.
    const front = (Math.cos(angle + coutureState.rotation) + 1) / 2;
    const level = MathUtils.lerp(0.32, 1, Math.pow(front, 1.6)) * (hover.current ? 1.12 : 1);
    m.color.copy(dim.setScalar(Math.min(level, 1.15)));
    m.opacity = MathUtils.lerp(0.02, 1, Math.pow(front, 2)) * (index === 0 ? 1 : revealed());
  });

  return <group
    rotation={[0, angle, 0]}
    position={[0, y, 0]}
    onPointerOver={(e) => { if (index !== 0 && revealed() < 0.5) return; e.stopPropagation(); hover.current = true; document.body.style.cursor = 'pointer'; }}
    onPointerOut={() => { hover.current = false; document.body.style.cursor = ''; }}
    onClick={(e) => { if (index !== 0 && revealed() < 0.5) return; if (e.delta < 6) { e.stopPropagation(); onSelect?.(item.id); } }}
  >
    <mesh geometry={geometry}>
      <meshBasicMaterial ref={face} map={texture} side={DoubleSide} toneMapped={false} transparent depthWrite={false} />
    </mesh>
  </group>;
}

/**
 * The store's real products as a carousel of garments, nothing else on stage.
 * Drag, scroll or wait: the piece facing the viewer comes forward, and clicking it opens the product.
 */
export function ProductOrbit({ items, reduced, onSelect }: { items: OrbitItem[]; reduced: boolean; onSelect?: (id: string) => void }) {
  const group = useRef<Group>(null);
  const step = (Math.PI * 2) / items.length;
  const arc = step * 0.93;

  useFrame(({ pointer }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    if (!coutureState.dragging) coutureState.spin += (Math.round(coutureState.spin / step) * step - coutureState.spin) * Math.min(1, dt * 3); // settle on a panel
    // Scrolling through the gallery section brings the next panel to the front, with a short dwell on each one.
    const f = coutureState.run * (items.length - 1);
    const i0 = Math.floor(f);
    const dwell = MathUtils.smoothstep(f - i0, 0.22, 0.78);
    const target = coutureState.spin - (i0 + dwell) * step + (reduced ? 0 : pointer.x * 0.18);
    const g = group.current;
    if (!g) return;
    if (coutureState.snap || reduced) g.rotation.y = target;
    else g.rotation.y += (target - g.rotation.y) * 0.1;
    coutureState.rotation = g.rotation.y;
    const raw = Math.round(-g.rotation.y / step);
    coutureState.setActive(((raw % items.length) + items.length) % items.length);
  });

  const shade = useRef<MeshBasicMaterial>(null);
  const shadeMap = useMemo(floorShadow, []);
  useEffect(() => () => shadeMap.dispose(), [shadeMap]);
  useFrame(() => { if (shade.current) shade.current.opacity = 1 - revealed(); });

  return <group position={[0, -0.05, 0]}>
    <mesh position={[0, -(items.length - 1) / 2 * RISE - PANEL_H * 0.46, RADIUS]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.6, 1.3]} />
      <meshBasicMaterial ref={shade} map={shadeMap} transparent depthWrite={false} toneMapped={false} />
    </mesh>
    <group ref={group}>
      {items.map((item, i) => <Panel key={item.id} item={item} index={i} angle={i * step} y={(i - (items.length - 1) / 2) * RISE} arc={arc} onSelect={onSelect} />)}
    </group>
  </group>;
}
