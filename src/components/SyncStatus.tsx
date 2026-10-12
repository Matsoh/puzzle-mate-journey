import { Cloud, CloudOff, LogOut, RefreshCw } from "lucide-react";
import { dismissMergeNotice, retrySync, signOutSafely, useMergeNotices, useSyncStatus } from "@/lib/cloud-sync";
import { Button } from "@/components/ui/button";

/** Shows whether progress has reached the server. Never claims success on a network error. */
export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const s = useSyncStatus();
  if (s === "error") {
    return (
      <button type="button" onClick={retrySync} title="Kun lagret på denne enheten – prøv igjen"
        className="flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-destructive hover:underline">
        <CloudOff className="size-4 shrink-0" />{compact ? <span className="sr-only">Kun lagret på denne enheten – prøv igjen</span> : "Kun lagret på denne enheten – prøv igjen"}
      </button>
    );
  }
  const label = s === "saving" ? "Lagrer…" : "Lagret";
  return (
    <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground" title={label}>
      {s === "saving" ? <RefreshCw className="size-4 animate-spin" /> : <Cloud className="size-4" />}
      <span className={compact ? "sr-only" : ""}>{label}</span>
    </span>
  );
}

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <Button variant="ghost" size={compact ? "icon" : "sm"} aria-label="Logg ut" title="Logg ut"
      onClick={() => void signOutSafely()}
      className={compact ? "size-10 shrink-0 rounded-lg border border-border text-muted-foreground" : "text-muted-foreground"}>
      <LogOut className="size-4" />{!compact && "Logg ut"}
    </Button>
  );
}

/** Tells the player when progress from another device was combined with this one. */
export function MergeNotice() {
  const n = useMergeNotices();
  if (!n) return null;
  return (
    <div role="status" className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
      <span>Du har spilt på en annen enhet også. Fremgangen er slått sammen, ingenting er borte.</span>
      <Button variant="ghost" size="sm" onClick={dismissMergeNotice}>Ok</Button>
    </div>
  );
}
