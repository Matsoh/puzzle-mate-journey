import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required className="h-12 pr-12 text-base" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Skjul passord" : "Vis passord"} aria-pressed={show}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
