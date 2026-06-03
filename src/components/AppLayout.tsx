import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/store/auth";

/** Chrome for the authenticated area: top bar + content slot. */
export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);

  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link to="/app">
            <Brand size={26} />
          </Link>
          <div className="flex items-center gap-2">
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
    </div>
  );
}
