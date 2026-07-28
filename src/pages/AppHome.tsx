import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { Onboarding } from "@/pages/Onboarding";
import { ProjectsList } from "@/pages/ProjectsList";

/**
 * Authenticated entry point.
 * - Platform staff (the owner) operate the platform, not a customer org → they
 *   land on the Platform console and never see the customer projects UI.
 * - A user with no organization is sent through onboarding.
 * - Everyone else lands on their projects dashboard.
 */
export function AppHome() {
  const profile = useAuth((s) => s.profile);
  const orgs = useAuth((s) => s.orgs);
  if (profile?.platform_role) return <Navigate to="/app/platform" replace />;
  if (orgs.length === 0) return <Onboarding />;
  return <ProjectsList />;
}
