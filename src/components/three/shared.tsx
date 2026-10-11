import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";

export function LocalEnv() {
  return (
    <Environment resolution={64}>
      <Lightformer intensity={2} position={[0, 5, 2]} scale={[10, 10, 1]} />
      <Lightformer intensity={1.5} color="#3ee0ff" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      <Lightformer intensity={1.5} color="#ff3ea5" position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
    </Environment>
  );
}

const PAWN: [number, number][] = [[0, 0], [0.42, 0], [0.42, 0.08], [0.32, 0.14], [0.2, 0.22], [0.15, 0.55], [0.26, 0.62], [0.12, 0.68], [0.22, 0.8], [0.22, 0.95], [0.1, 1.05], [0, 1.08]];
const KING: [number, number][] = [[0, 0], [0.5, 0], [0.5, 0.1], [0.38, 0.18], [0.24, 0.3], [0.17, 0.95], [0.32, 1.02], [0.18, 1.1], [0.3, 1.35], [0.2, 1.45], [0, 1.47]];
const CUP: [number, number][] = [[0, 0], [0.5, 0], [0.5, 0.1], [0.15, 0.2], [0.1, 0.6], [0.2, 0.7], [0.55, 0.9], [0.65, 1.4], [0.6, 1.42], [0.5, 0.95], [0, 0.8]];

function lathe(pts: [number, number][]) {
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 32);
}

export function Pawn(props: { color: string; emissive?: string } & ThreeElements["group"]) {
  const { color, emissive, ...rest } = props;
  const geo = useMemo(() => lathe(PAWN), []);
  return (
    <group {...rest}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={0.25} metalness={0.3} roughness={0.35} />
      </mesh>
    </group>
  );
}

export function King(props: { color: string; emissive?: string } & ThreeElements["group"]) {
  const { color, emissive, ...rest } = props;
  const geo = useMemo(() => lathe(KING), []);
  const mat = <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={0.3} metalness={0.5} roughness={0.25} />;
  return (
    <group {...rest}>
      <mesh geometry={geo} castShadow>{mat}</mesh>
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[0.08, 0.32, 0.08]} />
        {mat}
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[0.24, 0.08, 0.08]} />
        {mat}
      </mesh>
    </group>
  );
}

export function Trophy(props: ThreeElements["group"]) {
  const geo = useMemo(() => lathe(CUP), []);
  return (
    <group {...props}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#ffcc33" emissive="#ff9900" emissiveIntensity={0.35} metalness={0.9} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function useCheckerTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? "#3b2a7a" : "#bdb6ec";
        g.fillRect(x * 32, y * 32, 32, 32);
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  }, []);
}

