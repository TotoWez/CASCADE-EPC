import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut, UserRound } from "lucide-react";
import { Brand } from "@/components/Brand";
import { AboutModal } from "@/components/AboutModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/store/auth";

/** Chrome for the authenticated area: top bar + content slot. */
export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const [about, setAbout] = useState(false);

  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2.5">
          <button onClick={() => setAbout(true)} title="About CASCADE-EPC" aria-label="About CASCADE-EPC" className="rounded">
            <Brand size={26} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/app")}
              title="Home"
              className="inline-flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1.5 text-ink-dim hover:text-ink hover:border-ink-mute"
            >
              <LayoutGrid size={16} />
              <span className="hidden font-mono text-2xs uppercase tracking-widest sm:inline">Home</span>
            </button>
            <ThemeToggle />
            <Link
              to="/app/profile"
              className="inline-flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1.5 text-ink-dim hover:text-ink hover:border-ink-mute"
              title="Profile"
            >
              <UserRound size={16} />
              <span className="hidden font-mono text-2xs uppercase tracking-widest sm:inline">
                {profile?.full_name || "Profile"}
              </span>
            </Link>
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="inline-flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1.5 text-ink-dim hover:text-ink hover:border-ink-mute"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <AboutModal open={about} onClose={() => setAbout(false)} />
    </div>
  );
}
