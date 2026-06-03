import { useEffect, useRef, useState, type FormEvent } from "react";
import { UserRound, Camera } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { useAuth } from "@/store/auth";
import { updateProfile, uploadAvatar } from "@/lib/api/profile";
import { toast, errMessage } from "@/store/toast";

export function Profile() {
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
      toast.error(errMessage(err));
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
      toast.error(errMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-brand text-2xl tracking-wide text-ink">Your profile</h1>
        <p className="mt-2 text-sm text-ink-dim">Personal details shown across the platform.</p>

        <div className="mt-8 flex items-center gap-4">
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

        <form onSubmit={onSave} className="mt-8 space-y-4">
          <Field label="Full name" htmlFor="fn">
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Position / title" htmlFor="pos">
            <Input id="pos" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Project Manager" />
          </Field>
          <Field label="Contact number" htmlFor="ph">
            <Input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="em" hint="Managed by your sign-in; change via support.">
            <Input id="em" value={profile?.email || user?.email || ""} disabled />
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={busy}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
