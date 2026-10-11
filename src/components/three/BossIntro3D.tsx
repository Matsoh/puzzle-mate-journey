import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { King, LocalEnv } from "./shared";

function BossKing({ hue }: { hue: number }) {
  const ref = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const color = new THREE.Color().setHSL(hue / 360, 0.85, 0.55).getStyle();
  useFrame(({ clock }, d) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      const rise = Math.min(1, t / 1.2);
      ref.current.position.y = -3 + rise * (3 - (1 - rise) * 0.5) + Math.sin(t * 2) * 0.05;
      ref.current.rotation.y += Math.min(d, 0.05) * (2.5 - rise * 2);
    }
    if (rings.current) {
      rings.current.rotation.z += Math.min(d, 0.05);
      rings.current.rotation.x = Math.PI / 2 + Math.sin(t) * 0.2;
    }
  });
  return (
    <>
      <group ref={ref}>
        <King color={color} position={[0, -0.9, 0]} scale={1.4} />
      </group>
      <group ref={rings}>
        {[1.6, 2.1, 2.6].map((r, i) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.025, 8, 96]} />
            <meshBasicMaterial color={i === 1 ? "#ffffff" : color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export default function BossIntro3D({ hue }: { hue: number }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.6, 5.5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 4, 3]} intensity={2} />
      <pointLight position={[0, -1, 2]} intensity={10} color="#ff3ea5" />
      <LocalEnv />
      <BossKing hue={hue} />
      <Sparkles count={80} scale={[7, 5, 4]} size={4} speed={1.2} color="#ffffff" />
    </Canvas>
  );
}
