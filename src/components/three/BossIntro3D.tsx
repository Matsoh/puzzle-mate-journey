import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Fireflies, ForestLighting, King, StoneGarden } from "./shared";
import { useGoblinPalette, useReducedMotion } from "./stone";

function BossKing({ hue }: { hue: number }) {
  const ref = useRef<THREE.Group>(null); const age=useRef(0);
  const p=useGoblinPalette(); const reduced=useReducedMotion();
  useFrame((_,raw)=>{
    age.current+=Math.min(raw,0.05); const t=age.current;
    if(ref.current) {
      ref.current.position.y = reduced ? 0 : -1.8 + Math.min(t/1.2,1)*1.8;
      if(!reduced) ref.current.rotation.y += Math.min(raw,0.05)*0.22;
    }
  });
  return <group position={[0,-0.85,0]}>
    <group ref={ref}><King color={hue > 60 && hue < 180 ? p.light : p.stone} scale={1.45} /></group>
    <StoneGarden board={false} />
  </group>;
}
export default function BossIntro3D({ hue }: { hue: number }) {
  return <Canvas dpr={[1,2]} camera={{position:[0,1.8,6],fov:44}} shadows>
    <ForestLighting /><BossKing hue={hue} /><Fireflies />
  </Canvas>;
}
