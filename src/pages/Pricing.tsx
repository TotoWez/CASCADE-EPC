import { Link } from "react-router-dom";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/PublicHeader";
import { useAuth } from "@/store/auth";
import { PLANS, COMPARISON, fmtLimit, type Plan } from "@/lib/plans";

type ComparisonRow = (typeof COMPARISON)[number];

function PlanCta({ plan }: { plan: Plan }) {
  const authed = useAuth((s) => s.status === "authed");
  // Signed-in visitors upgrade from their workspace billing page; guests sign up.
  const to = authed ? (plan.id === "free" ? "/app" : "/app/org") : plan.ctaTo;
  const label = authed && plan.id !== "free" ? plan.cta : authed ? "Open app" : plan.cta;
  const cls = plan.highlighted
    ? "bg-brand-blue text-white hover:bg-brand-blue-dark"
    : "border border-line text-ink-dim hover:border-ink-mute hover:text-ink";
  const base = "mt-5 inline-flex w-full items-center justify-center rounded px-4 py-2 font-mono text-2xs uppercase tracking-widest";
  return to.startsWith("mailto:") ? (
    <a href={to} className={`${base} ${cls}`}>{label}</a>
  ) : (
    <Link to={to} className={`${base} ${cls}`}>{label}</Link>
  );
}

function comparisonCell(plan: Plan, row: ComparisonRow): string {
  const v = plan.limits[row.key];
  return row.fmt ? row.fmt(v) : fmtLimit(v);
}

export function Pricing() {
  return (
    <div className="min-h-full bg-canvas bg-engineering text-ink">
      <PublicHeader />

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
          <ArrowLeft size={14} /> Home
        </Link>

        <div className="text-center">
          <h1 className="rise-in font-brand text-3xl tracking-wide sm:text-4xl">Plans &amp; pricing</h1>
          <p className="rise-in rise-in-1 mx-auto mt-3 max-w-2xl text-ink-dim">
            Simple tiers that scale with the size of your work breakdown, your team, and your project
            portfolio. Start free and grow into it.
          </p>
          <p className="rise-in rise-in-2 mt-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/40 bg-brand-blue/10 px-4 py-1.5 font-mono text-2xs uppercase tracking-widest text-brand-blue-light">
            <Sparkles size={13} /> Flat monthly pricing in AED · cancel anytime
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-card border bg-surface p-6 ${
                plan.highlighted ? "border-brand-blue ring-1 ring-brand-blue/50" : "border-line"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-brand-blue px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white">
                  Most popular
                </span>
              )}
              <h2 className="font-brand text-lg uppercase tracking-widest text-ink">{plan.name}</h2>
              <p className="mt-1 min-h-[2.5rem] text-2xs text-ink-mute">{plan.tagline}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-brand text-3xl text-ink">{plan.price}</span>
                <span className="font-mono text-2xs text-ink-mute">{plan.priceSub}</span>
              </div>
              <PlanCta plan={plan} />
              <ul className="mt-5 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-dim">
                    <Check size={14} className="mt-0.5 shrink-0 text-brand-green" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Comparison matrix */}
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="px-4 py-3 text-left font-mono text-2xs uppercase tracking-widest text-ink-mute">Limits</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-left font-brand text-2xs uppercase tracking-widest text-ink">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.key} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 text-ink-dim">{row.label}</td>
                  {PLANS.map((p) => (
                    <td key={p.id} className="px-4 py-2.5 font-mono text-2xs text-ink">{comparisonCell(p, row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-2xs text-ink-mute">
          Need something specific? <a href="mailto:hello@cascade-epc.com" className="text-brand-blue hover:underline">hello@cascade-epc.com</a>
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
