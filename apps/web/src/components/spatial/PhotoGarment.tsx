import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, DoubleSide, Group } from 'three';
import type { PhotoGarmentModel } from './garmentFromPhoto';
import { coutureState } from './coutureState';

/** A real product, rebuilt as a volume from its photo, turning on the plinth with fabric sway. */
export function PhotoGarment({ model, reduced }: { model: PhotoGarmentModel; reduced: boolean }) {
  const group = useRef<Group>(null);
  const base = useMemo(() => (model.geometry.getAttribute('position').array as Float32Array).slice(), [model]);
  useEffect(() => () => { model.geometry.dispose(); model.map.dispose(); model.backMap.dispose(); model.bumpMap.dispose(); model.alphaMap.dispose(); }, [model]);

  useFrame(({ clock, pointer }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const t = reduced ? 0 : clock.elapsedTime;
    if (!reduced) {
      if (!coutureState.dragging) coutureState.spin += dt * 0.32; // keeps turning like a showroom turntable
      const target = coutureState.spin + pointer.x * 0.35 + window.scrollY * 0.0035;
      if (group.current) {
        if (coutureState.snap) group.current.rotation.y = coutureState.spin;
        else group.current.rotation.y += (target - group.current.rotation.y) * 0.07;
        group.current.rotation.x += (-pointer.y * 0.05 - group.current.rotation.x) * 0.05;
      }
      const pos = model.geometry.getAttribute('position') as BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let n = 0; n < model.sway.length; n++) {
        const w = model.sway[n];
        if (w < 0.01) continue;
        const x = base[n * 3], y = base[n * 3 + 1], z = base[n * 3 + 2];
        arr[n * 3] = x + Math.sin(y * 1.6 + t * 0.9 + x * 1.2) * 0.015 * w;
        arr[n * 3 + 2] = z + Math.sin(x * 3.2 + y * 1.3 + t * 1.1) * 0.025 * w * Math.sign(z || 1);
      }
      pos.needsUpdate = true;
      model.geometry.computeVertexNormals();
    }
  });

  return <group ref={group}>
    <mesh geometry={model.geometry} frustumCulled={false}>
      <meshPhysicalMaterial attach="material-0" map={model.map} bumpMap={model.bumpMap} bumpScale={3.2} alphaMap={model.alphaMap} alphaTest={0.5} vertexColors color="#efe7da" roughness={0.38} metalness={0} sheen={1} sheenColor="#ffd9c0" sheenRoughness={0.28} clearcoat={0.35} clearcoatRoughness={0.3} envMapIntensity={1.25} side={DoubleSide} />
      <meshPhysicalMaterial attach="material-1" map={model.backMap} alphaMap={model.alphaMap} alphaTest={0.5} vertexColors color="#e4dccf" roughness={0.4} metalness={0} sheen={0.9} sheenColor="#ffe1c2" sheenRoughness={0.35} clearcoat={0.3} clearcoatRoughness={0.35} envMapIntensity={1.1} side={DoubleSide} />
    </mesh>
  </group>;
}
