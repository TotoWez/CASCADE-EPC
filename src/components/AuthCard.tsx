import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Centered card used by all auth / onboarding screens. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-full place-items-center bg-canvas bg-engineering px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/">
            <Brand size={30} />
          </Link>
          <ThemeToggle />
        </div>
        <div className="rounded-card border border-line bg-surface p-7 shadow-panel">
          <h1 className="font-brand text-xl tracking-wide text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-dim">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-ink-dim">{footer}</div>}
      </div>
    </div>
  );
}
