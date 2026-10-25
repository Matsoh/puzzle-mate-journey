import { useCallback, useEffect, useRef, useState } from "react";
import { nextPremove, type Premove } from "@/lib/premove";

/**
 * Unlimited premove queue. `play` must apply a move and return whether it
 * was accepted; `promotion` is passed through for auto-queen premoves.
 */
export function usePremoves(opts: { fen: string; myTurn: boolean; active: boolean; play: (from: string, to: string, promotion?: string) => boolean | Promise<boolean> }) {
  const [queue, setQueue] = useState<Premove[]>([]);
  const firing = useRef(false);
  const add = useCallback((from: string, to: string) => setQueue((q) => [...q, { from, to }]), []);
  const clear = useCallback(() => setQueue([]), []);
  useEffect(() => { if (!opts.active) setQueue([]); }, [opts.active]);
  useEffect(() => {
    if (!opts.active || !opts.myTurn || queue.length === 0 || firing.current) return;
    const n = nextPremove(opts.fen, queue);
    if (!n) { setQueue([]); return; }
    firing.current = true;
    const t = setTimeout(async () => {
      try {
        const ok = await opts.play(n.move.from, n.move.to, n.promotion);
        setQueue(ok ? n.rest : []);
      } catch { setQueue([]); }
      finally { firing.current = false; }
    }, 60);
    return () => { clearTimeout(t); firing.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.fen, opts.myTurn, opts.active, queue]);
  return { queue, onAdd: add, onClear: clear };
}
