import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, className, ...rest },
  ref,
) {
  return (
    <div className={clsx("relative", className)}>
      <select
        ref={ref}
        className={clsx(
          // appearance-none + our own chevron so the control matches the
          // instrument-panel look in both themes. Focus ring comes from the
          // global *:focus-visible rule (index.css).
          "w-full appearance-none rounded border border-line bg-canvas py-2 pl-3 pr-8 text-sm text-ink",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-mute"
      />
    </div>
  );
});
