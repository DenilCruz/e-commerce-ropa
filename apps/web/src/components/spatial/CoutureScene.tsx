import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import {
  BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, MathUtils, Object3D,
  ShaderMaterial,
} from 'three';
import { makeProfile } from './profile';
import { coutureState } from './coutureState';

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

  useFrame(({ clock, pointer }) => {
    const t = reduced ? 0 : clock.elapsedTime;
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
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
vec3 ribbon(vec2 uv) {
  float t = uTime * 0.3 + uPhase;
  float w = (uv.y - 0.5) * uWidth;
  float tw = sin(uv.x * 3.0 + t) * 1.0 + sin(uv.x * 7.0 - t * 1.4) * 0.35;
  float cy = sin(uv.x * 4.0 + t) * 0.9 + sin(uv.x * 9.0 - t * 1.3) * 0.2;
  float cz = sin(uv.x * 5.0 + t * 1.1) * 0.7 + cos(uv.x * 2.3 - t) * 0.4;
  // soft longitudinal ripples across the width, like loose satin
  float ripple = sin(uv.x * 38.0 + uv.y * 4.0 + t * 2.0) * 0.025;
  return vec3((uv.x - 0.5) * 24.0, cy + w * cos(tw), cz + w * sin(tw) + ripple);
}
void main() {
  vUv = uv;
  vec3 p = ribbon(uv);
  vec3 px = ribbon(uv + vec2(0.002, 0.0));
  vec3 py = ribbon(uv + vec2(0.0, 0.01));
  vNormal = normalize(normalMatrix * cross(px - p, py - p));
  vec4 world = modelViewMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * world;
}`;
const ribbonFragment = `
uniform float uTone;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 key = normalize(vec3(-0.5, 0.9, 1.2));
  vec3 rimL = normalize(vec3(0.9, 0.2, -0.6));
  vec3 view = normalize(-vWorld);
  float diffuse = max(dot(n, key), 0.0);
  float spec = pow(max(dot(n, normalize(key + view)), 0.0), 90.0);
  float spec2 = pow(max(dot(n, normalize(rimL + view)), 0.0), 40.0);
  float sheen = pow(1.0 - abs(dot(n, view)), 2.2);
  float band = 0.5 + 0.5 * sin(vUv.x * 11.0 + n.z * 2.5);
  vec3 champagne = mix(vec3(0.5, 0.37, 0.22), vec3(0.97, 0.86, 0.64), band) * (0.2 + diffuse * 0.85);
  vec3 dark = vec3(0.05, 0.05, 0.065) * (0.6 + diffuse * 1.2);
  vec3 color = mix(champagne, dark, uTone);
  color += vec3(1.0, 0.94, 0.8) * spec * mix(0.9, 0.35, uTone) + vec3(1.0, 0.82, 0.55) * spec2 * 0.25;
  color += mix(vec3(0.5, 0.38, 0.22), vec3(0.14, 0.14, 0.2), uTone) * sheen * 0.75;
  float edge = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x);
  gl_FragColor = vec4(color, edge);
}`;

function Ribbon({ tone, phase, y, z, width, reduced }: { tone: number; phase: number; y: number; z: number; width: number; reduced: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPhase: { value: phase }, uTone: { value: tone }, uWidth: { value: width } }), [phase, tone, width]);
  useFrame(({ clock }) => { if (material.current && !reduced) material.current.uniforms.uTime.value = clock.elapsedTime; });
  return <mesh position={[0, y, z]} frustumCulled={false}>
    <planeGeometry args={[1, 1, 360, 40]} />
    <shaderMaterial ref={material} vertexShader={ribbonVertex} fragmentShader={ribbonFragment} uniforms={uniforms} side={DoubleSide} transparent />
  </mesh>;
}

export default function CoutureScene({ reduced, active }: { reduced: boolean; active: boolean }) {
  const frozen = reduced || !active;
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
    <group position={[0, Y + 0.25, -1.4]}>
      <Ribbon tone={0} phase={0} y={0.45} z={0} width={1.5} reduced={frozen} />
      <Ribbon tone={1} phase={2.4} y={-0.15} z={-0.6} width={1.2} reduced={frozen} />
      <Ribbon tone={0} phase={4.1} y={-0.75} z={0.4} width={0.55} reduced={frozen} />
    </group>
    <group position={[0, Y, 0]} scale={SCALE}>
      <Pedestal />
      <Sculpture reduced={frozen} />
      <Orbits reduced={frozen} />
      <ContactShadows position={[0, -HEIGHT / 2 - 0.02, 0]} opacity={0.5} scale={6} blur={2.4} far={1.6} />
    </group>
  </Canvas>;
}
