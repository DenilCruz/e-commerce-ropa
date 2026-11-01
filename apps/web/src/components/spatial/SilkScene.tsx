import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, ShaderMaterial } from 'three';

export type SilkKind = 'cloth' | 'ribbon';

const vertexShader = `
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
// A cloth pinched at the top that falls open into vertical folds with an uneven hem.
vec3 cloth(vec3 p, vec2 uv) {
  float t = uTime * 0.28;
  float h = 1.0 - uv.y;
  p.x *= mix(0.07, 1.0, pow(h, 0.82));
  float phase = uv.x * 11.0;
  float amp = 0.07 + 0.36 * smoothstep(0.0, 1.0, h);
  p.z += sin(phase + t + h * 1.6) * amp + sin(phase * 1.9 - t * 0.7) * amp * 0.34;
  p.x += sin(h * 3.0 + t) * 0.12 * h;
  p.y -= (sin(uv.x * 7.0 + t * 0.8) * 0.5 + 0.5) * 0.34 * smoothstep(0.82, 1.0, h);
  return p;
}
void main() {
  vUv = uv;
  vec3 p = cloth(position, uv);
  vec3 px = cloth(position + vec3(0.01,0.0,0.0), uv + vec2(0.0028,0.0));
  vec3 py = cloth(position + vec3(0.0,0.01,0.0), uv + vec2(0.0,0.002));
  vNormal = normalize(normalMatrix * cross(px-p,py-p));
  vec4 world = modelViewMatrix * vec4(p,1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * world;
}`;
const fragmentShader = `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 light = normalize(vec3(-0.8,1.3,1.4));
  vec3 view = normalize(-vWorld);
  float diffuse = max(dot(n, light),0.0);
  float spec = pow(max(dot(n,normalize(light+view)),0.0),18.0);
  float rim = pow(1.0-abs(dot(n,view)),2.2);
  float weave = 0.985 + 0.015 * sin(vUv.x * 150.0) * sin(vUv.y * 190.0);
  vec3 color = vec3(0.66,0.58,0.46) * (0.22 + diffuse * 0.95) * weave;
  color += vec3(0.95,0.88,0.72) * spec * 0.16 + vec3(0.36,0.30,0.22) * rim * 0.55;
  gl_FragColor = vec4(color,1.0);
}`;

// Wide diagonal sheet: charcoal satin on one side, champagne silk on the other.
const ribbonVertex = `
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vFold;
vec3 sheet(vec2 uv) {
  float t = uTime * 0.22;
  vec3 p = vec3((uv.x - 0.5) * 17.0, (uv.y - 0.5) * 8.0, 0.0);
  float fold = sin(uv.x * 5.0 + uv.y * 2.2 + t) * 0.95
             + sin(uv.x * 11.0 - uv.y * 3.1 - t * 1.3) * 0.34
             + sin(uv.y * 7.0 + uv.x * 2.0 + t * 0.7) * 0.42;
  p.z = fold;
  p.y += sin(uv.x * 3.0 + t) * 0.85;
  return p;
}
void main() {
  vUv = uv;
  vec3 p = sheet(uv);
  vec3 px = sheet(uv + vec2(0.004, 0.0));
  vec3 py = sheet(uv + vec2(0.0, 0.004));
  vFold = p.z;
  vNormal = normalize(normalMatrix * cross(px - p, py - p));
  vec4 world = modelViewMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * world;
}`;
const ribbonFragment = `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vFold;
void main() {
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 light = normalize(vec3(-0.6, 0.9, 1.3));
  vec3 view = normalize(-vWorld);
  float diffuse = max(dot(n, light), 0.0);
  float spec = pow(max(dot(n, normalize(light + view)), 0.0), 60.0);
  float sheen = pow(1.0 - abs(dot(n, view)), 2.6);
  float band = smoothstep(0.30, 0.62, vUv.x * 0.85 + vUv.y * 0.45 + vFold * 0.05);
  vec3 charcoal = vec3(0.07, 0.07, 0.085) * (0.45 + diffuse * 1.1);
  vec3 champagne = vec3(0.74, 0.62, 0.43) * (0.18 + diffuse * 0.62);
  vec3 color = mix(charcoal, champagne, band);
  color += vec3(0.95, 0.88, 0.72) * spec * (0.12 + 0.30 * band);
  color += mix(vec3(0.12, 0.12, 0.16), vec3(0.34, 0.27, 0.17), band) * sheen * 0.6;
  gl_FragColor = vec4(color, 1.0);
}`;

const CLOTH_Y = -1.38;

function ellipse(rx: number, ry: number, steps = 120) {
  const pts = new Float32Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts[i * 3] = Math.cos(a) * rx;
    pts[i * 3 + 1] = Math.sin(a) * ry;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pts, 3));
  return g;
}

function Silk({ reduced }: { reduced: boolean }) {
  const mesh = useRef<Mesh>(null);
  const rings = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const { pointGeometry, lineGeometry } = useDust(11, 6.2, 150, 9);
  const ringA = useMemo(() => ellipse(2.3, 2.3), []);
  const ringB = useMemo(() => ellipse(3.1, 3.1), []);
  useFrame(({ clock, pointer }) => {
    if (!material.current || !mesh.current || reduced) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
    mesh.current.rotation.y += (pointer.x * 0.3 - mesh.current.rotation.y) * 0.04;
    if (rings.current) rings.current.rotation.z = clock.elapsedTime * 0.06;
  });
  return <group position={[0, CLOTH_Y, 0]}>
    <Float speed={reduced ? 0 : 0.6} rotationIntensity={0.04} floatIntensity={0.12}>
      <mesh ref={mesh}>
        <planeGeometry args={[2.8, 3.0, 120, 140]} />
        <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} side={DoubleSide} />
      </mesh>
    </Float>
    <group ref={rings} rotation={[1.2, 0, 0.18]}>
      <lineLoop geometry={ringA}><lineBasicMaterial color="#d9b878" transparent opacity={0.38} depthWrite={false} /></lineLoop>
      <lineLoop geometry={ringB} rotation={[0.15, 0.1, 0]}><lineBasicMaterial color="#d9b878" transparent opacity={0.22} depthWrite={false} /></lineLoop>
    </group>
    <points geometry={pointGeometry}><pointsMaterial color="#ecd3a2" size={0.05} sizeAttenuation transparent opacity={0.85} depthWrite={false} /></points>
    <lineSegments geometry={lineGeometry}><lineBasicMaterial color="#d9b878" transparent opacity={0.4} depthWrite={false} /></lineSegments>
  </group>;
}

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// Gold dust plus a few constellation polylines, deterministic so renders are stable.
function useDust(width = 16, height = 8, count = 360, clusters = 16) {
  return useMemo(() => {
    const rand = seeded(20261031);
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      points[i * 3] = (rand() - 0.5) * width;
      points[i * 3 + 1] = (rand() - 0.5) * height;
      points[i * 3 + 2] = rand() * 3 - 0.5;
    }
    const lines: number[] = [];
    for (let c = 0; c < clusters; c++) {
      let x = (rand() - 0.5) * (width - 1), y = (rand() - 0.5) * (height - 1), z = rand() * 2;
      for (let k = 0; k < 4; k++) {
        const nx = x + (rand() - 0.5) * 1.8, ny = y + (rand() - 0.5) * 1.4, nz = z + (rand() - 0.5) * 0.6;
        lines.push(x, y, z, nx, ny, nz);
        x = nx; y = ny; z = nz;
      }
    }
    const pointGeometry = new BufferGeometry();
    pointGeometry.setAttribute('position', new BufferAttribute(points, 3));
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
    return { pointGeometry, lineGeometry };
  }, [width, height, count, clusters]);
}

function Ribbon({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const { pointGeometry, lineGeometry } = useDust();
  useFrame(({ clock, pointer }) => {
    if (!material.current || !group.current || reduced) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
    group.current.rotation.y += (pointer.x * 0.12 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-pointer.y * 0.06 - group.current.rotation.x) * 0.04;
  });
  return <group ref={group}>
    <mesh rotation={[0, 0, -0.32]}>
      <planeGeometry args={[17, 8, 180, 90]} />
      <shaderMaterial ref={material} vertexShader={ribbonVertex} fragmentShader={ribbonFragment} uniforms={uniforms} side={DoubleSide} />
    </mesh>
    <points geometry={pointGeometry}>
      <pointsMaterial color="#e9cf9c" size={0.045} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color="#d9b878" transparent opacity={0.4} depthWrite={false} />
    </lineSegments>
  </group>;
}

export default function SilkScene({ reduced, active, kind = 'cloth' }: { reduced: boolean; active: boolean; kind?: SilkKind }) {
  const frozen = reduced || !active;
  return <Canvas camera={{ position: [0, 0, kind === 'ribbon' ? 13 : 9], fov: kind === 'ribbon' ? 46 : 42 }} dpr={[1, 1.5]} frameloop={active && !reduced ? 'always' : 'demand'} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
    {kind === 'ribbon' ? <Ribbon reduced={frozen} /> : <Silk reduced={frozen} />}
  </Canvas>;
}
