import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, ImagePlus, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useAuth } from "@/store/auth";
import { getOrg, updateOrg, uploadBranding, usageStats, type Org, type UsageStats } from "@/lib/api/org";
import { PLANS, type Plan } from "@/lib/plans";
import { toast, errMessage } from "@/store/toast";

function planFor(tier: string | undefined): Plan {
  return PLANS.find((p) => p.id === (tier ?? "free")) ?? PLANS[0]!;
}

export function OrgAdmin() {
  const orgs = useAuth((s) => s.orgs);
  const refresh = useAuth((s) => s.refresh);
  const adminOrg = orgs.find((o) => o.orgRole === "admin");
  const fileRef = useRef<HTMLInputElement>(null);

  const [org, setOrg] = useState<Org | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminOrg) return;
    Promise.all([getOrg(adminOrg.orgId), usageStats(adminOrg.orgId)])
      .then(([o, u]) => {
        setOrg(o);
        setUsage(u);
        setName(o?.name ?? "");
      })
      .catch((e) => toast.error(errMessage(e)))
      .finally(() => setLoading(false));
  }, [adminOrg]);

  if (!adminOrg) return <Navigate to="/app" replace />;

  async function onSaveName() {
    if (!org) return;
    setBusy(true);
    try {
      await updateOrg(org.id, { name });
      await refresh();
      toast.success("Organization updated.");
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onLogo(file: File) {
    if (!org) return;
    setBusy(true);
    try {
      const url = await uploadBranding(org.id, file, "org");
      await updateOrg(org.id, { logoUrl: url });
      setOrg({ ...org, logoUrl: url });
      toast.success("Logo updated.");
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/app" className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
          <ArrowLeft size={14} /> Projects
        </Link>
        <h1 className="mt-4 flex items-center gap-2 font-brand text-2xl tracking-wide text-ink">
          <Building2 size={22} /> Organization
        </h1>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-brand-blue" size={24} /></div>
        ) : (
          <>
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="grid h-20 w-20 place-items-center overflow-hidden rounded border border-line bg-surface text-ink-mute hover:border-ink-mute"
                title="Upload organization logo"
              >
                {org?.logoUrl ? <img src={org.logoUrl} alt="" className="h-full w-full object-contain p-2" /> : <ImagePlus size={20} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onLogo(f); }} />
              <div className="flex-1">
                <Field label="Organization name" htmlFor="on">
                  <Input id="on" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
              </div>
              <Button onClick={onSaveName} loading={busy} className="self-end">Save</Button>
            </div>

            <h2 className="mt-10 font-mono text-2xs uppercase tracking-widest text-ink-mute">
              Usage · {planFor(org?.subscriptionTier).name} plan
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
              <Meter label="Projects" used={usage?.projects ?? 0} cap={planFor(org?.subscriptionTier).limits.projects} />
              <Meter label="Member seats" used={usage?.members ?? 0} cap={planFor(org?.subscriptionTier).limits.members} />
              <Meter label="Snapshots" used={usage?.snapshots ?? 0} cap={planFor(org?.subscriptionTier).limits.snapshots} />
              <Meter
                label="Attachment storage"
                used={Math.round((usage?.storageBytes ?? 0) / 1024 / 1024)}
                cap={planFor(org?.subscriptionTier).limits.storageGb === null ? null : planFor(org?.subscriptionTier).limits.storageGb! * 1024}
                unit="MB"
              />
            </div>
            <p className="mt-3 text-2xs text-ink-mute">
              {usage?.nodes ?? 0} nodes across all projects (cap is per project:{" "}
              {planFor(org?.subscriptionTier).limits.nodesPerProject ?? "unlimited"}). Need more room?{" "}
              <Link to="/pricing" className="text-brand-blue hover:underline">See plans</Link>.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}

/** Usage vs plan-cap meter. `cap` null = unlimited (no bar). */
function Meter({ label, used, cap, unit }: { label: string; used: number; cap: number | null; unit?: string }) {
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const barColor = pct >= 90 ? "bg-status-blocked" : pct >= 70 ? "bg-brand-orange" : "bg-brand-blue";
  return (
    <div className="bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between">
        <p className="font-brand text-2xs uppercase tracking-widest text-ink-mute">{label}</p>
        <p className="font-mono text-sm text-ink">
          {used.toLocaleString()}
          <span className="text-2xs text-ink-mute"> / {cap === null ? "∞" : cap.toLocaleString()}{unit ? ` ${unit}` : ""}</span>
        </p>
      </div>
      {cap !== null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
