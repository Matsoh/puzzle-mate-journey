import { Link, useRouterState } from "@tanstack/react-router";
import { ChartNoAxesCombined, House, Puzzle, Swords, Crown, ChessKnight, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { MuteToggle } from "./AppHeader";
import { PlayerAvatar } from "./CoachAvatar";
import { COACH_NAME } from "@/lib/coach-config";

const navigation = [
  { to: "/", label: "Oversikt", mobile: "Oversikt", icon: House },
  { to: "/pusler", label: "Dagens pusler", mobile: "Pusler", icon: Puzzle },
  { to: "/stigen", label: "Motstanderstigen", mobile: "Stigen", icon: Crown },
  { to: "/trener", label: "Trener", mobile: "Trener", icon: GraduationCap },
  { to: "/fritt", label: "Fritt parti", mobile: "Fritt parti", icon: Swords },
  { to: "/fremgang", label: "Fremgang", mobile: "Fremgang", icon: ChartNoAxesCombined, desktopOnly: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-border bg-background px-4 py-8 min-[1100px]:flex">
      <Link to="/" className="mb-10 flex items-center gap-3 px-3 text-lg font-semibold"><ChessKnight className="size-6 text-primary" />Goblin Chess</Link>
      <nav aria-label="Hovednavigasjon" className="space-y-2">{navigation.map(n => <Link key={n.to} to={n.to} aria-current={path === n.to ? "page" : undefined} className={`nav-link${path === n.to ? " is-active" : ""}`}><n.icon className="size-5 shrink-0" />{n.label}</Link>)}</nav>
      <div className="mt-auto border-t border-border pt-5">
        <div className="flex items-center gap-3 px-2"><PlayerAvatar className="size-10" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Din avatar</p><p className="text-xs font-medium">{COACH_NAME}</p></div></div>
        <div className="mt-5 flex items-center justify-between px-2"><span className="text-xs text-muted-foreground">Spilllyd</span><MuteToggle /></div>
      </div>
    </aside>
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border bg-background px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] min-[1100px]:hidden"><Link to="/" className="flex min-w-0 items-center gap-2 font-semibold"><ChessKnight className="size-5 shrink-0 text-primary" /><span className="truncate">Goblin Chess</span></Link><MuteToggle /></header>
    <div className="app-content">{children}</div>
    <nav aria-label="Mobilnavigasjon" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg min-[1100px]:hidden">{navigation.filter(n => !("desktopOnly" in n)).map(n => <Link key={n.to} to={n.to} aria-current={path === n.to ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors ${path === n.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}><n.icon className="size-5 shrink-0" /><span className="truncate max-w-full">{n.mobile}</span></Link>)}</nav>
  </>;
}