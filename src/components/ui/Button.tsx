import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-blue text-white hover:bg-brand-blue-dark border-transparent",
  outline: "bg-surface text-ink border-line hover:border-ink-mute",
  ghost: "bg-transparent text-ink-dim hover:text-ink hover:bg-surface-2 border-transparent",
  danger: "bg-status-blocked text-white hover:opacity-90 border-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-2xs",
  md: "px-4 py-2 text-xs",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded border font-mono uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
});
