import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

/**
 * Titled surface card with a header band (icon + title + optional action) and a
 * padded body. Generalises the ad-hoc section cards used across About, OrgAdmin,
 * and the project workspace so they share one look.
 */
export function Section({
  icon: Icon,
  title,
  action,
  children,
  bodyClassName,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <section className={clsx("overflow-hidden rounded-card border border-line bg-surface", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 font-brand text-sm uppercase tracking-widest text-ink">
          {Icon && <Icon size={15} className="text-brand-blue" />} {title}
        </h2>
        {action}
      </div>
      <div className={clsx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
