import { supabase } from "@/lib/supabase";

const redirect = (path: string) => `${window.location.origin}${path}`;

/** Email + password sign-up (staff). Sends a confirmation email. */
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: redirect("/app"),
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Passwordless magic link — used for Viewer invitations. */
export async function sendMagicLink(email: string, nextPath = "/app") {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect(nextPath) },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirect("/reset"),
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Create the org + admin membership for a freshly signed-up user. */
export async function bootstrapOrg(name: string): Promise<string> {
  const { data, error } = await supabase.rpc("bootstrap_org", { p_name: name });
  if (error) throw error;
  return data as string;
}

/** Redeem an invitation code → returns the project id (or null for org-only). */
export async function acceptInvitation(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("accept_invitation", { p_code: code });
  if (error) throw error;
  return (data as string) ?? null;
}
