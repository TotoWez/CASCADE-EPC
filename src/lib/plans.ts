/**
 * Subscription plans — the single source of truth for the pricing page, the
 * org usage meters, and (mirrored in SQL) the database limit triggers.
 *
 * Three tiers, priced flat per workspace in AED (seats are a limit, not a
 * per-seat multiplier). Keep `limits` in sync with `plan_limits()` in
 * supabase/migrations/0012_platform_and_billing.sql.
 */

export type PlanId = "free" | "pro" | "pro_max";

export interface PlanLimits {
  /** null = unlimited (unused today, kept for headroom). */
  projects: number | null;
  nodesPerProject: number | null;
  members: number | null;
  /** Attachment storage cap in MB (Free = 300 MB, so MB not GB). */
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
    limits: { projects: 1, nodesPerProject: 300, members: 3, storageMb: 300, snapshots: 5 },
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
    limits: { projects: 5, nodesPerProject: 5_000, members: 50, storageMb: 2_048, snapshots: 50 },
    features: [
      "Everything in Free, plus:",
      "5 projects · 50 member seats",
      "5,000 nodes per project",
      "2 GB attachments · 50 snapshots",
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
    limits: { projects: 12, nodesPerProject: 12_000, members: 120, storageMb: 5_120, snapshots: 120 },
    features: [
      "Everything in Pro, plus:",
      "12 projects · 120 member seats",
      "12,000 nodes per project",
      "5 GB attachments · 120 snapshots",
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

/** Rows for the side-by-side comparison matrix. */
export const COMPARISON: { label: string; key: keyof PlanLimits; fmt?: (v: number | null) => string }[] = [
  { label: "Projects", key: "projects" },
  { label: "Nodes per project", key: "nodesPerProject" },
  { label: "Member seats", key: "members" },
  { label: "Attachment storage", key: "storageMb", fmt: fmtStorage },
  { label: "Snapshot history", key: "snapshots" },
];
