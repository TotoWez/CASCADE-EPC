/**
 * Subscription plans — the single source of truth for the pricing page, the
 * org usage meters, and (mirrored in SQL) the database limit triggers.
 *
 * Three tiers, priced flat per workspace in AED (seats are a limit, not a
 * per-seat multiplier). Keep `limits` in sync with `plan_limits()` — currently
 * (re)defined in supabase/migrations/0014_refresh_plan_limits.sql.
 */

export type PlanId = "free" | "pro" | "pro_max";

export interface PlanLimits {
  /** null = unlimited (unused today, kept for headroom). */
  projects: number | null;
  nodesPerProject: number | null;
  members: number | null;
  /** Attachment storage cap in MB. */
  storageMb: number | null;
  snapshots: number | null;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Price label, e.g. "0 AED" or "60 AED". */
  price: string;
  /** Sub-label under the price, e.g. "forever" or "/ month". */
  priceSub: string;
  cta: string;
  /** Where the CTA points for a signed-out visitor. */
  ctaTo: string;
  highlighted?: boolean;
  limits: PlanLimits;
  /** Headline capabilities (cumulative — each tier adds to the previous). */
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For trials and small crews getting a project off the ground.",
    price: "0 AED",
    priceSub: "forever",
    cta: "Start free",
    ctaTo: "/signup",
    limits: { projects: 1, nodesPerProject: 300, members: 3, storageMb: 30, snapshots: 10 },
    features: [
      "Volume-weighted WBS rollup",
      "Dependencies, blockers & linked nodes",
      "QAQC / HSE gates",
      "Realtime sync + all PDF reports",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For a contractor running live projects on site.",
    price: "60 AED",
    priceSub: "/ month",
    cta: "Upgrade to Pro",
    ctaTo: "/signup",
    highlighted: true,
    limits: { projects: 5, nodesPerProject: 5_000, members: 50, storageMb: 200, snapshots: 100 },
    features: [
      "Everything in Free, plus:",
      "5 projects · 50 member seats",
      "5,000 nodes per project",
      "200 MB attachments · 100 snapshots",
      "WBS import / export + Flowchart report",
      "Email support",
    ],
  },
  {
    id: "pro_max",
    name: "Pro Max",
    tagline: "For EPCs coordinating many disciplines and stakeholders.",
    price: "120 AED",
    priceSub: "/ month",
    cta: "Upgrade to Pro Max",
    ctaTo: "/signup",
    limits: { projects: 12, nodesPerProject: 12_000, members: 120, storageMb: 500, snapshots: 250 },
    features: [
      "Everything in Pro, plus:",
      "12 projects · 120 member seats",
      "12,000 nodes per project",
      "500 MB attachments · 250 snapshots",
      "Priority support",
    ],
  },
];

/** Format a count limit for display ("Unlimited" when null). */
export function fmtLimit(n: number | null): string {
  return n === null ? "Unlimited" : n.toLocaleString();
}

/** Format a storage limit given in MB, collapsing whole GB (2048 → "2 GB"). */
export function fmtStorage(mb: number | null): string {
  if (mb === null) return "Unlimited";
  if (mb >= 1024 && mb % 1024 === 0) return `${mb / 1024} GB`;
  return `${mb} MB`;
}

/** Look up a plan by its tier id, falling back to Free for unknown tiers. */
export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === (id ?? "free")) ?? PLANS[0]!;
}

/**
 * Consumption thresholds for usage warnings:
 *   ok < 50% ≤ notice < 80% ≤ warning < 100% ≤ full.
 * A null cap means unlimited → always "ok". Enforcement is in the DB triggers;
 * these levels drive the proactive UI warnings only.
 */
export type UsageLevel = "ok" | "notice" | "warning" | "full";

export function usageLevel(used: number, cap: number | null): UsageLevel {
  if (cap === null || cap <= 0) return "ok";
  const ratio = used / cap;
  if (ratio >= 1) return "full";
  if (ratio >= 0.8) return "warning";
  if (ratio >= 0.5) return "notice";
  return "ok";
}

/** Warning copy for a metric at 50% / 80% / 100%, or null below 50% / unlimited. */
export function usageMessage(label: string, used: number, cap: number | null, unit?: string): string | null {
  const level = usageLevel(used, cap);
  if (level === "ok" || cap === null) return null;
  const u = unit ? ` ${unit}` : "";
  const usage = `${used.toLocaleString()}/${cap.toLocaleString()}${u}`;
  if (level === "full") return `${label} limit reached (${usage}) — upgrade to add more.`;
  if (level === "warning") return `${label} almost full (${usage}) — consider upgrading.`;
  return `${label} over half used (${usage}).`;
}

/** Rows for the side-by-side comparison matrix. */
export const COMPARISON: { label: string; key: keyof PlanLimits; fmt?: (v: number | null) => string }[] = [
  { label: "Projects", key: "projects" },
  { label: "Nodes per project", key: "nodesPerProject" },
  { label: "Member seats", key: "members" },
  { label: "Attachment storage", key: "storageMb", fmt: fmtStorage },
  { label: "Snapshot history", key: "snapshots" },
];
