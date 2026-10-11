import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
export const THEME_KEY = "goblin-chess.theme";
export const THEME_COLORS: Record<Theme, string> = { dark: "#0c1210", light: "#f7f3ea" };

/** Pure: any unknown/missing stored value means dark (default for existing users). */
export function parseTheme(value: unknown): Theme {
  return value === "light" ? "light" : "dark";
}

/** Inline script run in <head> before first paint. Keep in sync with applyTheme. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})==="light"?"light":"dark";}catch(e){t="dark"}var r=document.documentElement;r.classList.remove("dark","light");r.classList.add(t);r.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?${JSON.stringify(THEME_COLORS.light)}:${JSON.stringify(THEME_COLORS.dark)});})();`;

const listeners = new Set<() => void>();

function read(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function applyTheme(t: Theme) {
  const r = document.documentElement;
  r.classList.remove("dark", "light");
  r.classList.add(t);
  r.style.colorScheme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[t]);
}

export function setTheme(t: Theme) {
  applyTheme(t);
  try { localStorage.setItem(THEME_KEY, t); } catch { /* storage blocked: still applies for this page */ }
  listeners.forEach(l => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY) { applyTheme(parseTheme(e.newValue)); l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "dark");
}
