import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { updatePassword } from "@/lib/api/auth";
import { toast, errMessage } from "@/store/toast";

/**
 * Landing page for the password-recovery email link. Supabase establishes a
 * recovery session from the URL hash (detectSessionInUrl), so we can call
 * updateUser directly. Also reachable from the profile page.
 */
export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success("Password updated.");
      navigate("/app");
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Set a new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="New password" htmlFor="pw" hint="At least 8 characters.">
          <Input
            id="pw"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm password" htmlFor="pw2">
          <Input
            id="pw2"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <Button type="submit" loading={busy} className="w-full">
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
