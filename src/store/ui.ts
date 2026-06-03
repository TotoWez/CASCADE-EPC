import { create } from "zustand";

export type Theme = "dark" | "light";

const THEME_KEY = "cascade.theme";

function readInitialTheme(): Theme {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  }
  return "dark"; // SCADA default
}

/** Apply the theme class to <html> so CSS variables flip. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

interface UiState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

export const useUi = create<UiState>((set, get) => ({
  theme: readInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));

/** Call once on boot to sync the <html> class with the persisted theme. */
export function initTheme() {
  applyTheme(useUi.getState().theme);
}
