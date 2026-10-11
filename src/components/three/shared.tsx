import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { Environment, Lightformer, Outlines, Sparkles } from "@react-three/drei";
import { useGoblinPalette, useMergedGeometry, useReducedMotion, useStoneTexture, Vine } from "./stone";

export function LocalEnv() {
  const p = useGoblinPalette();
  return <Environment resolution={32} frames={1}>
    <Lightformer intensity={1.5} color={p.moon} position={[0,5,3]} scale={[10,10,1]} />
    <Lightformer intensity={0.7} color={p.lime} position={[-5,0,-1]} rotation-y={Math.PI/2} scale={[10,2,1]} />
  </Environment>;
}
export function ForestLighting() {
  const p = useGoblinPalette();
  return <>
    <fog attach="fog" args={[p.fog,7,18]} />
    <hemisphereLight args={[p.moon,p.moss,0.85]} />
    <directionalLight position={[-3,6,5]} intensity={2.1} color={p.moon} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
    <pointLight position={[1,0.5,2]} color={p.lime} intensity={3.5} distance={7} />
    <LocalEnv />
  </>;
}
export function Fireflies({ count = 32 }: { count?: number }) {
  const p = useGoblinPalette();
  const reduced = useReducedMotion();
  return <Sparkles count={count} scale={[7,4,5]} position={[0,1,0]} size={3} speed={reduced ? 0 : 0.3} opacity={0.65} color={p.lime} />;
}
const PAWN: [number,number][] = [[0,0],[0.42,0],[0.42,0.08],[0.32,0.14],[0.2,0.22],[0.15,0.55],[0.26,0.62],[0.12,0.68],[0.22,0.8],[0.22,0.95],[0.1,1.05],[0,1.08]];
const KING: [number,number][] = [[0,0],[0.5,0],[0.5,0.1],[0.38,0.18],[0.24,0.3],[0.17,0.95],[0.32,1.02],[0.18,1.1],[0.3,1.35],[0.2,1.45],[0,1.47]];
const CUP: [number,number][] = [[0,0],[0.5,0],[0.5,0.1],[0.15,0.2],[0.1,0.6],[0.2,0.7],[0.55,0.9],[0.65,1.4],[0.6,1.42],[0.5,0.95],[0,0.8]];
function lathe(points: [number,number][]) { return new THREE.LatheGeometry(points.map(([x,y]) => new THREE.Vector2(x,y)),24); }
export function Pawn({ color, ...props }: { color: string } & ThreeElements["group"]) {
  const texture = useStoneTexture(); const p = useGoblinPalette();
  return <group {...props}><mesh castShadow><latheGeometry args={[PAWN.map(([x,y])=>new THREE.Vector2(x,y)),24]} /><meshStandardMaterial color={color} map={texture} roughness={0.98} /><Outlines thickness={0.016} color={p.ink} /></mesh></group>;
}
export function King({ color, ...props }: { color: string } & ThreeElements["group"]) {
  const texture = useStoneTexture(); const p = useGoblinPalette();
  const geometry = useMergedGeometry(() => {
    const crossV = new THREE.BoxGeometry(0.1,0.35,0.1); crossV.translate(0,1.6,0);
    const crossH = new THREE.BoxGeometry(0.3,0.1,0.1); crossH.translate(0,1.65,0);
    return [lathe(KING).toNonIndexed(),crossV.toNonIndexed(),crossH.toNonIndexed()];
  }, []);
  return <group {...props}><mesh geometry={geometry} castShadow><meshStandardMaterial color={color} map={texture} bumpMap={texture} bumpScale={0.03} roughness={1} /><Outlines thickness={0.02} color={p.ink} /></mesh>
    <Vine radius={0.025} points={[[-0.4,0.05,0.22],[-0.28,0.3,0.28],[0.05,0.6,0.2],[0.2,0.9,0.05]]} />
  </group>;
}
export function Trophy(props: ThreeElements["group"]) {
  const p = useGoblinPalette(); const texture = useStoneTexture();
  return <group {...props}><mesh castShadow><latheGeometry args={[CUP.map(([x,y])=>new THREE.Vector2(x,y)),28]} /><meshStandardMaterial color={p.gold} map={texture} metalness={0.65} roughness={0.7} side={THREE.DoubleSide} /><Outlines color={p.ink} thickness={0.02} /></mesh>
    <Vine points={[[-0.42,0.05,0.3],[-0.23,0.2,0.3],[0.1,0.55,0.12],[0.35,0.88,0.4],[0.58,1.18,0.25]]} />
  </group>;
}

export function RuneCircle() {
  const p = useGoblinPalette();
  const marks = useMergedGeometry(() => Array.from({length:16},(_,i) => {
    const g = new THREE.BoxGeometry(0.035,0.012,0.15 + (i%3)*0.05);
    const a = i*Math.PI/8; g.rotateY(-a); g.translate(Math.cos(a)*2.56,0,Math.sin(a)*2.56); return g;
  }), []);
  return <group position-y={-0.11}>
    <mesh rotation-x={-Math.PI/2}><ringGeometry args={[2.35,2.37,64]} /><meshBasicMaterial color={p.lime} transparent opacity={0.19} toneMapped={false} /></mesh>
    <mesh geometry={marks}><meshBasicMaterial color={p.lime} transparent opacity={0.3} toneMapped={false} /></mesh>
  </group>;
}

export function StoneGarden({ board = true }: { board?: boolean }) {
  const p = useGoblinPalette(); const tex = useStoneTexture();
  const lightTiles = useMergedGeometry(() => Array.from({length:32},(_,i) => {
    const row = Math.floor(i/4), col = (i%4)*2+(row%2);
    const g = new THREE.BoxGeometry(0.435,0.11,0.435);
    g.translate((col-3.5)*0.45,0.012+Math.sin(i*4)*0.007,(row-3.5)*0.45); return g;
  }), []);
  const dark = useMergedGeometry(() => Array.from({length:32},(_,i) => {
    const row = Math.floor(i/4), col = (i%4)*2+((row+1)%2);
    const g = new THREE.BoxGeometry(0.435,0.1,0.435); g.translate((col-3.5)*0.45,0.01,(row-3.5)*0.45); return g;
  }), []);
  const rim = useMergedGeometry(() => Array.from({length:28},(_,i) => {
    const side = Math.floor(i/7), n = i%7-3;
    const g = new THREE.BoxGeometry(0.49,0.19,0.25); g.rotateY(side*Math.PI/2);
    const x = side===0 ? n*0.5 : side===1 ? 1.94 : side===2 ? -n*0.5 : -1.94;
    const z = side===0 ? -1.94 : side===1 ? n*0.5 : side===2 ? 1.94 : -n*0.5;
    g.translate(x,-0.035+Math.sin(i*2)*0.016,z); return g;
  }), []);
  const grass = useMergedGeometry(() => Array.from({length:60},(_,i) => {
    const a=i*2.39996, radius=1.95+(i%4)*0.12;
    const g=new THREE.ConeGeometry(0.035,0.14+(i%5)*0.035,3); g.rotateZ(Math.sin(i)*0.5); g.translate(Math.cos(a)*radius,0.05,Math.sin(a)*radius); return g;
  }), []);
  const rocks = useMergedGeometry(() => Array.from({length:9},(_,i)=> {
    const a=i*2.4; const g=new THREE.DodecahedronGeometry(0.09+(i%3)*0.045,0); g.scale(1.3,0.65,1); g.translate(Math.cos(a)*2.25,-0.05,Math.sin(a)*2.25); return g;
  }), []);
  const mushrooms = useMergedGeometry(()=>Array.from({length:4},(_,i)=>{
    const a=i*1.7+0.2; const g=new THREE.SphereGeometry(0.11,8,4,0,Math.PI*2,0,Math.PI/2); g.scale(1,0.6,1); g.translate(Math.cos(a)*2.15,0.08,Math.sin(a)*2.15); return g;
  }), []);
  const stems = useMergedGeometry(()=>Array.from({length:4},(_,i)=>{
    const a=i*1.7+0.2; const g=new THREE.CylinderGeometry(0.023,0.03,0.16,5); g.translate(Math.cos(a)*2.15,0,Math.sin(a)*2.15); return g;
  }), []);
  return <group>
    <mesh rotation-x={-Math.PI/2} position-y={-0.15} receiveShadow><circleGeometry args={[3.1,48]} /><meshStandardMaterial color={p.dark} map={tex} roughness={1} transparent opacity={0.85} /></mesh>
    {board && <>
      <mesh geometry={lightTiles} receiveShadow><meshStandardMaterial color={p.light} map={tex} bumpMap={tex} bumpScale={0.025} roughness={1} /></mesh>
      <mesh geometry={dark} receiveShadow><meshStandardMaterial color={p.dark} map={tex} roughness={1} /></mesh>
      <mesh geometry={rim} castShadow><meshStandardMaterial color={p.stone} map={tex} roughness={1} /></mesh>
    </>}
    <mesh geometry={grass}><meshStandardMaterial color={p.moss} roughness={1} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={rocks}><meshStandardMaterial color={p.dark} map={tex} roughness={1} /></mesh>
    <mesh geometry={mushrooms}><meshStandardMaterial color={p.mushroom} roughness={0.95} /></mesh>
    <mesh geometry={stems}><meshStandardMaterial color={p.bone} roughness={1} /></mesh>
    <Vine points={[[-2.1,-0.06,1.1],[-1.96,0.14,0.7],[-1.4,0.16,0.4],[-1.3,0.14,-0.1],[-1.65,0.1,-0.5]]} />
    <Vine points={[[1.2,0.03,-2],[0.85,0.12,-1.85],[0.5,0.12,-1.3],[0.1,0.12,-1.5],[-0.2,0.1,-1.7]]} />
    <RuneCircle />
  </group>;
}
