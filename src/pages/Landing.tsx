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
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  {
    icon: Network,
    title: "Hierarchical WBS",
    body: "Unlimited-depth work breakdown with parent/child rollup, collapsible branches, and instrument-grade node cards.",
  },
  {
    icon: GaugeCircle,
    title: "Volume-weighted progress",
    body: "Parents roll up real progress from children by volume weight — not a naive average. The number means something.",
  },
  {
    icon: GitBranch,
    title: "Dependency awareness",
    body: "Physical blockers propagate automatically. See what is blocking what, and get notified the moment a node is unblocked.",
  },
  {
    icon: Link2,
    title: "Linked / mirrored work",
    body: "The same physical activity in two branches stays in sync — update once, reflected across the whole linked cluster.",
  },
  {
    icon: ShieldCheck,
    title: "QAQC & HSE gates",
    body: "Quality and safety own their own gates. Complied / Not-Complied and Closed / Pending sit alongside the work hierarchy.",
  },
  {
    icon: FileText,
    title: "Client-ready reports",
    body: "Full tree, progress, Gantt, notes, gate punch-lists, and flowchart — exported as branded, professional PDFs.",
  },
];

const STATUS_MODEL = [
  { label: "Not Started", color: "bg-status-notstarted" },
  { label: "On Progress", color: "bg-status-progress" },
  { label: "Done", color: "bg-status-done" },
  { label: "Blocked", color: "bg-status-blocked" },
];

export function Landing() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Brand size={30} />
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              to="/about"
              className="hidden px-3 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink sm:inline-block"
            >
              About
            </Link>
            <ThemeToggle />
            <Link
              to="/signin"
              className="rounded border border-line px-3 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:border-ink-mute hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded bg-brand-blue px-3 py-1.5 font-mono text-2xs uppercase tracking-widest text-white hover:bg-brand-blue-dark"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-engineering">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-canvas/40 to-canvas" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="font-mono text-2xs uppercase tracking-[0.35em] text-brand-blue-light">
            EPC Execution Tracking
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-brand text-4xl leading-tight tracking-tight text-ink sm:text-6xl">
            Plan it. Track it.{" "}
            <span className="text-brand-blue">CASCADE</span> it.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-dim sm:text-lg">
            A hierarchical execution tracker for substation, transmission, and
            industrial projects. Plan the WBS, track real progress, manage
            dependencies, surface blockers, and export client-ready reports —
            with engineering-grade precision.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded bg-brand-blue px-5 py-3 font-mono text-xs uppercase tracking-widest text-white hover:bg-brand-blue-dark"
            >
              Start a project <ArrowRight size={16} />
            </Link>
            <Link
              to="/signin"
              className="rounded border border-line px-5 py-3 font-mono text-xs uppercase tracking-widest text-ink-dim hover:border-ink-mute hover:text-ink"
            >
              Sign in
            </Link>
          </div>

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

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="font-brand text-2xl tracking-wide text-ink">
          Built for EPC execution logic
        </h2>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Not a generic task tracker. The differentiator is the engineering:
          weighted rollup, physical dependencies, mirrored work, and gates.
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

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <Brand size={24} />
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">
            © {new Date().getFullYear()} CASCADE-EPC · cascade-epc.com
          </p>
          <Link
            to="/about"
            className="font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink"
          >
            About & Contact
          </Link>
        </div>
      </footer>
    </div>
  );
}
