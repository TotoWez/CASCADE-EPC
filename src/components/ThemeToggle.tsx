import { Moon, Sun } from "lucide-react";
import { useUi } from "@/store/ui";

export function ThemeToggle() {
  const theme = useUi((s) => s.theme);
  const toggle = useUi((s) => s.toggleTheme);
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
      className="inline-flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1.5 text-ink-dim transition-colors hover:text-ink hover:border-ink-mute"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="font-mono text-2xs uppercase tracking-widest">
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}
