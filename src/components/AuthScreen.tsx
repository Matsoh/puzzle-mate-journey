import type { ReactNode } from "react";
import { ChessKnight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

/** Shared frame for login, reset and gate screens — shows no personal data. */
export function AuthScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold"><ChessKnight className="size-6 text-primary" />Goblin Chess</span>
          <ThemeToggle compact />
        </div>
        <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}
