import { useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { peek, shift, subscribe, type Celebration } from "@/lib/celebrate";
import { Mike } from "./Mike";
import { Button } from "@/components/ui/button";
import { play } from "@/lib/sound";
import { RARITY_LABEL } from "@/lib/collection";

const confetti = Array.from({ length: 40 }, (_, i) => ({
  "--x": `${(i * 37) % 100}%`, "--d": `${1.6 + (i % 5) * 0.35}s`, "--delay": `${-(i * 0.13)}s`, "--r": `${(i * 53) % 360}deg`,
  "--c": ["var(--primary)", "var(--gold)", "#e85d8a", "#7fb3e6", "#f3f1e3"][i % 5],
} as CSSProperties));

/** Global overlay: level-ups, badges, new motifs and the daily chest. One at a time. */
export function Celebrations() {
  const c = useSyncExternalStore(subscribe, peek, () => undefined);
  useEffect(() => {
    if (!c) return;
    play(c.kind === "level" ? "levelup" : (c.kind === "chest" && c.tier === "jackpot") || (c.kind === "tour" && c.place <= 3) ? "win" : "correct");
  }, [c]);
  if (!c) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Feiring" className="celebrate" onClick={shift}>
      <div className="celebrate__confetti" aria-hidden>{confetti.map((s, i) => <i key={i} style={s} />)}</div>
      <div className="celebrate__card animate-pop" onClick={(e) => e.stopPropagation()}>
        <Body c={c} />
        <Button size="lg" className="mt-6 w-full text-base font-bold" onClick={shift}>Fortsett</Button>
      </div>
    </div>
  );
}

function Body({ c }: { c: Celebration }) {
  switch (c.kind) {
    case "level":
      return <>
        <Mike mood="happy" className="mx-auto w-32" />
        <p className="celebrate__eyebrow">Nytt nivå</p>
        <h2 className="celebrate__title">Nivå {c.level}</h2>
        <p className="celebrate__sub">Du er nå <strong>{c.title}</strong></p>
        <p className="mike-bubble mt-4 text-sm">Level {c.level}. I felt that from here.</p>
      </>;
    case "badge":
      return <>
        <div className="celebrate__emoji">{c.badge.icon}</div>
        <p className="celebrate__eyebrow">Nytt merke</p>
        <h2 className="celebrate__title">{c.badge.name}</h2>
        <p className="celebrate__sub">{c.badge.desc}</p>
      </>;
    case "motif":
      return <>
        <div className="celebrate__emoji">{c.motifs[0]!.emoji}</div>
        <p className="celebrate__eyebrow">Ny i Monsterboken · {RARITY_LABEL[c.motifs[0]!.rarity]}</p>
        <h2 className="celebrate__title">{c.motifs.map((m) => m.name).join(" + ")}</h2>
        <p className="celebrate__sub">{c.motifs[0]!.hint}</p>
        <Link to="/samling" onClick={shift} className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">Åpne Monsterboken</Link>
      </>;
    case "schoolday":
      return <>
        <Mike mood="happy" className="mx-auto w-32" />
        <p className="celebrate__eyebrow">Mike Skolen</p>
        <h2 className="celebrate__title">Skoledag fullført!</h2>
        <p className="celebrate__sub">Hele timeplanen i dag. Skoledager totalt: <strong>{c.days}</strong>.</p>
        <p className="mike-bubble mt-4 text-sm">Class dismissed. Same time tomorrow – a full week unlocks something special.</p>
      </>;
    case "classup":
      return <>
        <Mike mood="happy" className="mx-auto w-32" />
        <p className="celebrate__eyebrow">Eksamen bestått!</p>
        <h2 className="celebrate__title">{c.cls > 7 ? "Uteksaminert fra Mike Skolen!" : `Velkommen til ${c.name}`}</h2>
        <p className="celebrate__sub">+100 XP og +50 🪙. {c.cls > 7 ? "Du har gått hele skolen. Nå: 2000." : "Nye åpninger, nye motstandere, nytt pensum fra i morgen."}</p>
        <p className="mike-bubble mt-4 text-sm">{c.cls > 7 ? "You finished my school. I'm not crying, I'm felt. Go get the rating." : "Passed. I knew it. New class, new tricks – and I get to be tougher on you."}</p>
      </>;
    case "tour":
      return <>
        <div className="celebrate__emoji">{c.place === 1 ? "🥇" : c.place === 2 ? "🥈" : c.place === 3 ? "🥉" : "🏁"}</div>
        <p className="celebrate__eyebrow">Turnering · {c.tier}</p>
        <h2 className="celebrate__title">{c.place === 1 ? "Turneringsseier!" : c.place <= 3 ? `${c.place}. plass – pallen!` : `${c.place}. plass`}</h2>
        <p className="celebrate__sub">+{c.xp} XP og +{c.coins} 🪙 for fem runder i sveitsersystemet.</p>
        <p className="mike-bubble mt-4 text-sm">{c.place === 1 ? "Winner. Ten players, five rounds, your name on top. Frame it." : c.place <= 3 ? "A medal. Real tournament chess, real nerves – and you held them." : "Five tournament games in the bank. The table doesn't remember, the notebook does."}</p>
      </>;
    case "week":
      return <>
        <div className="celebrate__emoji">🎓</div>
        <p className="celebrate__eyebrow">Full skoleuke!</p>
        <h2 className="celebrate__title">Premie: +{c.coins} 🪙</h2>
        <p className="celebrate__sub">Sju av sju dager på Mike Skolen. Nye avatar-deler er låst opp ({c.weeks === 1 ? "første" : `${c.weeks}.`} skoleuke).</p>
        <Link to="/avatar" onClick={shift} className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">Se premien i avataren</Link>
      </>;
    case "chest":
      return <>
        <div className={`celebrate__chest is-${c.tier}`}>{c.tier === "jackpot" ? "💎" : c.tier === "stor" ? "🧰" : "📦"}</div>
        <p className="celebrate__eyebrow">{c.tier === "jackpot" ? "JACKPOT!" : c.tier === "stor" ? "Stor kiste!" : "Dagens kiste"}</p>
        <h2 className="celebrate__title">+{c.coins} 🪙</h2>
        <p className="celebrate__sub">Bruk myntene på avataren din.</p>
        <Link to="/avatar" onClick={shift} className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">Til avataren</Link>
      </>;
  }
}
