import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Loader2, Ban, RotateCcw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/store/auth";
import { PLANS, planById, fmtStorage, type PlanId } from "@/lib/plans";
import { platformOverview, setTier, setSuspended, type PlatformOrg } from "@/lib/api/platform";
import { toast } from "@/store/toast";

const TIER_OPTIONS = PLANS.map((p) => ({ value: p.id, label: p.name }));

export function PlatformAdmin() {
  const profile = useAuth((s) => s.profile);
  const status = useAuth((s) => s.status);

  const [orgs, setOrgs] = useState<PlatformOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const isPlatform = Boolean(profile?.platform_role);

  useEffect(() => {
    if (!isPlatform) return;
    platformOverview()
      .then(setOrgs)
      .catch((e) => toast.fail(e))
      .finally(() => setLoading(false));
  }, [isPlatform]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.ownerEmail ?? "").toLowerCase().includes(q),
    );
  }, [orgs, query]);

  // Auth still resolving — wait before deciding to redirect.
  if (status === "loading" || (status === "authed" && !profile)) {
    return (
      <AppLayout>
        <div className="grid place-items-center py-24">
          <Loader2 className="animate-spin text-brand-blue" size={26} />
        </div>
      </AppLayout>
    );
  }
  if (!isPlatform) return <Navigate to="/app" replace />;

  function withBusy(orgId: string, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(orgId);
      else next.delete(orgId);
      return next;
    });
  }

  async function onTier(org: PlatformOrg, tier: PlanId) {
    if (tier === org.tier) return;
    withBusy(org.orgId, true);
    try {
      await setTier(org.orgId, tier);
      setOrgs((prev) => prev.map((o) => (o.orgId === org.orgId ? { ...o, tier } : o)));
      toast.success(`${org.name} → ${planById(tier).name}`);
    } catch (e) {
      toast.fail(e);
    } finally {
      withBusy(org.orgId, false);
    }
  }

  async function onSuspend(org: PlatformOrg) {
    const next = !org.suspended;
    withBusy(org.orgId, true);
    try {
      await setSuspended(org.orgId, next);
      setOrgs((prev) => prev.map((o) => (o.orgId === org.orgId ? { ...o, suspended: next } : o)));
      toast.success(next ? `${org.name} suspended` : `${org.name} reactivated`);
    } catch (e) {
      toast.fail(e);
    } finally {
      withBusy(org.orgId, false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/app" className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
          <ArrowLeft size={14} /> Projects
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 font-brand text-2xl tracking-wide text-ink">
            <ShieldCheck size={22} /> Platform
          </h1>
          <span className="count-badge">{orgs.length} customer{orgs.length === 1 ? "" : "s"}</span>
        </div>

        <div className="mt-6 max-w-sm">
          <Input
            placeholder="Search by workspace or owner email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-brand-blue" size={24} /></div>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-center text-sm text-ink-mute">
            {orgs.length === 0 ? "No customers yet." : "No matches."}
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {filtered.map((o) => (
              <OrgRow key={o.orgId} org={o} busy={busy.has(o.orgId)} onTier={onTier} onSuspend={onSuspend} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function OrgRow({
  org,
  busy,
  onTier,
  onSuspend,
}: {
  org: PlatformOrg;
  busy: boolean;
  onTier: (o: PlatformOrg, t: PlanId) => void;
  onSuspend: (o: PlatformOrg) => void;
}) {
  const plan = planById(org.tier);
  const created = new Date(org.createdAt).toISOString().slice(0, 10);
  return (
    <div className={`rounded-card border bg-surface p-4 ${org.suspended ? "border-status-blocked/60" : "border-line"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-brand text-base tracking-wide text-ink" title={org.name}>{org.name}</h2>
            {org.suspended && (
              <span className="rounded bg-status-blocked/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-status-blocked">
                Suspended
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-2xs text-ink-mute">
            {org.ownerEmail ?? "—"} · joined {created}
            {org.subscriptionStatus ? ` · ${org.subscriptionStatus}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {busy && <Loader2 size={14} className="animate-spin text-brand-blue" />}
          <Select
            className="w-32"
            aria-label={`Plan for ${org.name}`}
            options={TIER_OPTIONS}
            value={plan.id}
            disabled={busy}
            onChange={(e) => onTier(org, e.target.value as PlanId)}
          />
          <Button
            variant={org.suspended ? "outline" : "danger"}
            size="sm"
            loading={busy}
            onClick={() => onSuspend(org)}
            title={org.suspended ? "Reactivate this workspace" : "Suspend this workspace"}
          >
            {org.suspended ? <RotateCcw size={13} /> : <Ban size={13} />}
            {org.suspended ? "Reactivate" : "Suspend"}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Projects" used={org.projects} cap={plan.limits.projects} />
        <Stat label="Seats" used={org.members} cap={plan.limits.members} />
        <Stat label="Nodes" used={org.nodes} cap={null} />
        <Stat label="Snapshots" used={org.snapshots} cap={plan.limits.snapshots} />
        <Stat
          label="Storage"
          text={`${Math.round(org.storageBytes / 1024 / 1024)} / ${fmtStorage(plan.limits.storageMb)}`}
        />
      </div>
    </div>
  );
}

function Stat({ label, used, cap, text }: { label: string; used?: number; cap?: number | null; text?: string }) {
  const value = text ?? `${(used ?? 0).toLocaleString()}${cap != null ? ` / ${cap.toLocaleString()}` : ""}`;
  const over = used != null && cap != null && used > cap;
  return (
    <div className="rounded border border-line bg-canvas px-2.5 py-1.5">
      <p className="font-brand text-[10px] uppercase tracking-widest text-ink-mute">{label}</p>
      <p className={`font-mono text-2xs ${over ? "text-status-blocked" : "text-ink"}`}>{value}</p>
    </div>
  );
}
