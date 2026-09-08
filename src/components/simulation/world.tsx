import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  EARTH_ANGLE_AT_CA,
  EVENTS,
  GEO_RADIUS_KM,
  MOON_RADIUS_KM,
  PATH,
  R_EARTH_KM,
  SUN_DIR,
  earthRotationAt,
  interpolatePath,
  moonPosition,
} from "@/lib/apophis/orbit";
import { simRef, useSim } from "@/store/sim";

export const apoWorld = new THREE.Vector3();
export const apoVel = new THREE.Vector3();
export const reticleApi: { node: HTMLDivElement | null } = { node: null };

const _look = new THREE.Vector3();
const _spin = new THREE.Quaternion();
const _axis = new THREE.Vector3(0.3, 1, 0.15).normalize();

export function asteroidVisualRadius(trueScale: boolean) {
  return trueScale ? 0.000029 : 0.07;
}

export function Earth({ dayMap, nightMap }: { dayMap: THREE.Texture; nightMap: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const showGeo = useSim((s) => s.showGeo);
  useFrame(() => {
    if (group.current) group.current.rotation.y = earthRotationAt(simRef.timeHours);
  });
  const r = GEO_RADIUS_KM / R_EARTH_KM;
  const geoPts = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      arr.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
    }
    return arr;
  }, [r]);
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1, 96, 64]} />
        <meshStandardMaterial map={dayMap} roughness={0.58} metalness={0.02} emissiveMap={nightMap} emissive="#7f93b0" emissiveIntensity={0.42} />
      </mesh>
      {showGeo ? <Line points={geoPts} color="#9eb4c8" lineWidth={1} transparent opacity={0.42} /> : null}
    </group>
  );
}

export function Moon({ map }: { map: THREE.Texture }) {
  const ref = useRef<THREE.Group>(null);
  const show = useSim((s) => s.showMoon);
  const radius = MOON_RADIUS_KM / R_EARTH_KM;
  useFrame(() => {
    if (!ref.current) return;
    const p = moonPosition(simRef.timeHours);
    ref.current.position.set(p[0], p[1], p[2]);
    ref.current.rotation.y = simRef.timeHours * 0.09 + EARTH_ANGLE_AT_CA;
  });
  if (!show) return null;
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial map={map} roughness={1} metalness={0} color="#d6d2c8" />
      </mesh>
    </group>
  );
}

export function Asteroid({ map }: { map: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const trueScale = useSim((s) => s.trueScale);
  const visR = asteroidVisualRadius(trueScale);
  useFrame(({ camera, size }) => {
    const st = interpolatePath(simRef.timeHours);
    apoWorld.set(st.position[0], st.position[1], st.position[2]);
    apoVel.set(st.velocity[0], st.velocity[1], st.velocity[2]);
    if (group.current) group.current.position.copy(apoWorld);
    if (mesh.current) {
      _look.copy(apoWorld).add(apoVel);
      mesh.current.lookAt(_look);
      _spin.setFromAxisAngle(_axis, simRef.timeHours * 0.55);
      mesh.current.quaternion.multiply(_spin);
      mesh.current.scale.setScalar(asteroidVisualRadius(useSim.getState().trueScale));
    }
    const el = reticleApi.node;
    if (el) {
      _look.copy(apoWorld).project(camera);
      const onScreen = useSim.getState().introDone && _look.z < 1;
      const x = (_look.x * 0.5 + 0.5) * size.width;
      const y = (-_look.y * 0.5 + 0.5) * size.height;
      el.style.opacity = onScreen ? "1" : "0";
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  });
  return (
    <group ref={group}>
      <mesh ref={mesh} scale={visR}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial map={map} roughness={0.92} metalness={0.04} color="#c4b49a" />
      </mesh>
    </group>
  );
}

export function Trajectory() {
  const show = useSim((s) => s.showPath);
  const points = useMemo(() => PATH.map((p) => p.position as [number, number, number]), []);
  if (!show) return null;
  return <Line points={points} color="#c4a574" lineWidth={1.6} transparent opacity={0.88} />;
}

export function Starfield() {
  const geo = useMemo(() => {
    const count = 2800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const phi = Math.acos(u);
      const r = 220 + Math.random() * 80;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.62;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#d8e0ea" size={0.55} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

export function Sun() {
  const pos: [number, number, number] = [SUN_DIR[0] * 160, SUN_DIR[1] * 160, SUN_DIR[2] * 160];
  return (
    <mesh position={pos}>
      <sphereGeometry args={[4, 16, 16]} />
      <meshBasicMaterial color="#fff6e4" />
    </mesh>
  );
}

export function EventBeacons() {
  const pts = useMemo(
    () =>
      EVENTS.filter((e) => e.id !== "open" && e.id !== "close").map((e) => ({
        id: e.id,
        p: interpolatePath(e.t).position,
      })),
    [],
  );
  return (
    <group>
      {pts.map((e) => (
        <mesh key={e.id} position={e.p}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshBasicMaterial color={e.id === "ca" ? "#e8e6e1" : "#9eb4c8"} />
        </mesh>
      ))}
    </group>
  );
}
