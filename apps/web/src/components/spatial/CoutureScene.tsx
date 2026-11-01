import { ReactNode, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Group, MathUtils } from 'three';
import { OrbitItem, ProductOrbit } from './ProductOrbit';
import { coutureState } from './coutureState';
import { ease, updateStageProgress } from './galleryProgress';

const Y_HERO = -1.78; // resting height of the gallery under the hero copy
const Y_RUN = 0.4; // centred while the visitor scrolls through the collection
const SCALE_HERO = 0.8;

/**
 * Moves the gallery through the page: small and low under the headline, then centred and large while the
 * visitor scrolls through the collection, then lifted out of view as the plans come in.
 */
function GalleryRig({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    updateStageProgress();
    const g = ref.current;
    if (!g) return;
    const compact = window.innerWidth < 800;
    const e = ease(coutureState.hero);
    const x = ease(coutureState.exit);
    g.position.y = MathUtils.lerp(Y_HERO, compact ? Y_RUN - 0.1 : Y_RUN, e) + x * 5.5;
    g.scale.setScalar(MathUtils.lerp(SCALE_HERO, compact ? 0.95 : 1.3, e) * (1 - 0.2 * x));
  });
  return <group ref={ref}>{children}</group>;
}

/** The landing's 3D stage: only the product gallery. The paper-grid backdrop is plain CSS behind it. */
export default function CoutureScene({ reduced, active, items = [], onSelect }: { reduced: boolean; active: boolean; items?: OrbitItem[]; onSelect?: (id: string) => void }) {
  const frozen = reduced || !active;
  return <Canvas
    camera={{ position: [0, 0, 9], fov: 42 }}
    dpr={[1, 1.75]}
    frameloop={active && !reduced ? 'always' : 'demand'}
    gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    eventSource={typeof document !== 'undefined' ? document.body : undefined}
    eventPrefix="client"
  >
    <GalleryRig>
      {items.length >= 3 && <ProductOrbit items={items} reduced={frozen} onSelect={onSelect} />}
    </GalleryRig>
  </Canvas>;
}
