import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GoblinKnight } from "./GoblinKnight";
import { Fireflies, ForestLighting, King, Pawn, StoneGarden } from "./shared";
import { useGoblinPalette, useReducedMotion } from "./stone";

function Orbiters() {
  const ref = useRef<THREE.Group>(null);
  const p = useGoblinPalette(); const reduced = useReducedMotion();
  useFrame((_,raw) => { if (ref.current && !reduced) ref.current.rotation.y += Math.min(raw,0.05)*0.075; });
  return <group ref={ref}>
    <Pawn color={p.dark} position={[-1.35,0.1,1.05]} scale={0.55} />
    <Pawn color={p.light} position={[1.3,0.1,0.85]} scale={0.6} />
    <King color={p.stone} position={[1.15,0.1,-1.2]} scale={0.52} />
    <Pawn color={p.light} position={[-1.15,0.1,-1.2]} scale={0.5} />
  </group>;
}
export default function Hero3D() {
  return <Canvas dpr={[1,2]} camera={{position:[-0.2,3.3,7],fov:43}} shadows>
    <ForestLighting />
    <group position={[0,-0.95,0]}>
      <GoblinKnight position={[0,0.1,0]} rotation-y={-0.24} scale={1.03} />
      <Orbiters /><StoneGarden />
    </group>
    <Fireflies />
  </Canvas>;
}
