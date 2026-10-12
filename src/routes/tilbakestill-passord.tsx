import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/AuthScreen";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/tilbakestill-passord")({
  head: () => ({
    meta: [
      { title: "Nytt passord – Goblin Chess" },
      { name: "description", content: "Velg et nytt passord for Goblin Chess." },
      { property: "og:title", content: "Nytt passord – Goblin Chess" },
      { property: "og:description", content: "Velg et nytt passord for Goblin Chess." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { setReady(true); setChecked(true); }
    });
    supabase.auth.getSession().then(({ data: s }) => { if (s.session && isRecovery) setReady(true); setChecked(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMsg("Passordet må ha minst 8 tegn.");
    if (pw !== pw2) return setMsg("Passordene er ikke like.");
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg("Det gikk ikke. Lenken kan være utløpt, eller passordet er for enkelt.");
    navigate({ to: "/" });
  }

  if (!ready) {
    return (
      <AuthScreen title="Nytt passord">
        <p className="text-sm text-muted-foreground">{checked ? "Lenken er ugyldig eller utløpt. Be om en ny lenke." : "Sjekker lenken…"}</p>
        {checked && <Button className="mt-4 h-12 w-full" onClick={() => navigate({ to: "/innlogging" })}>Til innlogging</Button>}
      </AuthScreen>
    );
  }
  return (
    <AuthScreen title="Nytt passord">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="pw">Nytt passord</Label><PasswordInput id="pw" value={pw} onChange={setPw} autoComplete="new-password" /></div>
        <div className="space-y-2"><Label htmlFor="pw2">Skriv det igjen</Label><PasswordInput id="pw2" value={pw2} onChange={setPw2} autoComplete="new-password" /></div>
        {msg && <p role="alert" className="text-sm text-destructive">{msg}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full text-base">{busy ? "Lagrer…" : "Lagre passord"}</Button>
      </form>
    </AuthScreen>
  );
}
