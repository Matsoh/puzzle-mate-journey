import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { activateUser, deactivate, decideImport, importDecided, importLegacy, legacySnapshot } from "@/lib/cloud-sync";
import { AppShell } from "./AppShell";
import { AuthScreen } from "./AuthScreen";
import { Button } from "@/components/ui/button";

const PUBLIC_PATHS = ["/innlogging", "/tilbakestill-passord"];
type Phase = "loading" | "out" | "pending" | "error" | "ready";

/**
 * Fail-closed gate: the game only renders after the server confirms the
 * signed-in user is on the approved list and their data has loaded.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [offer, setOffer] = useState<{ uid: string; snap: Record<string, unknown> } | null>(null);
  const current = useRef<string | null>(null);
  const runId = useRef(0);

  async function run(user: User | null) {
    const id = ++runId.current;
    current.current = user?.id ?? null;
    setOffer(null);
    if (!user) { deactivate(); setPhase("out"); return; }
    setPhase("loading");
    const { data: ok, error } = await supabase.rpc("is_approved_player");
    if (id !== runId.current) return;
    if (error) { deactivate(); setPhase("error"); return; }
    if (ok !== true) { deactivate(); setPhase("pending"); return; }
    try {
      const { cloudEmpty } = await activateUser(user.id);
      if (id !== runId.current) return;
      if (cloudEmpty && !importDecided(user.id)) {
        const snap = legacySnapshot();
        if (Object.keys(snap).length) setOffer({ uid: user.id, snap });
      }
      setPhase("ready");
    } catch {
      if (id !== runId.current) return;
      deactivate(); setPhase("error");
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => run(data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") void run(null);
      else if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user && session.user.id !== current.current) void run(session.user);
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPublic = PUBLIC_PATHS.includes(path);
  useEffect(() => {
    if (phase === "out" && !isPublic) navigate({ to: "/innlogging", replace: true });
    if (phase === "ready" && path === "/innlogging") navigate({ to: "/", replace: true });
  }, [phase, isPublic, path, navigate]);

  if (isPublic) return <>{children}</>;
  const signOut = () => supabase.auth.signOut();

  if (phase === "pending") return (
    <AuthScreen title="Venter på godkjenning">
      <p className="text-sm text-muted-foreground">Du er logget inn, men kontoen er ikke godkjent ennå. Spør en voksen om å godkjenne den.</p>
      <Button variant="outline" className="mt-5 h-12 w-full" onClick={signOut}>Logg ut</Button>
    </AuthScreen>
  );
  if (phase === "error") return (
    <AuthScreen title="Ingen forbindelse">
      <p className="text-sm text-muted-foreground">Vi fikk ikke kontakt. Sjekk nettet, og prøv igjen.</p>
      <Button className="mt-5 h-12 w-full" onClick={() => supabase.auth.getUser().then(({ data }) => run(data.user))}>Prøv igjen</Button>
      <Button variant="outline" className="mt-2 h-12 w-full" onClick={signOut}>Logg ut</Button>
    </AuthScreen>
  );
  if (phase !== "ready") return (
    <AuthScreen title="Goblin Chess"><p role="status" className="text-sm text-muted-foreground">Laster…</p></AuthScreen>
  );
  if (offer) return <ImportOffer offer={offer} onDone={() => setOffer(null)} />;
  return <AppShell>{children}</AppShell>;
}

function ImportOffer({ offer, onDone }: { offer: { uid: string; snap: Record<string, unknown> }; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const p = offer.snap.progress as { xp?: number; rating?: number; games?: number; puzzlesSolved?: number } | undefined;
  const t = offer.snap.tournament as { list?: unknown[] } | undefined;
  const lines = [
    p && `${p.xp ?? 0} XP og app-rating ${p.rating ?? "–"}`,
    p && `${p.games ?? 0} partier og ${p.puzzlesSolved ?? 0} løste pusler`,
    offer.snap.trainer && "Trenervalg og treningsøkter",
    t?.list?.length && `${t.list.length} turneringer`,
    offer.snap.prep && "Åpningsplan og øvinger",
  ].filter(Boolean) as string[];

  async function take() {
    setBusy(true); setErr(false);
    try { await importLegacy(offer.uid); onDone(); } catch { setErr(true); setBusy(false); }
  }
  return (
    <AuthScreen title="Ta med fremgangen?">
      <p className="text-sm text-muted-foreground">Denne enheten har fremgang fra før. Vil du ta den med til kontoen din?</p>
      <ul className="my-4 list-disc space-y-1 pl-5 text-sm">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <p className="text-xs text-muted-foreground">Ingenting slettes fra enheten. Vi tar en kopi først.</p>
      {err && <p role="alert" className="mt-3 text-sm text-destructive">Det gikk ikke. Prøv igjen.</p>}
      <Button className="mt-5 h-12 w-full" disabled={busy} onClick={take}>{busy ? "Tar med…" : "Ta med fremgangen fra denne enheten"}</Button>
      <Button variant="outline" className="mt-2 h-12 w-full" disabled={busy} onClick={() => { decideImport(offer.uid, "skipped"); onDone(); }}>Fortsett uten</Button>
    </AuthScreen>
  );
}
