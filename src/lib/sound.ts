import { getProgress } from "./progress";

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.2) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export type SoundName = "move" | "capture" | "check" | "win" | "lose" | "correct" | "wrong" | "levelup" | "boss";

export function play(name: SoundName) {
  if (getProgress().muted) return;
  switch (name) {
    case "move":
      tone(520, 0, 0.08, "triangle", 0.25);
      break;
    case "capture":
      tone(300, 0, 0.1, "square", 0.12);
      tone(180, 0.05, 0.12, "triangle", 0.2);
      break;
    case "check":
      tone(880, 0, 0.12, "sawtooth", 0.1);
      tone(660, 0.1, 0.15, "sawtooth", 0.1);
      break;
    case "correct":
      tone(660, 0, 0.1, "triangle");
      tone(990, 0.08, 0.18, "triangle");
      break;
    case "wrong":
      tone(220, 0, 0.25, "sawtooth", 0.1);
      break;
    case "win":
    case "levelup":
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, "triangle", 0.2));
      break;
    case "lose":
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.15, 0.3, "sine", 0.18));
      break;
    case "boss":
      [110, 147, 196].forEach((f, i) => tone(f, i * 0.18, 0.5, "sawtooth", 0.12));
      break;
  }
}

export function unlockAudio() {
  ac();
}
