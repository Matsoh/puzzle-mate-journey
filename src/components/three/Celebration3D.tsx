import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GoblinKnight } from "./GoblinKnight";
import { Fireflies, ForestLighting, StoneGarden, Trophy } from "./shared";
import { useReducedMotion } from "./stone";

function OldGoblet() {
  const ref=useRef<THREE.Group>(null); const reduced=useReducedMotion();
  useFrame((_,raw)=>{if(ref.current&&!reduced) ref.current.rotation.y+=Math.min(raw,0.05)*0.4;});
  return <group ref={ref} position={[1.05,0.02,0.3]}><Trophy scale={0.95} /></group>;
}
export default function Celebration3D() {
  return <Canvas dpr={[1,2]} camera={{position:[-0.2,2.5,6.7],fov:43}} shadows>
    <ForestLighting />
    <group position={[0,-1,0]}>
      <GoblinKnight celebrate position={[-0.6,0,0]} scale={0.8} rotation-y={-0.18} />
      <OldGoblet /><StoneGarden board={false} />
    </group>
    <Fireflies count={48} />
  </Canvas>;
}
