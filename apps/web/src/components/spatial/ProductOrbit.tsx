import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { BackSide, Color, CylinderGeometry, DoubleSide, Group, MathUtils, MeshBasicMaterial, Texture } from 'three';
import { coutureState } from './coutureState';

export type OrbitItem = { id: string; nombre: string; precio: string; imagen: string };

const RADIUS = 2.7;
const PANEL_H = 1.85;
const RISE = 0.11; // each panel sits a little higher than the previous one: the ribbon climbs like a helix

/** Crops the photo to fill the curved panel without distorting it. */
function cover(texture: Texture, panelAspect: number) {
  const img = texture.image as { width: number; height: number } | undefined;
  if (!img?.width) return;
  const imageAspect = img.width / img.height;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  if (imageAspect > panelAspect) { texture.repeat.x = panelAspect / imageAspect; texture.offset.x = (1 - texture.repeat.x) / 2; }
  else { texture.repeat.y = imageAspect / panelAspect; texture.offset.y = (1 - texture.repeat.y) / 2; }
  texture.needsUpdate = true;
}

function Panel({ item, angle, y, arc, onSelect }: { item: OrbitItem; angle: number; y: number; arc: number; onSelect?: (id: string) => void }) {
  const texture = useTexture(item.imagen);
  const face = useRef<MeshBasicMaterial>(null);
  const hover = useRef(false);
  const geometry = useMemo(() => new CylinderGeometry(RADIUS, RADIUS, PANEL_H, 28, 1, true, -arc / 2, arc), [arc]);
  const dim = useMemo(() => new Color(), []);
  useEffect(() => { texture.colorSpace = 'srgb'; texture.anisotropy = 8; cover(texture, (RADIUS * arc) / PANEL_H); }, [texture, arc]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const m = face.current;
    if (!m) return;
    // The panel facing the viewer is lit; the ones going around the back fall into shadow.
    const front = (Math.cos(angle + coutureState.rotation) + 1) / 2;
    const level = MathUtils.lerp(0.32, 1, Math.pow(front, 1.6)) * (hover.current ? 1.12 : 1);
    m.color.copy(dim.setScalar(Math.min(level, 1.15)));
  });

  return <group
    rotation={[0, angle, 0]}
    position={[0, y, 0]}
    onPointerOver={(e) => { e.stopPropagation(); hover.current = true; document.body.style.cursor = 'pointer'; }}
    onPointerOut={() => { hover.current = false; document.body.style.cursor = ''; }}
    onClick={(e) => { if (e.delta < 6) { e.stopPropagation(); onSelect?.(item.id); } }}
  >
    <mesh geometry={geometry}>
      <meshBasicMaterial ref={face} map={texture} toneMapped={false} />
    </mesh>
    {/* gold back shell: what you see of a panel once it has gone around the rail */}
    <mesh geometry={geometry} scale={1.004}>
      <meshBasicMaterial color="#6f5a37" side={BackSide} toneMapped={false} />
    </mesh>
    {/* gold hairlines on the top and bottom edges */}
    {[PANEL_H / 2, -PANEL_H / 2].map((h) => (
      <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RADIUS - 0.012, RADIUS + 0.012, 28, 1, Math.PI / 2 - arc / 2, arc]} />
        <meshBasicMaterial color="#e6c699" side={DoubleSide} toneMapped={false} />
      </mesh>
    ))}
  </group>;
}

/**
 * The store's real products as a ribbon of curved panels climbing a gold rail.
 * Drag, scroll or wait: the panel facing the viewer lights up, and clicking it opens the product.
 */
export function ProductOrbit({ items, reduced, onSelect }: { items: OrbitItem[]; reduced: boolean; onSelect?: (id: string) => void }) {
  const group = useRef<Group>(null);
  const step = (Math.PI * 2) / items.length;
  const arc = step * 0.93;
  const span = (items.length - 1) * RISE;

  useFrame(({ pointer }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    if (!reduced && !coutureState.dragging) coutureState.spin += dt * 0.16;
    const target = coutureState.spin + (reduced ? 0 : pointer.x * 0.25) + (reduced ? 0 : window.scrollY * 0.0035);
    const g = group.current;
    if (!g) return;
    if (coutureState.snap || reduced) g.rotation.y = target;
    else g.rotation.y += (target - g.rotation.y) * 0.08;
    coutureState.rotation = g.rotation.y;
    const raw = Math.round(-g.rotation.y / step);
    coutureState.setActive(((raw % items.length) + items.length) % items.length);
  });

  return <group position={[0, 0.25, 0]}>
    {/* the rail, with a ring at each end */}
    <mesh><cylinderGeometry args={[0.025, 0.025, span + PANEL_H + 0.7, 12]} /><meshBasicMaterial color="#c5a880" toneMapped={false} /></mesh>
    {[1, -1].map((s) => (
      <mesh key={s} position={[0, s * (span / 2 + PANEL_H / 2 + 0.18), 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RADIUS + 0.05, 0.012, 8, 120]} /><meshBasicMaterial color="#c5a880" transparent opacity={0.7} toneMapped={false} />
      </mesh>
    ))}
    <group ref={group}>
      {items.map((item, i) => <Panel key={item.id} item={item} angle={i * step} y={(i - (items.length - 1) / 2) * RISE} arc={arc} onSelect={onSelect} />)}
    </group>
  </group>;
}
