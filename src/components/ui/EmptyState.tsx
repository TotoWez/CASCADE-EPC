import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Centered empty/zero state: icon, optional heading, message, optional action. */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
      {Icon && <Icon className="mx-auto text-ink-mute" size={28} />}
      {title && <p className="mt-3 font-brand text-sm uppercase tracking-widest text-ink">{title}</p>}
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-dim">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
