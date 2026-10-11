import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme, type Theme } from "@/lib/theme";

const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Lys", Icon: Sun },
  { value: "dark", label: "Mørk", Icon: Moon },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  return (
    <div role="group" aria-label="Fargetema" className="theme-toggle">
      {options.map(({ value, label, Icon }) => (
        <button key={value} type="button" aria-pressed={theme === value} aria-label={compact ? `${label} modus` : undefined}
          onClick={() => setTheme(value)} className="theme-toggle__btn">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className={compact ? "max-[379px]:sr-only" : undefined}>{label}</span>
        </button>
      ))}
    </div>
  );
}
