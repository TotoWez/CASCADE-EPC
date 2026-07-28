import type { ReactNode } from "react";

/**
 * Consistent page header for app pages: a mono kicker, a brand-font title, an
 * optional subtitle, and a right-aligned actions slot. Establishes the vertical
 * rhythm and hierarchy shared across the dashboard, org, platform, and profile.
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        {kicker && (
          <p className="font-mono text-2xs uppercase tracking-[0.25em] text-brand-blue-light">{kicker}</p>
        )}
        <h1 className="mt-1.5 font-brand text-2xl tracking-wide text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-ink-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
