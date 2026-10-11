import { useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { Outlines } from "@react-three/drei";
import * as THREE from "three";
import { useGoblinPalette, useMergedGeometry, useReducedMotion, useStoneTexture, Vine } from "./stone";

function knightShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.59, 0.46); s.lineTo(0.62, 0.46);
  s.bezierCurveTo(0.76, 0.9, 0.83, 1.5, 0.55, 2.22);
  s.lineTo(0.48, 2.82); s.lineTo(0.18, 2.57); s.lineTo(-0.02, 2.9);
  s.lineTo(-0.2, 2.46); s.lineTo(-0.58, 2.31); s.lineTo(-0.81, 1.96);
  s.lineTo(-1.13, 1.74); s.lineTo(-1.2, 1.49); s.lineTo(-1.01, 1.37);
  s.lineTo(-0.81, 1.43); s.lineTo(-0.79, 1.25); s.lineTo(-0.48, 1.22);
  s.bezierCurveTo(-0.1, 1.31, -0.01, 1.08, -0.59, 0.46);
  return s;
}
const BASE: [number, number][] = [[0,0],[0.8,0],[0.84,0.05],[0.84,0.17],[0.7,0.21],[0.7,0.3],[0.61,0.35],[0.61,0.45],[0.5,0.5],[0,0.5]];

export function GoblinKnight({ celebrate = false, ...props }: { celebrate?: boolean } & ThreeElements["group"]) {
  const p = useGoblinPalette();
  const texture = useStoneTexture();
  const shape = useMemo(knightShape, []);
  const profile = useMemo(() => BASE.map(([x,y]) => new THREE.Vector2(x,y)), []);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eye = useRef<THREE.MeshStandardMaterial>(null);
  const age = useRef(0);
  const reduced = useReducedMotion();
  const mane = useMergedGeometry(() => Array.from({length: 7}, (_, i) => {
    const g = new THREE.BoxGeometry(0.29,0.25,0.62);
    g.rotateZ(0.24 - i * 0.065); g.translate(0.48 + Math.sin(i * 0.42) * 0.27,2.42-i*0.27,0);
    return g;
  }), []);
  const teeth = useMergedGeometry(() => Array.from({length: 3}, (_,i) => {
    const g = new THREE.ConeGeometry(0.075,0.19,3); g.rotateZ(Math.PI); g.translate(-0.88 + i*0.16,1.36,0.33); return g;
  }), []);
  const drips = useMergedGeometry(() => Array.from({length: 4}, (_,i) => {
    const g = new THREE.ConeGeometry(0.06,0.2 + (i%2)*0.17,5); g.translate(-0.87+i*0.17,1.12-(i%2)*0.05,0.18); return g;
  }), []);
  useFrame((_, raw) => {
    age.current += Math.min(raw,0.05);
    const t = age.current;
    if (reduced) return;
    if (head.current) {
      head.current.rotation.y = Math.sin(t*0.45)*0.18;
      const snort = Math.max(0, Math.sin(t*0.75)-0.96)*1.7;
      head.current.position.y = snort;
      head.current.rotation.z = -snort * 0.4;
    }
    if (eye.current) eye.current.emissiveIntensity = 1.8 + Math.sin(t*2.2)*0.6;
    if (body.current && celebrate) {
      // Short rear-up, planted pedestal pivot; returns to idle after 2.4 seconds.
      const rise = t < 2.4 ? Math.sin(Math.min(t/2.4,1)*Math.PI) : 0;
      body.current.rotation.z = -rise * 0.32;
      body.current.position.y = rise * 0.24;
    }
  });
  const stone = <meshStandardMaterial color={p.stone} map={texture} bumpMap={texture} bumpScale={0.045} roughness={0.98} />;
  return <group {...props}>
    <group ref={body}>
      <mesh castShadow receiveShadow><latheGeometry args={[profile,32]} />{stone}<Outlines thickness={0.025} color={p.ink} /></mesh>
      <group ref={head}>
        <mesh position-z={-0.26} castShadow><extrudeGeometry args={[shape,{depth:0.52,bevelEnabled:true,bevelThickness:0.08,bevelSize:0.065,bevelSegments:2,steps:1,curveSegments:8}]} />{stone}<Outlines thickness={0.027} color={p.ink} angle={Math.PI} /></mesh>
        <mesh geometry={mane} castShadow><meshStandardMaterial map={texture} color={p.dark} roughness={1} /><Outlines thickness={0.018} color={p.ink} /></mesh>
        <mesh position={[-0.46,2.04,0.345]} rotation-z={0.22}><sphereGeometry args={[0.16,12,8]} /><meshStandardMaterial color={p.ink} /><group scale={[1,0.3,0.3]} position-z={0.115}><mesh><sphereGeometry args={[0.1,12,8]} /><meshStandardMaterial ref={eye} color={p.lime} emissive={p.lime} emissiveIntensity={2} toneMapped={false} /></mesh></group></mesh>
        <mesh position={[-0.45,2.18,0.35]} rotation-z={0.24}><boxGeometry args={[0.44,0.15,0.15]} />{stone}<Outlines thickness={0.017} color={p.ink} /></mesh>
        <mesh position={[-1.01,1.62,0.335]} scale={[1,0.7,0.35]}><sphereGeometry args={[0.095,10,8]} /><meshStandardMaterial color={p.ink} /></mesh>
        <mesh position={[-0.75,1.4,0.32]} rotation-z={0.15}><boxGeometry args={[0.47,0.085,0.03]} /><meshStandardMaterial color={p.ink} /></mesh>
        <mesh geometry={teeth}><meshStandardMaterial color={p.bone} roughness={1} /></mesh>
        <mesh geometry={drips}><meshStandardMaterial color={p.moss} roughness={0.65} /></mesh>
      </group>
    </group>
    <Vine points={[[-0.7,0.05,0.45],[-0.75,0.22,0.18],[-0.35,0.3,-0.6],[0.55,0.4,-0.3],[0.6,0.52,0.35],[0.3,0.74,0.4]]} />
    <Vine radius={0.023} points={[[0.65,0.02,0.3],[0.38,0.22,0.67],[-0.12,0.4,0.62],[-0.37,0.55,0.38]]} />
  </group>;
}
