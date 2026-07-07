import clsx from "clsx";

/** Shimmering placeholder block for content-heavy loading states. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx("animate-pulse rounded bg-surface-2", className)}
    />
  );
}

/** Card-shaped skeleton matching the projects-list card layout. */
export function CardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-4 h-2 w-full" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}
