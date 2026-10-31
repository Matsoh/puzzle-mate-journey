import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GROUP_LABEL, OPENINGS } from "@/data/openings";
import { MAX_OPENINGS, cleanPlan, type Plan } from "@/lib/prep";
import { cn } from "@/lib/utils";

/** Tobias's repertoire: one opening as White, at least one as Black, at most five. Mike drills exactly these. */
export function RepertoirePicker({ initial, onSave, onCancel }: { initial: Plan | null; onSave: (p: Plan) => void; onCancel?: (() => void) | undefined }) {
  const [ids, setIds] = useState<string[]>(initial?.openings ?? []);
  const toggle = (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_OPENINGS ? cur : [...cur, id]));
  const has = (g: "white" | "e4" | "d4") => OPENINGS.some((o) => o.group === g && ids.includes(o.id));
  const ready = has("white") && (has("e4") || has("d4"));
  return (
    <div className="space-y-4">
      {(["white", "e4", "d4"] as const).map((g) => (
        <fieldset key={g}>
          <legend className="mb-2 text-sm font-bold">{GROUP_LABEL[g]}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPENINGS.filter((o) => o.group === g).map((o) => {
              const on = ids.includes(o.id);
              return (
                <button key={o.id} type="button" aria-pressed={on} onClick={() => toggle(o.id)} className={cn("quest !grid-cols-[auto_minmax(0,1fr)] text-left", on && "is-done")}>
                  <span className="quest__check">{on ? <CheckCircle2 className="size-5" /> : <span className="text-base">♟</span>}</span>
                  <span className="min-w-0"><span className="block font-semibold leading-tight">{o.name}</span><span className="block text-xs text-muted-foreground">{o.summary}</span></span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <p className="text-xs text-muted-foreground">Én med hvit og minst én med svart, maks {MAX_OPENINGS} – færre er bedre, du skal kunne dem utenat. Mike terper akkurat disse i åpningstimene.</p>
      <div className="flex gap-2">
        <Button size="lg" disabled={!ready} onClick={() => onSave(cleanPlan({ mode: ids.length === 1 ? "one" : "many", openings: ids }))}>Lagre repertoaret</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Avbryt</Button>}
      </div>
    </div>
  );
}
