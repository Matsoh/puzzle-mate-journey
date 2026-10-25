import { Link, useRouterState } from "@tanstack/react-router";
import { ChartNoAxesCombined, House, Puzzle, Swords, Crown, ChessKnight, GraduationCap, Trophy, Ellipsis, BookOpen, MessageCircle, Globe, UserRound } from "lucide-react";
import { Celebrations } from "./Celebrations";
import type { ReactNode } from "react";
import { MuteToggle } from "./AppHeader";
import { ThemeToggle } from "./ThemeToggle";
import { PlayerAvatar } from "./CoachAvatar";
import { avatarName } from "@/lib/avatar";
import { useProgress } from "@/lib/progress";
import { SyncStatus, LogoutButton, MergeNotice } from "./SyncStatus";

/** The four things Tobias does every day + "Mer" for the rest. */
export const PRIMARY_NAV = [
  { to: "/", label: "Hjem", icon: House },
  { to: "/stigen", label: "Spill", icon: Crown },
  { to: "/pusler", label: "Oppgaver", icon: Puzzle },
  { to: "/avatar", label: "Avatar", icon: UserRound },
] as const;

export const MORE_NAV = [
  { to: "/mike", label: "Snakk med Mike", hint: "Spør om hva som helst (om sjakk)", icon: MessageCircle },
  { to: "/partier", label: "Mine partier", hint: "Hent partier fra chess.com/Lichess – Mike ser på dem", icon: Globe },
  { to: "/samling", label: "Monsterboken", hint: "Samlingen din: taktikk-motiver du har funnet og bots du har slått", icon: BookOpen },
  { to: "/fremgang", label: "Fremgang", hint: "Ratinggraf, statistikk og merker", icon: ChartNoAxesCombined },
  { to: "/fritt", label: "Fritt parti", hint: "Velg styrke, farge og tempo", icon: Swords },
  { to: "/trener", label: "Mike Skolen", hint: "Dagens leksjon, treningsparti med hjelp og grunnoppgaver", icon: GraduationCap },
  { to: "/turnering", label: "Forberedelse", hint: "Åpninger, taktikk og sluttspill", icon: Trophy },
] as const;

const MORE_PATHS: readonly string[] = MORE_NAV.map((n) => n.to);

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const p = useProgress();
  const active = (to: string) => path === to || (to === "/mer" && MORE_PATHS.includes(path)) || (to === "/stigen" && path === "/parti") || (to === "/avatar" && path === "/samling") || (to === "/mer" && path === "/treningsparti");
  const mobileNav = [...PRIMARY_NAV, { to: "/mer", label: "Mer", icon: Ellipsis }] as const;
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-border bg-background px-4 py-8 min-[1100px]:flex">
      <Link to="/" className="mb-8 flex items-center gap-3 px-3 text-lg font-semibold"><ChessKnight className="size-6 text-primary" />Goblin Chess</Link>
      <nav aria-label="Hovednavigasjon" className="space-y-1">
        {PRIMARY_NAV.map(n => <Link key={n.to} to={n.to} aria-current={active(n.to) ? "page" : undefined} className={`nav-link${active(n.to) ? " is-active" : ""}`}><n.icon className="size-5 shrink-0" />{n.label}</Link>)}
        <p className="eyebrow px-3 pt-4 pb-1">Mer</p>
        {MORE_NAV.map(n => <Link key={n.to} to={n.to} aria-current={path === n.to ? "page" : undefined} className={`nav-link${path === n.to ? " is-active" : ""}`}><n.icon className="size-5 shrink-0" />{n.label}</Link>)}
      </nav>
      <div className="mt-auto border-t border-border pt-5">
        <div className="flex items-center gap-3 px-2"><PlayerAvatar className="size-10" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Din avatar</p><p className="text-xs font-medium">{avatarName(p)}</p></div></div>
        <div className="mt-5 flex items-center justify-between gap-2 px-2"><span className="text-xs text-muted-foreground">Tema</span><ThemeToggle /></div>
        <div className="mt-4 flex items-center justify-between px-2"><span className="text-xs text-muted-foreground">Spilllyd</span><MuteToggle /></div>
        <div className="mt-4 flex items-center justify-between gap-2 px-2"><SyncStatus /><LogoutButton /></div>
      </div>
    </aside>
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border bg-background px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] min-[1100px]:hidden">
      <Link to="/" className="flex min-w-0 items-center gap-2 font-semibold"><ChessKnight className="size-5 shrink-0 text-primary" /><span className="truncate">Goblin Chess</span></Link>
      <div className="flex items-center gap-2"><SyncStatus compact /><MuteToggle /></div>
    </header>
    <div className="app-content"><MergeNotice />{children}</div>
    <Celebrations />
    <nav aria-label="Mobilnavigasjon" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg min-[1100px]:hidden">
      {mobileNav.map(n => <Link key={n.to} to={n.to} aria-current={active(n.to) ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-semibold transition-colors ${active(n.to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}><n.icon className="size-6 shrink-0" /><span className="truncate max-w-full">{n.label}</span></Link>)}
    </nav>
  </>;
}
