import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/AuthScreen";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/innlogging")({
  head: () => ({
    meta: [
      { title: "Logg inn – Goblin Chess" },
      { name: "description", content: "Logg inn for å fortsette sjakktreningen i Goblin Chess." },
      { property: "og:title", content: "Logg inn – Goblin Chess" },
      { property: "og:description", content: "Logg inn for å fortsette sjakktreningen i Goblin Chess." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    // Same message for every failure, so nobody can tell which accounts exist.
    if (error) setMsg({ kind: "error", text: "Det gikk ikke. Sjekk e-post og passord, og prøv igjen." });
  }

  async function forgot(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/tilbakestill-passord` });
    setBusy(false);
    setMsg({ kind: "info", text: "Hvis e-posten finnes hos oss, får du snart en lenke. Sjekk innboksen." });
  }

  return (
    <AuthScreen title={mode === "login" ? "Logg inn" : "Glemt passord"}>
      <form onSubmit={mode === "login" ? login : forgot} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-post</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" />
        </div>
        {mode === "login" && (
          <div className="space-y-2">
            <Label htmlFor="password">Passord</Label>
            <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
        )}
        {msg && <p role={msg.kind === "error" ? "alert" : "status"} className={`text-sm ${msg.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>{msg.text}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full text-base">
          {busy ? "Vent litt…" : mode === "login" ? "Logg inn" : "Send lenke"}
        </Button>
      </form>
      <button type="button" className="mt-4 min-h-11 text-sm text-primary underline-offset-4 hover:underline"
        onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setMsg(null); }}>
        {mode === "login" ? "Glemt passordet?" : "Tilbake til innlogging"}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">Bare godkjente spillere kan logge inn. Det finnes ingen egen registrering.</p>
    </AuthScreen>
  );
}
