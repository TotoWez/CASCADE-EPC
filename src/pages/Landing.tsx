import { Link } from "react-router-dom";
import {
  Network,
  GitBranch,
  ShieldCheck,
  Link2,
  FileText,
  GaugeCircle,
  ArrowRight,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/PublicHeader";

const STEPS = [
  {
    n: "01",
    title: "Plan the breakdown",
    body: "Build your WBS to any depth. Assign volumes, categories, and owners so the structure mirrors how the work is actually delivered on site.",
  },
  {
    n: "02",
    title: "Track real progress",
    body: "Field updates roll up by volume weight, so a parent's percentage means something. Dependencies flag blockers the moment they appear.",
  },
  {
    n: "03",
    title: "Report with confidence",
    body: "Export a branded, client-ready PDF in a click — full tree, progress, Gantt, gates, or notes. No more rebuilding the deck every week.",
  },
];

const FEATURES = [
  {
    icon: Network,
    title: "Hierarchical WBS",
    body: "Break work down to any depth. Collapsible branches and instrument-grade cards keep even a huge tree readable at a glance.",
  },
  {
    icon: GaugeCircle,
    title: "Progress that means something",
    body: "Parents roll up real progress from their children by volume weight — not a naive average. The headline number you report is one you can trust.",
  },
  {
    icon: GitBranch,
    title: "Blockers you see coming",
    body: "Mark what depends on what. Blocked work propagates automatically, and the team gets a nudge the moment a node is cleared.",
  },
  {
    icon: Link2,
    title: "Mirrored work stays in sync",
    body: "When the same physical activity lives in two branches, update it once — the whole linked cluster reflects the change.",
  },
  {
    icon: ShieldCheck,
    title: "Quality & safety gates",
    body: "QAQC and HSE own their own sign-off, right beside the work. Complied / Not-Complied and Closed / Pending — never buried in a side sheet.",
  },
  {
    icon: FileText,
    title: "Client-ready reports",
    body: "Full tree, progress, Gantt, notes, gate punch-lists, and flowchart — exported as branded, professional PDFs ready to send.",
  },
];

const STATUS_MODEL = [
  { label: "Not Started", color: "bg-status-notstarted" },
  { label: "On Progress", color: "bg-status-progress" },
  { label: "Done", color: "bg-status-done" },
  { label: "Blocked", color: "bg-status-blocked" },
];

function ctaPrimary(label: string) {
  return (
    <Link
      to="/signup"
      className="inline-flex items-center gap-2 rounded bg-brand-blue px-5 py-3 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:bg-brand-blue-dark"
    >
      {label} <ArrowRight size={16} />
    </Link>
  );
}

export function Landing() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-engineering">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-canvas/40 to-canvas" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="rise-in font-mono text-2xs uppercase tracking-[0.35em] text-brand-blue-light">
            EPC execution tracking
          </p>
          <h1 className="rise-in rise-in-1 mx-auto mt-4 max-w-3xl font-brand text-4xl leading-tight tracking-tight text-ink sm:text-6xl">
            Plan it. Track it.{" "}
            <span className="text-brand-blue">CASCADE</span> it.
          </h1>
          <p className="rise-in rise-in-2 mx-auto mt-6 max-w-2xl text-base text-ink-dim sm:text-lg">
            The execution tracker built for substation, transmission, and industrial projects.
            Plan your work breakdown, watch real progress roll up from the field, catch blockers
            before they spread, and hand clients a clean report — all in one fast, engineering-grade
            workspace.
          </p>
          <div className="rise-in rise-in-3 mt-10 flex items-center justify-center gap-3">
            {ctaPrimary("Start free")}
            <Link
              to="/signin"
              className="rounded border border-line px-5 py-3 font-mono text-xs uppercase tracking-widest text-ink-dim transition-colors hover:border-ink-mute hover:text-ink"
            >
              Sign in
            </Link>
          </div>
          <p className="rise-in rise-in-3 mt-4 text-2xs text-ink-mute">
            Free to start · no credit card. Invited by a teammate?{" "}
            <Link to="/join" className="text-brand-blue hover:underline">
              Join with a code
            </Link>
          </p>

          {/* Status model strip */}
          <div className="mx-auto mt-14 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-line pt-6">
            {STATUS_MODEL.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                <span className="font-mono text-2xs uppercase tracking-widest text-ink-mute">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="font-mono text-2xs uppercase tracking-[0.25em] text-brand-blue-light">How it works</p>
          <h2 className="mt-2 font-brand text-2xl tracking-wide text-ink">From plan to client report</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-card border border-line bg-surface p-6">
                <span className="font-mono text-3xl font-bold tracking-tight text-brand-blue/30">{s.n}</span>
                <h3 className="mt-3 font-brand text-sm uppercase tracking-widest text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-dim">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="font-mono text-2xs uppercase tracking-[0.25em] text-brand-blue-light">Why it's different</p>
        <h2 className="mt-2 font-brand text-2xl tracking-wide text-ink">
          Built on EPC execution logic
        </h2>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Not a generic task board. The difference is the engineering underneath — weighted rollup,
          physical dependencies, mirrored work, and discipline gates.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface p-6">
              <f.icon className="text-brand-blue" size={22} />
              <h3 className="mt-4 font-brand text-sm uppercase tracking-widest text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-line bg-engineering">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="font-brand text-2xl tracking-wide text-ink sm:text-3xl">
            Get your project under control
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-dim">
            Start free today — build a WBS, invite your team, and generate your first client report
            in an afternoon.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {ctaPrimary("Start free")}
            <Link
              to="/pricing"
              className="rounded border border-line px-5 py-3 font-mono text-xs uppercase tracking-widest text-ink-dim transition-colors hover:border-ink-mute hover:text-ink"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
