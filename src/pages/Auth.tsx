import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { signIn, signUp } from "@/lib/api/auth";
import { useAuth } from "@/store/auth";
import { toast } from "@/store/toast";
import { env } from "@/lib/env";

export function Auth({ mode }: { mode: "signin" | "signup" }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const status = useAuth((s) => s.status);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  // Navigate to the app only once the auth store has actually loaded the
  // session — avoids a race where navigating immediately after signIn() bounces
  // off RequireAuth (still "anon") back to /signin.
  useEffect(() => {
    if (status === "authed") navigate("/app", { replace: true });
  }, [status, navigate]);

  /** Inline validation surfaced under the fields (not just browser bubbles). */
  function validate(): boolean {
    const next: typeof errors = {};
    if (isSignup && !fullName.trim()) next.name = "Enter your full name.";
    if (!/\S+@\S+\.\S+/.test(email)) next.email = "Enter a valid email address.";
    if (isSignup && password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!env.hasSupabase) {
      toast.error("Supabase is not configured. Add VITE_SUPABASE_URL and anon key to .env.local.");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        const data = await signUp(email, password, fullName);
        // Email confirmation off → a session is returned and the effect above
        // routes to /app. Confirmation on → show the "check your email" screen.
        if (!data.session) setSent(true);
      } else {
        await signIn(email, password);
        // The effect routes to /app when the store becomes authed.
      }
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" subtitle="Confirm your address to finish creating your account.">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="text-brand-green" size={36} />
          <p className="text-sm text-ink-dim">
            We sent a confirmation link to <span className="text-ink">{email}</span>. Open it to
            finish setting up your workspace — you'll be the Admin.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={isSignup ? "Create your company workspace" : "Welcome back"}
      subtitle={
        isSignup
          ? "Set up your organization — you'll be its Admin and can invite your team."
          : "Sign in to pick up where your projects left off."
      }
      footer={
        isSignup ? (
          <>
            Already have an account?{" "}
            <Link to="/signin" className="text-brand-blue hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to CASCADE-EPC?{" "}
            <Link to="/signup" className="text-brand-blue hover:underline">
              Create a workspace
            </Link>
          </>
        )
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {isSignup && (
          <Field label="Full name" htmlFor="name" error={errors.name}>
            <Input
              id="name"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
            />
          </Field>
        )}
        <Field label="Work email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint={isSignup ? "At least 8 characters." : undefined}
        >
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
          />
        </Field>
        <Button type="submit" loading={busy} className="w-full">
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>
      {!isSignup && (
        <p className="mt-4 text-center">
          <Link to="/forgot" className="text-2xs text-ink-mute hover:text-ink">
            Forgot password?
          </Link>
        </p>
      )}
      {isSignup && (
        <p className="mt-4 text-center text-2xs text-ink-mute">
          Invited by a teammate?{" "}
          <Link to="/join" className="text-brand-blue hover:underline">
            Join with a code
          </Link>
        </p>
      )}
    </AuthCard>
  );
}
