import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
  BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, Group, MathUtils, ShaderMaterial,
} from 'three';
import { makeProfile } from './profile';

const AROUND = 112;
const UP = 84;
const HEIGHT = 3;
const START = -Math.PI / 2;
const Y = -1.12; // centre of the sculpture inside the hero canvas
const SCALE = 0.82;
// Couture silhouette: narrow bodice, cinched waist, gown opening into a wide hem.
const radius = makeProfile([[0, 1.3], [0.1, 1.02], [0.28, 0.64], [0.46, 0.4], [0.6, 0.27], [0.72, 0.3], [0.86, 0.25], [1, 0.17]]);
const neckline = (theta: number) => 1 - 0.2 * Math.pow(Math.max(0, Math.sin(theta)), 3) - 0.06 * Math.pow(Math.max(0, -Math.sin(theta)), 2);

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
  return { geometry, base, meta };
}

function Sculpture({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const { geometry, base, meta } = useMemo(buildSculpture, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock, pointer }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const pos = geometry.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let n = 0; n < arr.length / 3; n++) {
      const v = meta[n * 2], th = meta[n * 2 + 1];
      const hem = Math.pow(1 - v, 1.3);
      const wave = 0.1 * Math.sin(7 * th + t * 0.9 + v * 3.2) + 0.05 * Math.sin(13 * th - t * 1.2 + v * 2) + 0.025 * Math.sin(21 * th + t * 1.7);
      const rad = 1 + wave * hem;
      arr[n * 3] = base[n * 3] * rad;
      arr[n * 3 + 1] = base[n * 3 + 1] + Math.sin(4 * th + t * 0.8) * 0.045 * Math.pow(1 - v, 3);
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
      group.current.rotation.y += (clock.elapsedTime * 0.0 + pointer.x * 0.7 - group.current.rotation.y) * 0.04 + 0.002;
      group.current.rotation.x += (-pointer.y * 0.08 - group.current.rotation.x) * 0.05;
    }
  });

  return <group ref={group}>
    <mesh geometry={geometry} frustumCulled={false}>
      <meshPhysicalMaterial color="#C5A880" metalness={0.35} roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.25} side={DoubleSide} />
    </mesh>
    <mesh geometry={geometry} scale={1.015} frustumCulled={false}>
      <meshBasicMaterial color="#E6C699" wireframe transparent opacity={0.18} depthWrite={false} />
    </mesh>
  </group>;
}

function Orbits({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const particles = useMemo(() => {
    const n = 90;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ring = i % 2 ? 2.1 : 1.65;
      const a = (i / n) * Math.PI * 2 * 4.3;
      arr[i * 3] = Math.cos(a) * ring + (Math.sin(i * 12.9898) * 0.5) * 0.12;
      arr[i * 3 + 1] = (Math.sin(i * 78.233) * 0.5) * 0.18;
      arr[i * 3 + 2] = Math.sin(a) * ring;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame(({ clock, pointer }) => {
    if (!group.current || reduced) return;
    group.current.rotation.y = clock.elapsedTime * 0.16;
    group.current.rotation.x = 0.08 + pointer.y * 0.12;
    group.current.rotation.z = -pointer.x * 0.1;
  });
  return <group ref={group} position={[0, -HEIGHT / 2 + 0.05, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.65, 0.008, 8, 160]} /><meshBasicMaterial color="#E6C699" transparent opacity={0.7} /></mesh>
    <mesh rotation={[Math.PI / 2 + 0.2, 0.1, 0]}><torusGeometry args={[2.1, 0.006, 8, 160]} /><meshBasicMaterial color="#C5A880" transparent opacity={0.45} /></mesh>
    <points geometry={particles}><pointsMaterial color="#F2DDB2" size={0.055} sizeAttenuation transparent opacity={0.9} depthWrite={false} /></points>
  </group>;
}

const ribbonVertex = `
uniform float uTime;
uniform float uPhase;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFold;
vec3 ribbon(vec2 uv) {
  float t = uTime * 0.32 + uPhase;
  float w = (uv.y - 0.5) * 0.85;
  float tw = sin(uv.x * 3.2 + t) * 1.05;
  float cy = sin(uv.x * 4.0 + t) * 0.85 + sin(uv.x * 9.0 - t * 1.3) * 0.16;
  float cz = sin(uv.x * 6.0 + t * 1.1) * 0.6;
  return vec3((uv.x - 0.5) * 22.0, cy + w * cos(tw), cz + w * sin(tw));
}
void main() {
  vec3 p = ribbon(uv);
  vec3 px = ribbon(uv + vec2(0.003, 0.0));
  vec3 py = ribbon(uv + vec2(0.0, 0.01));
  vFold = p.z;
  vNormal = normalize(normalMatrix * cross(px - p, py - p));
  vec4 world = modelViewMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * world;
}`;
const ribbonFragment = `
uniform float uTone;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFold;
void main() {
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 light = normalize(vec3(-0.5, 0.9, 1.2));
  vec3 view = normalize(-vWorld);
  float diffuse = max(dot(n, light), 0.0);
  float spec = pow(max(dot(n, normalize(light + view)), 0.0), 55.0);
  float sheen = pow(1.0 - abs(dot(n, view)), 2.4);
  vec3 champagne = vec3(0.86, 0.72, 0.52) * (0.22 + diffuse * 0.85);
  vec3 dark = vec3(0.07, 0.07, 0.085) * (0.5 + diffuse * 1.0);
  vec3 color = mix(champagne, dark, uTone);
  color += vec3(1.0, 0.93, 0.76) * spec * mix(0.45, 0.18, uTone);
  color += mix(vec3(0.42, 0.33, 0.2), vec3(0.12, 0.12, 0.16), uTone) * sheen * 0.7;
  gl_FragColor = vec4(color, 1.0);
}`;

function Ribbon({ tone, phase, y, z, reduced }: { tone: number; phase: number; y: number; z: number; reduced: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPhase: { value: phase }, uTone: { value: tone } }), [phase, tone]);
  useFrame(({ clock }) => { if (material.current && !reduced) material.current.uniforms.uTime.value = clock.elapsedTime; });
  return <mesh position={[0, y, z]} frustumCulled={false}>
    <planeGeometry args={[1, 1, 260, 28]} />
    <shaderMaterial ref={material} vertexShader={ribbonVertex} fragmentShader={ribbonFragment} uniforms={uniforms} side={DoubleSide} />
  </mesh>;
}

export default function CoutureScene({ reduced, active }: { reduced: boolean; active: boolean }) {
  const frozen = reduced || !active;
  return <Canvas camera={{ position: [0, 0, 9], fov: 42 }} dpr={[1, 1.6]} frameloop={active && !reduced ? 'always' : 'demand'} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
    <ambientLight intensity={0.4} />
    <directionalLight position={[-3, 4, 4]} intensity={1.4} color="#fff1d6" />
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={2.6} position={[-4, 3, 3]} scale={[6, 4, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[4, 1, 2]} scale={[4, 6, 1]} color="#ffe2b0" />
      <Lightformer form="ring" intensity={1.2} position={[0, 5, -4]} scale={5} />
    </Environment>
    <group position={[0, Y + 0.2, -1.2]}>
      <Ribbon tone={0} phase={0} y={0.15} z={0} reduced={frozen} />
      <Ribbon tone={1} phase={2.4} y={-0.25} z={-0.5} reduced={frozen} />
    </group>
    <group position={[0, Y, 0]} scale={SCALE}>
      <Sculpture reduced={frozen} />
      <Orbits reduced={frozen} />
    </group>
  </Canvas>;
}
