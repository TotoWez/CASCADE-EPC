import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { signIn, signUp } from "@/lib/api/auth";
import { toast, errMessage } from "@/store/toast";
import { env } from "@/lib/env";

export function Auth({ mode }: { mode: "signin" | "signup" }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!env.hasSupabase) {
      toast.error("Supabase is not configured. Add VITE_SUPABASE_URL and anon key to .env.local.");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        await signUp(email, password, fullName);
        setSent(true);
      } else {
        await signIn(email, password);
        navigate("/app");
      }
    } catch (err) {
      toast.error(errMessage(err));
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
            We sent a confirmation link to <span className="text-ink">{email}</span>. After
            confirming, you'll set up your organization and become its Admin.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={isSignup ? "Create your organization" : "Sign in"}
      subtitle={
        isSignup
          ? "Sign up to become the Admin for your customer organization."
          : "Welcome back. Sign in to your projects."
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
            Need an organization?{" "}
            <Link to="/signup" className="text-brand-blue hover:underline">
              Sign up
            </Link>
          </>
        )
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {isSignup && (
          <Field label="Full name" htmlFor="name">
            <Input
              id="name"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
        )}
        <Field label="Work email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={isSignup ? "At least 8 characters." : undefined}
        >
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
    </AuthCard>
  );
}
