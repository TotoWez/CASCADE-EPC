import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound, Camera, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useAuth } from "@/store/auth";
import { updateProfile, uploadAvatar } from "@/lib/api/profile";
import { toast } from "@/store/toast";

export function Profile() {
  const navigate = useNavigate();
  const profile = useAuth((s) => s.profile);
  const user = useAuth((s) => s.user);
  const refresh = useAuth((s) => s.refresh);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPosition(profile.position);
      setPhone(profile.phone);
    }
  }, [profile]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await updateProfile(user.id, { full_name: fullName, position, phone });
      await refresh();
      toast.success("Profile saved.");
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function onPickAvatar(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      await uploadAvatar(user.id, file);
      await refresh();
      toast.success("Photo updated.");
    } catch (err) {
      toast.fail(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <PageHeader
          kicker="Account"
          title="Your profile"
          subtitle="Personal details shown to your teammates across the platform."
        />

        <Section title="Personal details" className="mt-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-line bg-surface-2">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={32} className="text-ink-mute" />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-line bg-brand-blue text-white hover:bg-brand-blue-dark"
                title="Change photo"
                disabled={uploading}
              >
                <Camera size={13} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickAvatar(f);
                }}
              />
            </div>
            <div>
              <p className="text-sm text-ink">{profile?.email || user?.email}</p>
              <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">
                {uploading ? "Uploading…" : "Profile photo"}
              </p>
            </div>
          </div>

          <form onSubmit={onSave} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="fn">
                <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field label="Position / title" htmlFor="pos">
                <Input id="pos" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Project Manager" />
              </Field>
              <Field label="Contact number" htmlFor="ph">
                <Input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="em" hint="Managed by your sign-in.">
                <Input id="em" value={profile?.email || user?.email || ""} disabled />
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={busy}>
                Save changes
              </Button>
            </div>
          </form>
        </Section>
      </div>
    </AppLayout>
  );
}
