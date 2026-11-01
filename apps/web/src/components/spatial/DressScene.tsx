import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import {
  BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide, DynamicDrawUsage, Group, MathUtils, Mesh,
  TubeGeometry, Vector3,
} from 'three';
import { makeProfile } from './profile';

const AROUND = 96;
const UP = 88;
const HEIGHT = 2.7;
const START = -Math.PI / 2; // seam sits at the back centre
// Half-width of the silhouette from hem (v=0) to neckline (v=1): bias-cut slip dress.
const KNOTS: [number, number][] = [[0, 0.8], [0.18, 0.6], [0.42, 0.4], [0.58, 0.3], [0.68, 0.235], [0.8, 0.275], [0.92, 0.255], [1, 0.23]];

const profile = makeProfile(KNOTS);

const neckline = (theta: number) => {
  const s = Math.sin(theta);
  return 1 - 0.1 * Math.pow(Math.max(0, s), 2) - 0.07 * Math.pow(Math.max(0, -s), 2);
};
const depthAt = (v: number) => MathUtils.lerp(0.95, 0.66, MathUtils.smoothstep(v, 0.08, 0.65));

type Grid = { geometry: BufferGeometry; vArr: Float32Array; tArr: Float32Array; baseX: Float32Array; baseY: Float32Array; baseZ: Float32Array };

function buildGrid(): Grid {
  const count = (AROUND + 1) * (UP + 1);
  const baseX = new Float32Array(count), baseY = new Float32Array(count), baseZ = new Float32Array(count);
  const vArr = new Float32Array(count), tArr = new Float32Array(count);
  for (let j = 0; j <= UP; j++) {
    for (let i = 0; i <= AROUND; i++) {
      const theta = START + (i / AROUND) * Math.PI * 2;
      const v = (j / UP) * neckline(theta);
      const r = profile(v);
      const idx = j * (AROUND + 1) + i;
      baseX[idx] = r * Math.cos(theta);
      baseZ[idx] = r * depthAt(v) * Math.sin(theta);
      baseY[idx] = -HEIGHT / 2 + v * HEIGHT;
      vArr[idx] = v;
      tArr[idx] = theta;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < UP; j++) {
    for (let i = 0; i < AROUND; i++) {
      const a = j * (AROUND + 1) + i, b = a + 1, c = a + AROUND + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(count * 3), 3);
  position.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setIndex(indices);
  return { geometry, vArr, tArr, baseX, baseY, baseZ };
}

function strapGeometry(side: 1 | -1) {
  const a = Math.acos(MathUtils.clamp(0.14 / profile(0.9), -1, 1));
  const front = new Vector3(side * 0.14, -HEIGHT / 2 + neckline(a) * HEIGHT - 0.02, profile(0.9) * depthAt(0.9) * Math.sin(a));
  const back = new Vector3(side * 0.14, -HEIGHT / 2 + neckline(-a) * HEIGHT - 0.02, -profile(0.9) * depthAt(0.9) * Math.sin(a));
  const peak = new Vector3(side * 0.16, HEIGHT / 2 + 0.3, 0.02);
  return new TubeGeometry(new CatmullRomCurve3([front, new Vector3(side * 0.15, HEIGHT / 2 + 0.12, front.z * 0.5), peak, new Vector3(side * 0.15, HEIGHT / 2 + 0.1, back.z * 0.5), back]), 40, 0.017, 8);
}

function Dress({ angle, reduced, onSpin }: { angle: number; reduced: boolean; onSpin?: (omega: number) => void }) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const grid = useMemo(buildGrid, []);
  const straps = useMemo(() => [strapGeometry(1), strapGeometry(-1)], []);
  const state = useRef({ current: angle, vel: 0, flare: 0, lag: new Float32Array(UP + 1).fill(MathUtils.degToRad(angle)) });

  useEffect(() => () => { grid.geometry.dispose(); straps.forEach((s) => s.dispose()); }, [grid, straps]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const s = state.current;
    const t = clock.elapsedTime;
    // Spring toward the requested angle along the shortest path: gives swing and overshoot.
    const delta = ((angle - s.current + 540) % 360) - 180;
    if (reduced) { s.current += delta; s.vel = 0; } else {
      s.vel += (delta * 55 - s.vel * 10.5) * dt;
      s.current += s.vel * dt;
    }
    const cur = MathUtils.degToRad(s.current);
    const omega = MathUtils.degToRad(s.vel);
    onSpin?.(omega);
    s.flare += ((reduced ? 0 : Math.min(0.32, Math.abs(omega) * 0.075)) - s.flare) * Math.min(1, dt * 7);
    if (group.current) group.current.rotation.y = cur + (reduced ? 0 : Math.sin(t * 0.45) * 0.035);

    // Each ring trails the body at its own stiffness: the hem lags the most.
    for (let j = 0; j <= UP; j++) {
      const k = MathUtils.lerp(2.4, 17, MathUtils.smoothstep(j / UP, 0.1, 0.75));
      s.lag[j] += (cur - s.lag[j]) * (1 - Math.exp(-dt * k));
    }

    const pos = grid.geometry.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    const breeze = reduced ? 0 : 1;
    for (let j = 0; j <= UP; j++) {
      const twist = reduced ? 0 : (s.lag[j] - cur) * 0.6;
      const cs = Math.cos(twist), sn = Math.sin(twist);
      for (let i = 0; i <= AROUND; i++) {
        const idx = j * (AROUND + 1) + i;
        const v = grid.vArr[idx], th = grid.tArr[idx];
        const hemF = Math.pow(1 - v, 1.4);
        const folds = 0.085 * Math.sin(9 * th + t * 0.7 * breeze + twist * 3) + 0.04 * Math.sin(15 * th - t * 0.9 * breeze);
        const rad = (1 + folds * hemF) * (1 + s.flare * hemF * 1.5);
        const x = grid.baseX[idx] * rad, z = grid.baseZ[idx] * rad;
        arr[idx * 3] = x * cs - z * sn;
        arr[idx * 3 + 1] = grid.baseY[idx] + Math.sin(5 * th + t * 0.8 * breeze) * 0.03 * Math.pow(1 - v, 3) - s.flare * 0.06 * hemF;
        arr[idx * 3 + 2] = x * sn + z * cs;
      }
    }
    pos.needsUpdate = true;
    grid.geometry.computeVertexNormals();
    // Close the seam so shading stays continuous when the dress spins.
    const nrm = grid.geometry.getAttribute('normal') as BufferAttribute;
    for (let j = 0; j <= UP; j++) {
      const a = j * (AROUND + 1), b = a + AROUND;
      const nx = (nrm.getX(a) + nrm.getX(b)) / 2, ny = (nrm.getY(a) + nrm.getY(b)) / 2, nz = (nrm.getZ(a) + nrm.getZ(b)) / 2;
      nrm.setXYZ(a, nx, ny, nz); nrm.setXYZ(b, nx, ny, nz);
    }
    nrm.needsUpdate = true;
  });

  const material = <meshPhysicalMaterial color="#6d7437" roughness={0.36} metalness={0} sheen={1} sheenColor="#d3d89a" sheenRoughness={0.32} clearcoat={0.22} clearcoatRoughness={0.4} side={DoubleSide} />;
  return <group ref={group}>
    <mesh ref={mesh} geometry={grid.geometry} frustumCulled={false}>{material}</mesh>
    {straps.map((geo, i) => <mesh key={i} geometry={geo}>{material}</mesh>)}
  </group>;
}

export type DressSceneProps = { angle: number; reduced: boolean; active: boolean };

export default function DressScene({ angle, reduced, active }: DressSceneProps) {
  return <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 7.8], fov: 32 }} frameloop={active ? 'always' : 'demand'} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.35} />
    <directionalLight position={[-2.5, 3.5, 4]} intensity={1.3} />
    <directionalLight position={[3, 1, -2]} intensity={0.5} color="#ffe2b0" />
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={2.4} position={[-4, 3, 3]} scale={[6, 4, 1]} />
      <Lightformer form="rect" intensity={1.5} position={[4, 1, 2]} scale={[4, 6, 1]} color="#ffe6bd" />
      <Lightformer form="ring" intensity={1.1} position={[0, 5, -4]} scale={5} />
    </Environment>
    <group position={[0, 0.04, 0]}>
      <Dress angle={angle} reduced={reduced} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -HEIGHT / 2 - 0.02, 0]}>
        <ringGeometry args={[1.08, 1.1, 128]} />
        <meshBasicMaterial color="#c5a880" transparent opacity={0.6} />
      </mesh>
      <ContactShadows position={[0, -HEIGHT / 2 - 0.03, 0]} opacity={0.38} scale={4.4} blur={2.6} far={1.4} />
    </group>
  </Canvas>;
}
