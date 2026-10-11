import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { King, LocalEnv, Pawn, useCheckerTexture } from "./shared";

function StormCoach() {
  const group = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const bolt = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = Math.sin(t * 0.6) * 0.35;
    if (eyes.current) eyes.current.scale.y = Math.sin(t * 2.3) > 0.97 ? 0.1 : 1;
    if (bolt.current) (bolt.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + Math.sin(t * 6) * 0.4;
  });
  const cloud = <meshStandardMaterial color="#f2f0ff" roughness={0.6} emissive="#8b7bff" emissiveIntensity={0.15} />;
  const boltShape = new THREE.Shape();
  boltShape.moveTo(0, 0.5);
  boltShape.lineTo(-0.22, 0);
  boltShape.lineTo(-0.02, 0);
  boltShape.lineTo(-0.15, -0.5);
  boltShape.lineTo(0.22, 0.08);
  boltShape.lineTo(0.02, 0.08);
  boltShape.lineTo(0.12, 0.5);
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={1.2}>
      <group ref={group} position={[0, 1.6, 0]}>
        <mesh position={[-0.55, 0, 0]}><sphereGeometry args={[0.55, 32, 32]} />{cloud}</mesh>
        <mesh position={[0.05, 0.25, 0]}><sphereGeometry args={[0.72, 32, 32]} />{cloud}</mesh>
        <mesh position={[0.65, 0, 0]}><sphereGeometry args={[0.5, 32, 32]} />{cloud}</mesh>
        <mesh position={[0.05, -0.2, 0.05]}><sphereGeometry args={[0.6, 32, 32]} />{cloud}</mesh>
        <group ref={eyes} position={[0.05, 0.15, 0.62]}>
          <mesh position={[-0.2, 0, 0]}><sphereGeometry args={[0.11, 16, 16]} /><meshStandardMaterial color="#1a1240" /></mesh>
          <mesh position={[0.2, 0, 0]}><sphereGeometry args={[0.11, 16, 16]} /><meshStandardMaterial color="#1a1240" /></mesh>
        </group>
        <mesh position={[0.05, -0.12, 0.66]} rotation-z={Math.PI}>
          <torusGeometry args={[0.14, 0.03, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#1a1240" />
        </mesh>
        <mesh ref={bolt} position={[0.05, -1.05, 0]}>
          <extrudeGeometry args={[boltShape, { depth: 0.08, bevelEnabled: false }]} />
          <meshStandardMaterial color="#ffd23f" emissive="#ffb000" emissiveIntensity={1} />
        </mesh>
      </group>
    </Float>
  );
}

function Orbiters() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += Math.min(d, 0.05) * 0.3;
  });
  return (
    <group ref={ref}>
      <Float speed={3} floatIntensity={1}><Pawn color="#3ee0ff" position={[-2.3, 0.4, 0.5]} scale={0.8} /></Float>
      <Float speed={2.5} floatIntensity={1}><Pawn color="#ff3ea5" position={[2.2, 0.5, -0.4]} scale={0.8} /></Float>
      <Float speed={2} floatIntensity={0.8}><King color="#a4ff3e" position={[1.4, 0.2, -1.8]} scale={0.8} /></Float>
      <Float speed={2.8} floatIntensity={1}><Pawn color="#ffd23f" position={[-1.4, 0.3, -1.9]} scale={0.7} /></Float>
    </group>
  );
}

function BoardDisk() {
  const tex = useCheckerTexture();
  return (
    <group position={[0, -0.6, 0]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.2, 3.2]} />
        <meshStandardMaterial map={tex} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <ringGeometry args={[2.4, 2.55, 64]} />
        <meshBasicMaterial color="#3ee0ff" toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Hero3D() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 2.2, 6.2], fov: 45 }} shadows>
      <fog attach="fog" args={["#1a1240", 7, 16]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3, 2, 2]} color="#ff3ea5" intensity={8} />
      <pointLight position={[3, 2, 2]} color="#3ee0ff" intensity={8} />
      <LocalEnv />
      <StormCoach />
      <Orbiters />
      <BoardDisk />
      <Sparkles count={60} scale={[8, 4, 6]} size={3} speed={0.4} color="#bfaaff" />
    </Canvas>
  );
}
