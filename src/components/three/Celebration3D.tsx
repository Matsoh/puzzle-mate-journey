import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { LocalEnv, Trophy } from "./shared";

const COUNT = 220;
const COLORS = ["#3ee0ff", "#ff3ea5", "#a4ff3e", "#ffd23f", "#b48cff"];

function Confetti() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        pos: new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 6, (Math.random() - 0.5) * 4),
        vel: 0.8 + Math.random() * 1.5,
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        spin: (Math.random() - 0.5) * 6,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) m.setColorAt(i, c.set(COLORS[i % COLORS.length]!));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }, raw) => {
    const d = Math.min(raw, 0.05);
    const m = ref.current;
    if (!m) return;
    parts.forEach((p, i) => {
      p.pos.y -= p.vel * d;
      p.pos.x += Math.sin(clock.elapsedTime * 2 + i) * 0.3 * d;
      if (p.pos.y < -3) p.pos.y = 4 + Math.random() * 2;
      p.rot.x += p.spin * d;
      p.rot.y += p.spin * 0.7 * d;
      dummy.position.copy(p.pos);
      dummy.rotation.copy(p.rot);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      <planeGeometry args={[0.12, 0.2]} />
      <meshStandardMaterial side={THREE.DoubleSide} emissive="#ffffff" emissiveIntensity={0.15} />
    </instancedMesh>
  );
}

function SpinningTrophy() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += Math.min(d, 0.05) * 1.5;
  });
  return (
    <Float speed={2} floatIntensity={0.8}>
      <group ref={ref}>
        <Trophy position={[0, -0.9, 0]} scale={1.4} />
      </group>
    </Float>
  );
}

export default function Celebration3D() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.5, 5], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 5, 3]} intensity={2.2} />
      <LocalEnv />
      <SpinningTrophy />
      <Confetti />
      <Sparkles count={50} scale={[6, 4, 3]} size={5} speed={0.8} color="#ffd23f" />
    </Canvas>
  );
}
