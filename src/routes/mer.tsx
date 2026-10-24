import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MORE_NAV } from "@/components/AppShell";
import { MuteToggle } from "@/components/AppHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton, SyncStatus } from "@/components/SyncStatus";
import { PlayerAvatar } from "@/components/CoachAvatar";
import { avatarName } from "@/lib/avatar";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/mer")({
  head: () => ({ meta: [{ title: "Mer – Goblin Chess" }] }),
  component: More,
});

function More() {
  const p = useProgress();
  return (
    <main className="page-layout page-narrow">
      <h1 className="page-title mb-5">Mer</h1>
      <div className="space-y-3">
        {MORE_NAV.map((n) => (
          <Link key={n.to} to={n.to} className="quest">
            <span className="quest__check"><n.icon className="size-5" /></span>
            <span className="min-w-0"><span className="block font-semibold leading-tight">{n.label}</span><span className="block text-xs text-muted-foreground">{n.hint}</span></span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
      <section className="card-game mt-8 p-4" aria-label="Innstillinger">
        <div className="flex items-center gap-3"><PlayerAvatar className="size-10" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Din avatar</p><p className="text-sm font-medium">{avatarName(p)}</p></div></div>
        <div className="mt-5 flex items-center justify-between gap-2"><span className="text-sm">Tema</span><ThemeToggle /></div>
        <div className="mt-4 flex items-center justify-between"><span className="text-sm">Spilllyd</span><MuteToggle /></div>
        <div className="mt-4 flex items-center justify-between gap-2"><SyncStatus /><LogoutButton /></div>
      </section>
    </main>
  );
}
