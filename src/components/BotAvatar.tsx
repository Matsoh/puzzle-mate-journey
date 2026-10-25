import { useEffect, useRef, useState } from "react";
import { MOOD_EMOJI, botQuip, type BotMood } from "@/lib/bot-mood";
import type { Opponent } from "@/lib/opponents";

/**
 * The bot's living portrait: breathes while idle, sways while thinking, bounces
 * when it wins material, shakes with a red glow when it loses some, droops and
 * fades when it is losing, and jumps when it wins. Shows a mood badge and a
 * short quip whenever the mood changes.
 */
export function BotAvatar({ opponent, name, mood, size = 84, quips = true, className = "" }: { opponent?: Opponent | undefined; name?: string | undefined; mood: BotMood; size?: number; quips?: boolean; className?: string }) {
  const [bubble, setBubble] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const prev = useRef<BotMood>(mood);
  const seed = useRef(0);
  useEffect(() => {
    if (prev.current === mood) return;
    prev.current = mood;
    seed.current += 1;
    setPulse((n) => n + 1);
    if (!quips || mood === "idle" || mood === "think") { setBubble(null); return; }
    setBubble(botQuip(opponent, mood, seed.current));
    const t = setTimeout(() => setBubble(null), mood === "win" || mood === "lose" || mood === "draw" ? 12_000 : 3_500);
    return () => clearTimeout(t);
  }, [mood, opponent, quips]);

  const src = opponent?.portrait ?? "/bots/1.png";
  return (
    <div className={`bot ${className}`} style={{ "--bot-size": `${size}px` } as React.CSSProperties}>
      <div key={pulse} className={`bot__face is-${mood}`}>
        <img src={src} alt={name ?? opponent?.name ?? "Bot"} width={size} height={size} draggable={false} />
        {MOOD_EMOJI[mood] && size <= 120 && <span className="bot__mood" aria-hidden>{MOOD_EMOJI[mood]}</span>}
      </div>
      {bubble && <p className="bot__bubble" role="status">{bubble}</p>}
    </div>
  );
}
