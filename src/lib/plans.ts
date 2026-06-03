/**
 * Provisional subscription plans — shown for planning only. CASCADE-EPC is free
 * during the beta; prices here are placeholders for a future billing rollout.
 *
 * Plans scale on the dimensions that actually cost us money / signal team size:
 * number of projects, WBS size (nodes per project), org seats, attachment
 * storage, snapshot history, plus a few gated capabilities. Inspired by the
 * tiering of ClickUp / Monday / Asana, adapted to EPC execution tracking.
 */

export type PlanId = "free" | "team" | "business" | "enterprise";

export interface PlanLimits {
  /** null = unlimited */
  projects: number | null;
  nodesPerProject: number | null;
  members: number | null;
  storageGb: number | null;
  snapshots: number | null;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Provisional price label, e.g. "$0" or "$19". */
  price: string;
  /** Sub-label under the price, e.g. "per editor / month". */
  priceSub: string;
  cta: string;
  /** Where the CTA points. */
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
    price: "$0",
    priceSub: "forever",
    cta: "Start free",
    ctaTo: "/signup",
    limits: { projects: 3, nodesPerProject: 500, members: 5, storageGb: 1, snapshots: 10 },
    features: [
      "Volume-weighted WBS rollup",
      "Dependencies, blockers & linked nodes",
      "QAQC / HSE gates",
      "Realtime sync + all PDF reports",
      "Community support",
    ],
  },
  {
    id: "team",
    name: "Team",
    tagline: "For a single contractor running live projects on site.",
    price: "$19",
    priceSub: "per editor / month",
    cta: "Start free",
    ctaTo: "/signup",
    limits: { projects: 25, nodesPerProject: 5_000, members: 25, storageGb: 25, snapshots: 90 },
    features: [
      "Everything in Free, plus:",
      "WBS import / export (JSON)",
      "Flowchart report",
      "90-day snapshot history",
      "Email support",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For EPCs coordinating many disciplines and stakeholders.",
    price: "$39",
    priceSub: "per editor / month",
    cta: "Start free",
    ctaTo: "/signup",
    highlighted: true,
    limits: { projects: 150, nodesPerProject: 20_000, members: 100, storageGb: 100, snapshots: null },
    features: [
      "Everything in Team, plus:",
      "Unlimited snapshot history",
      "Usage analytics & org dashboards",
      "Advanced roles & invite controls",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For programs that need security, scale and a contract.",
    price: "Custom",
    priceSub: "talk to us",
    cta: "Contact us",
    ctaTo: "mailto:hello@cascade-epc.com?subject=CASCADE-EPC%20Enterprise",
    limits: { projects: null, nodesPerProject: null, members: null, storageGb: null, snapshots: null },
    features: [
      "Everything in Business, plus:",
      "SSO / SAML & SCIM provisioning",
      "Audit log & data residency",
      "Dedicated success manager",
      "Uptime SLA & onboarding",
    ],
  },
];

/** Format a limit value for display ("Unlimited" when null). */
export function fmtLimit(n: number | null): string {
  return n === null ? "Unlimited" : n.toLocaleString();
}

/** Rows for the side-by-side comparison matrix. */
export const COMPARISON: { label: string; key: keyof PlanLimits; suffix?: string }[] = [
  { label: "Projects", key: "projects" },
  { label: "Nodes per project", key: "nodesPerProject" },
  { label: "Members (seats)", key: "members" },
  { label: "Attachment storage", key: "storageGb", suffix: " GB" },
  { label: "Snapshot history", key: "snapshots" },
];
