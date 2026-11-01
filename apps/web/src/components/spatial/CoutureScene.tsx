import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import {
  BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, MathUtils, Object3D,
  ShaderMaterial,
} from 'three';
import { makeProfile } from './profile';
import { coutureState } from './coutureState';
import { buildGarmentFromPhoto, PhotoGarmentModel } from './garmentFromPhoto';
import { PhotoGarment } from './PhotoGarment';

const AROUND = 128;
const UP = 96;
const HEIGHT = 3;
const START = -Math.PI / 2; // seam sits at the back centre
const Y = -0.98; // centre of the sculpture inside the hero canvas
const SCALE = 0.9;

// Couture silhouette: fitted bodice, cinched waist, gown opening into a wide hem.
const radius = makeProfile([[0, 1.28], [0.1, 1.0], [0.28, 0.62], [0.46, 0.39], [0.6, 0.265], [0.72, 0.295], [0.86, 0.245], [1, 0.17]]);
// Plunging V at the front, a lower scoop at the back.
const neckline = (theta: number) => {
  const s = Math.sin(theta);
  return 1 - 0.3 * Math.pow(Math.max(0, s), 2.2) - 0.08 * Math.pow(Math.max(0, -s), 2);
};

function buildSculpture() {
  const count = (AROUND + 1) * (UP + 1);
  const base = new Float32Array(count * 3);
  const meta = new Float32Array(count * 2); // v, theta
  for (let j = 0; j <= UP; j++) {
    for (let i = 0; i <= AROUND; i++) {
      const theta = START + (i / AROUND) * Math.PI * 2;
      const v = (j / UP) * neckline(theta);
      const r = radius(v);
      const idx = j * (AROUND + 1) + i;
      const squash = MathUtils.lerp(0.98, 0.7, MathUtils.smoothstep(v, 0.1, 0.62));
      base[idx * 3] = r * Math.cos(theta);
      base[idx * 3 + 1] = -HEIGHT / 2 + v * HEIGHT;
      base[idx * 3 + 2] = r * squash * Math.sin(theta);
      meta[idx * 2] = v;
      meta[idx * 2 + 1] = theta;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < UP; j++) for (let i = 0; i < AROUND; i++) {
    const a = j * (AROUND + 1) + i, b = a + 1, c = a + AROUND + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(count * 3), 3);
  position.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setIndex(indices);

  // Topology contours: every 4th meridian and every 8th ring, sharing the deforming positions.
  const contour: number[] = [];
  for (let i = 0; i < AROUND; i += 4) for (let j = 0; j < UP; j++) { const a = j * (AROUND + 1) + i; contour.push(a, a + AROUND + 1); }
  for (let j = 0; j <= UP; j += 8) for (let i = 0; i < AROUND; i++) { const a = j * (AROUND + 1) + i; contour.push(a, a + 1); }
  const contours = new BufferGeometry();
  contours.setAttribute('position', position);
  contours.setIndex(contour);
  return { geometry, contours, base, meta };
}

function Sculpture({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const { geometry, contours, base, meta } = useMemo(buildSculpture, []);
  useEffect(() => () => { geometry.dispose(); contours.dispose(); }, [geometry, contours]);

  useFrame(({ clock, pointer }, rawDt) => {
    const t = reduced ? 0 : clock.elapsedTime;
    if (!reduced && !coutureState.dragging) coutureState.spin += Math.min(rawDt, 1 / 30) * 0.2;
    const pos = geometry.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let n = 0; n < arr.length / 3; n++) {
      const v = meta[n * 2], th = meta[n * 2 + 1];
      const hem = Math.pow(1 - v, 1.3);
      const back = Math.max(0, -Math.sin(th));
      // Soft swell + sharp pleats (godets) + a ruffled hem + a trailing back.
      const swell = 0.07 * Math.sin(7 * th + t * 0.8 + v * 3.2) + 0.035 * Math.sin(13 * th - t * 1.1 + v * 2);
      const pleat = -0.085 * Math.abs(Math.sin(5.5 * th + t * 0.45 + v * 2.4));
      const ruffle = 0.045 * Math.pow(1 - v, 5) * Math.sin(23 * th + t * 1.4);
      const train = 0.42 * Math.pow(1 - v, 3) * Math.pow(back, 1.4);
      const gather = v > 0.56 && v < 0.78 ? 0.014 * Math.sin(v * 110 + th * 3) : 0;
      const rad = 1 + (swell + pleat) * hem + ruffle + train + gather;
      arr[n * 3] = base[n * 3] * rad;
      arr[n * 3 + 1] = base[n * 3 + 1] + Math.sin(4 * th + t * 0.8) * 0.05 * Math.pow(1 - v, 3);
      arr[n * 3 + 2] = base[n * 3 + 2] * rad;
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    const nrm = geometry.getAttribute('normal') as BufferAttribute;
    for (let j = 0; j <= UP; j++) {
      const a = j * (AROUND + 1), b = a + AROUND;
      const nx = (nrm.getX(a) + nrm.getX(b)) / 2, ny = (nrm.getY(a) + nrm.getY(b)) / 2, nz = (nrm.getZ(a) + nrm.getZ(b)) / 2;
      nrm.setXYZ(a, nx, ny, nz); nrm.setXYZ(b, nx, ny, nz);
    }
    nrm.needsUpdate = true;
    if (group.current && !reduced) {
      // Orbit with the cursor, with the page scroll and by dragging the hero (coutureState.spin).
      const target = coutureState.spin + pointer.x * 0.5 + window.scrollY * 0.0035;
      group.current.rotation.y += (target - group.current.rotation.y) * 0.06;
      group.current.rotation.x += (-pointer.y * 0.06 - group.current.rotation.x) * 0.05;
    }
  });

  return <group ref={group}>
    <mesh geometry={geometry} frustumCulled={false}>
      <meshPhysicalMaterial color="#C5A880" metalness={0.35} roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.2} sheen={0.7} sheenColor="#f1dcb0" sheenRoughness={0.4} envMapIntensity={1.35} side={DoubleSide} />
    </mesh>
    <lineSegments geometry={contours} scale={1.012} frustumCulled={false}>
      <lineBasicMaterial color="#E6C699" transparent opacity={0.4} depthWrite={false} />
    </lineSegments>
  </group>;
}

/** Gold plinth with engraved rings and 360° tick marks, as in the reference. */
function Pedestal() {
  const ticks = useRef<InstancedMesh>(null);
  useEffect(() => {
    const mesh = ticks.current;
    if (!mesh) return;
    const dummy = new Object3D();
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const long = i % 10 === 0;
      dummy.position.set(Math.cos(a) * 1.8, 0.045, Math.sin(a) * 1.8);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(long ? 2.2 : 1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return <group position={[0, -HEIGHT / 2 - 0.1, 0]}>
    <mesh><cylinderGeometry args={[1.95, 2.02, 0.12, 128]} /><meshPhysicalMaterial color="#8c7248" metalness={0.92} roughness={0.28} clearcoat={0.6} /></mesh>
    <mesh position={[0, 0.062, 0]}><cylinderGeometry args={[1.66, 1.66, 0.02, 128]} /><meshPhysicalMaterial color="#14110c" metalness={0.5} roughness={0.14} clearcoat={1} /></mesh>
    <mesh position={[0, 0.075, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.42, 0.012, 8, 160]} /><meshBasicMaterial color="#E6C699" transparent opacity={0.8} /></mesh>
    <mesh position={[0, 0.075, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.12, 0.006, 8, 160]} /><meshBasicMaterial color="#C5A880" transparent opacity={0.5} /></mesh>
    <instancedMesh ref={ticks} args={[undefined, undefined, 120]}><boxGeometry args={[0.012, 0.012, 0.09]} /><meshBasicMaterial color="#E6C699" /></instancedMesh>
  </group>;
}

function Orbits({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const particles = useMemo(() => {
    const n = 140;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ring = i % 2 ? 2.45 : 2.2;
      const a = (i / n) * Math.PI * 2 * 4.3;
      arr[i * 3] = Math.cos(a) * ring + Math.sin(i * 12.9898) * 0.07;
      arr[i * 3 + 1] = Math.sin(i * 78.233) * 0.16;
      arr[i * 3 + 2] = Math.sin(a) * ring;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame(({ clock, pointer }) => {
    if (!group.current || reduced) return;
    group.current.rotation.y = clock.elapsedTime * 0.16;
    group.current.rotation.x = 0.1 + pointer.y * 0.12;
    group.current.rotation.z = -pointer.x * 0.1;
  });
  return <group ref={group} position={[0, -HEIGHT / 2 + 0.25, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.2, 0.007, 8, 180]} /><meshBasicMaterial color="#E6C699" transparent opacity={0.6} /></mesh>
    <mesh rotation={[Math.PI / 2 + 0.22, 0.1, 0]}><torusGeometry args={[2.45, 0.005, 8, 180]} /><meshBasicMaterial color="#C5A880" transparent opacity={0.4} /></mesh>
    <points geometry={particles}><pointsMaterial color="#F2DDB2" size={0.06} sizeAttenuation transparent opacity={0.95} depthWrite={false} /></points>
  </group>;
}

const ribbonVertex = `
uniform float uTime;
uniform float uPhase;
uniform float uWidth;
uniform float uLoop;
varying vec3 vView;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec2 vUv;
vec3 centre(float s, float t) {
  float x = (s - 0.5) * 26.0;
  float y = sin(s * 4.2 + t) * 1.05 + sin(s * 9.0 - t * 1.3) * 0.22;
  float z = sin(s * 5.3 + t * 1.1) * 1.1 + cos(s * 2.1 - t) * 0.5;
  // an occasional loop, like a ribbon unrolled in the wind
  float loopy = uLoop * exp(-pow((s - 0.5) * 7.0, 2.0));
  return vec3(x, y + loopy * sin(s * 30.0) * 0.5, z + loopy * cos(s * 30.0) * 0.5);
}
void ribbon(vec2 uv, out vec3 p, out vec3 tangent, out vec3 normal) {
  float t = uTime * 0.3 + uPhase;
  vec3 c = centre(uv.x, t);
  tangent = normalize(centre(uv.x + 0.002, t) - centre(uv.x - 0.002, t));
  vec3 up = abs(tangent.y) > 0.92 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 n0 = normalize(cross(tangent, up));
  vec3 b0 = cross(tangent, n0);
  float tw = sin(uv.x * 3.1 + t) * 1.25 + sin(uv.x * 7.3 - t * 1.4) * 0.45;
  vec3 side = n0 * cos(tw) + b0 * sin(tw);
  float w = (uv.y - 0.5) * uWidth;
  // soft creases that run along the ribbon, strongest where it bends
  float crease = sin(uv.x * 46.0 + uv.y * 5.0 + t * 1.6) * 0.018 + sin(uv.x * 13.0 - t) * 0.03 * smoothstep(0.35, 0.5, abs(sin(uv.x * 3.1 + t)));
  normal = normalize(cross(tangent, side));
  p = c + side * w + normal * crease;
}
void main() {
  vUv = uv;
  vec3 p, t, n;
  ribbon(uv, p, t, n);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = -mv.xyz;
  vNormal = normalize(normalMatrix * n);
  vTangent = normalize(normalMatrix * t);
  gl_Position = projectionMatrix * mv;
}`;
const ribbonFragment = `
uniform vec3 uBase;
uniform vec3 uHem;
uniform vec3 uSpecTint;
uniform float uFade;
varying vec3 vView;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec2 vUv;
float aniso(vec3 T, vec3 L, vec3 V, float power) {
  vec3 H = normalize(L + V);
  float th = dot(T, H);
  return pow(sqrt(max(0.0, 1.0 - th * th)), power);
}
void main() {
  vec3 N = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 V = normalize(vView);
  vec3 T = normalize(vTangent);
  vec3 key = normalize(vec3(-0.5, 0.9, 1.2));
  vec3 rim = normalize(vec3(0.9, 0.2, -0.6));
  float diffuse = max(dot(N, key), 0.0);
  float wrap = max(dot(N, key) * 0.5 + 0.5, 0.0);
  float sat1 = aniso(T, key, V, 70.0) * smoothstep(0.0, 0.3, diffuse + 0.12);
  float sat2 = aniso(T, rim, V, 40.0) * 0.5;
  float fres = pow(1.0 - abs(dot(N, V)), 2.4);
  float weave = 0.965 + 0.035 * sin(vUv.x * 1800.0) * sin(vUv.y * 90.0);
  float sheet = 0.5 + 0.5 * sin(vUv.x * 14.0 + N.z * 2.2 + N.y * 1.4);
  vec3 col = uBase * (0.16 + wrap * 0.78) * mix(0.78, 1.18, sheet) * weave;
  col += uSpecTint * (sat1 * 0.95 + sat2 * 0.35);
  col += uBase * fres * 0.55;
  // woven selvedge: a lighter band, a thin gold stitch line and a dashed stitch
  float d = abs(vUv.y - 0.5) * 2.0;
  float band = smoothstep(0.80, 0.84, d) * (1.0 - smoothstep(0.97, 1.0, d));
  float stitch = smoothstep(0.855, 0.865, d) * (1.0 - smoothstep(0.88, 0.89, d)) * step(0.5, fract(vUv.x * 520.0));
  col = mix(col, uHem * (0.4 + wrap * 0.7), band * 0.65);
  col += uHem * stitch * 0.5;
  float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
  gl_FragColor = vec4(col, edge * uFade);
}`;

type RibbonSpec = { base: [number, number, number]; hem: [number, number, number]; spec: [number, number, number]; width: number; phase: number; y: number; z: number; loop: number };
const RIBBONS: RibbonSpec[] = [
  { base: [0.82, 0.66, 0.42], hem: [0.98, 0.86, 0.58], spec: [1.0, 0.92, 0.74], width: 0.95, phase: 0, y: 0.55, z: 0.1, loop: 1 },
  { base: [0.07, 0.07, 0.085], hem: [0.76, 0.6, 0.36], spec: [0.7, 0.7, 0.85], width: 0.8, phase: 2.4, y: -0.1, z: -0.7, loop: 0 },
  { base: [0.62, 0.07, 0.1], hem: [0.95, 0.78, 0.5], spec: [1.0, 0.7, 0.62], width: 0.5, phase: 4.1, y: -0.75, z: 0.5, loop: 1 },
];

const scrollProgress = () => (typeof window === 'undefined' ? 0 : MathUtils.clamp(window.scrollY / (window.innerHeight * 0.85), 0, 1));

/** Lifts the showpiece away as the page scrolls toward the plans, while the ribbons keep flowing behind them. */
function Rig({ children, lift, scaleTo }: { children: React.ReactNode; lift: number; scaleTo: number }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const p = scrollProgress();
    const e = p * p * (3 - 2 * p);
    ref.current.position.y = e * lift;
    ref.current.scale.setScalar(MathUtils.lerp(1, scaleTo, e));
  });
  return <group ref={ref}>{children}</group>;
}

function Ribbon({ spec, reduced }: { spec: RibbonSpec; reduced: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uPhase: { value: spec.phase }, uWidth: { value: spec.width }, uLoop: { value: spec.loop },
    uBase: { value: spec.base }, uHem: { value: spec.hem }, uSpecTint: { value: spec.spec }, uFade: { value: 1 },
  }), [spec]);
  useFrame(({ clock }) => {
    if (!material.current) return;
    if (!reduced) material.current.uniforms.uTime.value = clock.elapsedTime + window.scrollY * 0.0035;
    const p = scrollProgress();
    material.current.uniforms.uFade.value = 1 - 0.68 * p * p * (3 - 2 * p); // calmer behind the plans
  });
  return <mesh position={[0, spec.y, spec.z]} frustumCulled={false}>
    <planeGeometry args={[1, 1, 520, 24]} />
    <shaderMaterial ref={material} vertexShader={ribbonVertex} fragmentShader={ribbonFragment} uniforms={uniforms} side={DoubleSide} transparent />
  </mesh>;
}

type DressState = { status: 'loading' | 'ready' | 'failed'; model?: PhotoGarmentModel };

export default function CoutureScene({ reduced, active, dressUrl }: { reduced: boolean; active: boolean; dressUrl?: string }) {
  const frozen = reduced || !active;
  const [dress, setDress] = useState<DressState>({ status: dressUrl ? 'loading' : 'failed' });
  useEffect(() => {
    if (!dressUrl) { setDress({ status: 'failed' }); return; }
    let cancelled = false;
    buildGarmentFromPhoto(dressUrl, HEIGHT)
      .then((model) => { if (!cancelled) setDress(model ? { status: 'ready', model } : { status: 'failed' }); })
      .catch(() => { if (!cancelled) setDress({ status: 'failed' }); });
    return () => { cancelled = true; };
  }, [dressUrl]);

  return <Canvas
    camera={{ position: [0, 0, 9], fov: 42 }}
    dpr={[1, 1.75]}
    frameloop={active && !reduced ? 'always' : 'demand'}
    gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    eventSource={typeof document !== 'undefined' ? document.body : undefined}
    eventPrefix="client"
  >
    <ambientLight intensity={0.3} />
    <directionalLight position={[-3, 4, 4]} intensity={1.6} color="#fff1d6" />
    <directionalLight position={[4, 2, -3]} intensity={1.1} color="#ffd9a0" />
    <pointLight position={[0, -2.4, 2.2]} intensity={6} distance={7} color="#f0c987" />
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={3.2} position={[-4, 3, 3]} scale={[6, 4, 1]} />
      <Lightformer form="rect" intensity={2} position={[4.5, 1, 2]} scale={[3, 7, 1]} color="#ffe2b0" />
      <Lightformer form="rect" intensity={1.4} position={[0, -3, 3]} scale={[8, 1.2, 1]} color="#c5a880" />
      <Lightformer form="ring" intensity={1.4} position={[0, 5, -4]} scale={5} />
    </Environment>
    <Rig lift={2.1} scaleTo={1.1}>
      <group position={[0, Y + 0.3, -1.4]}>
        {RIBBONS.map((spec) => <Ribbon key={spec.phase} spec={spec} reduced={frozen} />)}
      </group>
    </Rig>
    <Rig lift={5.2} scaleTo={0.78}>
      <group position={[0, Y, 0]} scale={SCALE}>
        <Pedestal />
        {dress.status === 'ready' && dress.model && <PhotoGarment model={dress.model} reduced={frozen} />}
        {dress.status === 'failed' && <Sculpture reduced={frozen} />}
        <Orbits reduced={frozen} />
        <ContactShadows position={[0, -HEIGHT / 2 - 0.02, 0]} opacity={0.5} scale={6} blur={2.4} far={1.6} />
      </group>
    </Rig>
  </Canvas>;
}
