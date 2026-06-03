import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import clsx from "clsx";
import { useToasts, type ToastKind } from "@/store/toast";

const ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const ACCENT: Record<ToastKind, string> = {
  success: "border-l-brand-green",
  error: "border-l-status-blocked",
  info: "border-l-brand-blue",
};

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={clsx(
              "pointer-events-auto flex items-start gap-2 rounded border border-l-2 border-line bg-surface px-3 py-2 shadow-panel",
              ACCENT[t.kind],
            )}
          >
            <Icon
              size={16}
              className={clsx(
                "mt-0.5 shrink-0",
                t.kind === "success" && "text-brand-green",
                t.kind === "error" && "text-status-blocked",
                t.kind === "info" && "text-brand-blue",
              )}
            />
            <p className="flex-1 text-sm text-ink">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-ink-mute hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
