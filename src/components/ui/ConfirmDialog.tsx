import type { ReactNode } from "react";
import { create } from "zustand";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm action as destructive (red). */
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  pending: Pending | null;
  ask: (opts: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

const useConfirm = create<ConfirmState>((set, get) => ({
  pending: null,
  ask: (opts) =>
    new Promise<boolean>((resolve) => {
      // If a dialog is somehow already open, cancel it before showing the new one.
      get().pending?.resolve(false);
      set({ pending: { ...opts, resolve } });
    }),
  settle: (ok) => {
    get().pending?.resolve(ok);
    set({ pending: null });
  },
}));

/**
 * Promise-based replacement for window.confirm(), styled like the rest of the
 * app. Usage: `if (!(await confirmDialog({ message: "…" }))) return;`
 * Requires a single <ConfirmHost /> mounted at the app root.
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return useConfirm.getState().ask(opts);
}

/** Mount once (next to the Toaster). Renders the active confirmation, if any. */
export function ConfirmHost() {
  const pending = useConfirm((s) => s.pending);
  const settle = useConfirm((s) => s.settle);
  if (!pending) return null;

  return (
    <Modal
      open
      onClose={() => settle(false)}
      title={pending.title ?? "Please confirm"}
      size="sm"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => settle(false)} autoFocus>
            {pending.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={pending.danger ? "danger" : "primary"}
            size="sm"
            onClick={() => settle(true)}
          >
            {pending.confirmLabel ?? "Confirm"}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {pending.danger && (
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-status-blocked" />
        )}
        <div className="text-sm leading-relaxed text-ink-dim">{pending.message}</div>
      </div>
    </Modal>
  );
}
