import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Brand } from "@/components/Brand";
import { AboutModal } from "@/components/AboutModal";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/store/auth";

function isEditableTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

/** Chrome for the authenticated area: top bar + content slot. */
export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const profile = useAuth((s) => s.profile);
  const orgs = useAuth((s) => s.orgs);
  const signOut = useAuth((s) => s.signOut);
  const suspended = orgs.some((o) => o.suspended);
  const [about, setAbout] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);

  // "?" anywhere in the app (outside a field) opens the shortcuts help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !isEditableTarget(e.target)) {
        e.preventDefault();
        setShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2.5">
          <button onClick={() => setAbout(true)} title="About CASCADE-EPC" aria-label="About CASCADE-EPC" className="rounded">
            <Brand size={26} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/app")} title="Home" className="chip bg-surface">
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Home</span>
            </button>
            {profile?.platform_role && (
              <Link to="/app/platform" className="chip bg-surface" title="Platform owner console">
                <ShieldCheck size={16} />
                <span className="hidden sm:inline">Platform</span>
              </Link>
            )}
            <ThemeToggle />
            <Link to="/app/profile" className="chip bg-surface" title="Profile">
              <UserRound size={16} />
              <span className="hidden sm:inline">{profile?.full_name || "Profile"}</span>
            </Link>
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="chip bg-surface"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      {suspended && (
        <div className="border-b border-status-blocked/40 bg-status-blocked/10 px-4 py-2 text-center font-mono text-2xs uppercase tracking-widest text-status-blocked">
          This workspace is suspended — project access is paused. Contact hello@cascade-epc.com.
        </div>
      )}
      <main className="flex-1">{children}</main>
      <AboutModal open={about} onClose={() => setAbout(false)} />
      <ShortcutsModal open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
  );
}
