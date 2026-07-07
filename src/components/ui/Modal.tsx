import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focusable elements currently rendered inside the container. */
function focusables(box: HTMLElement): HTMLElement[] {
  return Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

/**
 * Accessible overlay modal. Closes on Escape and (optionally) backdrop click.
 * Traps Tab focus inside while open and restores focus to the trigger on close.
 * Destructive flows should pass closeOnBackdrop={false}.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Initial focus on open ([autofocus] first, else first focusable, else the
  // dialog itself) and focus restoration to the trigger on close/unmount.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const box = boxRef.current;
    if (box) {
      const target =
        box.querySelector<HTMLElement>("[autofocus]") ?? focusables(box)[0] ?? box;
      target.focus();
    }
    return () => prev?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Keep Tab / Shift+Tab cycling inside the dialog.
      if (e.key !== "Tab") return;
      const box = boxRef.current;
      if (!box) return;
      const items = focusables(box);
      if (items.length === 0) {
        e.preventDefault();
        box.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      const inside = active ? box.contains(active) : false;
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose()}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={clsx(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-panel outline-none",
          widths,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-brand text-sm uppercase tracking-widest text-ink">{title}</h2>
            <button onClick={onClose} className="text-ink-mute hover:text-ink" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
