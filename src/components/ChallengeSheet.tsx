import { useState } from "react";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createChallenge, TIME_CONTROLS, type TimeControlId } from "@/lib/online";
import { refreshOnline, type FriendView } from "@/lib/online-store";
import { play } from "@/lib/sound";

/** "Utfordre" dialog: time control + colour, sends the challenge. */
export function ChallengeSheet({ v, myRating, onClose }: { v: Pick<FriendView, "userId" | "profile" | "online">; myRating: number; onClose: () => void }) {
  const [tc, setTc] = useState<TimeControlId>("10+0");
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    setBusy(true); setErr(null);
    try { await createChallenge(v.userId, tc, color); await refreshOnline(); play("move"); onClose(); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Utfordre" className="celebrate" onClick={onClose}>
      <div className="celebrate__card animate-pop text-left" onClick={(e) => e.stopPropagation()}>
        <p className="celebrate__eyebrow">Utfordre</p>
        <h2 className="celebrate__title">{v.profile?.name ?? "Venn"}</h2>
        <p className="celebrate__sub">Rating {v.profile?.rating ?? "–"} · du har {myRating}{v.online ? " · pålogget nå" : " · ikke pålogget (får utfordringen når de åpner appen)"}</p>
        <p className="eyebrow mb-2 mt-5">Tid</p>
        <div className="grid grid-cols-3 gap-2">{TIME_CONTROLS.map((t) => <button key={t.id} type="button" onClick={() => setTc(t.id)} className={`chip justify-center py-2 ${tc === t.id ? "border-primary text-primary" : ""}`} aria-pressed={tc === t.id}><span className="font-bold">{t.label}</span><span className="ml-1 text-xs text-muted-foreground">{t.hint}</span></button>)}</div>
        <p className="eyebrow mb-2 mt-4">Farge</p>
        <div className="grid grid-cols-3 gap-2">{([["w", "Hvit"], ["random", "Tilfeldig"], ["b", "Svart"]] as const).map(([c, l]) => <button key={c} type="button" onClick={() => setColor(c)} className={`chip justify-center py-2 ${color === c ? "border-primary text-primary" : ""}`} aria-pressed={color === c}>{l}</button>)}</div>
        {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3"><Button variant="outline" size="lg" onClick={onClose}>Avbryt</Button><Button size="lg" className="font-bold" disabled={busy} onClick={() => void send()}><Swords /> Send</Button></div>
      </div>
    </div>
  );
}
