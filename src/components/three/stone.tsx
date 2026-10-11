import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Values come from the same semantic palette as the DOM and playing board.
export function useGoblinPalette() {
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const read = (name: string) => css.getPropertyValue(`--${name}`).trim();
    return { stone: read("stone"), dark: read("stone-dark"), light: read("stone-light"), ink: read("stone-ink"), moss: read("moss"), lime: read("toxic-glow"), gold: read("aged-gold"), fog: read("forest-fog"), moon: read("moonlight"), mushroom: read("mushroom"), bone: read("stone-highlight") };
  }, []);
}
export type GoblinPalette = ReturnType<typeof useGoblinPalette>;

export function useStoneTexture() {
  const p = useGoblinPalette();
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const tex = new THREE.CanvasTexture(canvas);
    if (!ctx) return tex;
    let seed = 917;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    ctx.fillStyle = p.light; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1300; i++) {
      ctx.globalAlpha = 0.1 + rnd() * 0.28;
      ctx.fillStyle = i % 3 ? p.ink : p.bone;
      const x = rnd() * 256, y = rnd() * 256, r = 0.3 + rnd() * 2.2;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.7, r, rnd(), 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      ctx.globalAlpha = 0.28; ctx.fillStyle = p.moss;
      ctx.beginPath(); ctx.ellipse(rnd() * 256, rnd() * 256, 6 + rnd() * 24, 3 + rnd() * 14, rnd() * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.65; ctx.strokeStyle = p.ink; ctx.lineWidth = 1.8;
    for (let i = 0; i < 9; i++) {
      let x = rnd() * 256, y = rnd() * 256;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (rnd() - 0.5) * 35; y += rnd() * 17; ctx.lineTo(x, y); }
      ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 15, y - 22); ctx.stroke();
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 2;
    return tex;
  }, [p]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export function useMergedGeometry(build: () => THREE.BufferGeometry[], deps: React.DependencyList) {
  const geometry = useMemo(() => {
    const parts = build();
    const merged = mergeGeometries(parts);
    parts.forEach(g => g.dispose());
    return merged ?? new THREE.BufferGeometry();
    // Callers pass stable inputs for the supplied builder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

export function Vine({ points, radius = 0.035 }: { points: [number, number, number][]; radius?: number }) {
  const p = useGoblinPalette();
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(...v))), [points]);
  return <mesh><tubeGeometry args={[curve, 24, radius, 5, false]} /><meshStandardMaterial color={p.moss} roughness={0.95} /></mesh>;
}

export function useReducedMotion() {
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  return reduced;
}
