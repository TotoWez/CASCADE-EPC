import clsx from "clsx";

/**
 * CASCADE-EPC wordmark: logo mark + Orbitron lockup.
 * `size` scales the mark; the wordmark uses the brand font.
 */
export function Brand({
  size = 32,
  showSlogan = false,
  className,
}: {
  size?: number;
  showSlogan?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <img
        src="/brand/mark.svg"
        width={size}
        height={size}
        alt="CASCADE-EPC"
        className="shrink-0 drop-shadow"
      />
      <div className="leading-none">
        <div className="whitespace-nowrap font-brand text-lg tracking-[0.18em] text-ink">
          CASCADE<span className="text-brand-blue">-</span>EPC
        </div>
        {showSlogan && (
          <div className="mt-1 font-mono text-2xs uppercase tracking-[0.3em] text-ink-mute">
            Plan it. Track it. CASCADE it.
          </div>
        )}
      </div>
    </div>
  );
}
