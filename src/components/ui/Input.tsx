import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-brand-blue",
          className,
        )}
        {...rest}
      />
    );
  },
);

/** Labelled field wrapper with optional hint/error. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block font-mono text-2xs uppercase tracking-widest text-ink-dim"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-2xs text-status-blocked">{error}</p>
      ) : hint ? (
        <p className="text-2xs text-ink-mute">{hint}</p>
      ) : null}
    </div>
  );
}
