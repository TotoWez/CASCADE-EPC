import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, ImagePlus, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useAuth } from "@/store/auth";
import { getOrg, updateOrg, uploadBranding, usageStats, type Org, type UsageStats } from "@/lib/api/org";
import { toast, errMessage } from "@/store/toast";

const FREE_CAPS = { nodes: 5000, storageMB: 1024, dbMB: 500 };

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

            <h2 className="mt-10 font-mono text-2xs uppercase tracking-widest text-ink-mute">Usage · free tier</h2>
            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
              <Kpi label="Projects" value={usage?.projects ?? 0} />
              <Kpi label="Members" value={usage?.members ?? 0} />
              <Kpi label="Nodes" value={usage?.nodes ?? 0} sub={`/ ${FREE_CAPS.nodes}`} />
              <Kpi label="Snapshots" value={usage?.snapshots ?? 0} />
            </div>
            <p className="mt-3 text-2xs text-ink-mute">
              Free tier: {FREE_CAPS.dbMB} MB database · {FREE_CAPS.storageMB} MB storage · 50k monthly active users.
              The project pauses after ~7 days of inactivity (mitigated by the keep-alive job).
            </p>
            <p className="mt-2 text-2xs text-ink-mute">Subscription: {org?.subscriptionTier ?? "free"}.</p>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="font-brand text-2xs uppercase tracking-widest text-ink-mute">{label}</p>
      <p className="mt-1 font-mono text-xl text-ink">
        {value}
        {sub && <span className="ml-1 text-2xs text-ink-mute">{sub}</span>}
      </p>
    </div>
  );
}
