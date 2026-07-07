import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

/**
 * Shared sticky header for the public pages (Landing / Pricing / About).
 * Desktop: inline nav chips. Mobile: hamburger → dropdown panel (the links
 * used to simply disappear below `sm`).
 */
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const links = NAV.filter((n) => n.to !== pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" aria-label="CASCADE-EPC home">
          <Brand size={28} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          {links.map((n) => (
            <Link key={n.to} to={n.to} className="chip-ghost">
              {n.label}
            </Link>
          ))}
          <ThemeToggle />
          <Link to="/signin" className="chip">
            Sign in
          </Link>
          <Link to="/signup" className="chip-solid">
            Sign up
          </Link>
        </nav>

        {/* Mobile: theme + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="chip"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div className={clsx("border-t border-line bg-canvas sm:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {links.map((n) => (
            <Link key={n.to} to={n.to} className="chip-ghost" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2">
            <Link to="/signin" className="chip flex-1 justify-center" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link to="/signup" className="chip-solid flex-1 justify-center" onClick={() => setOpen(false)}>
              Sign up
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

/** Shared footer for the public pages. Legal links land here (Track B). */
export function PublicFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <Brand size={24} />
        <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">
          © {new Date().getFullYear()} CASCADE-EPC · Plan it. Track it. CASCADE it.
        </p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link to="/pricing" className="font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
            Pricing
          </Link>
          <Link to="/about" className="font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
            About & Contact
          </Link>
          <Link to="/privacy" className="font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
            Privacy
          </Link>
          <Link to="/terms" className="font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
