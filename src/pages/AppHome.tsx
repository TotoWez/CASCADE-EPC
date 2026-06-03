import { useAuth } from "@/store/auth";
import { Onboarding } from "@/pages/Onboarding";
import { ProjectsList } from "@/pages/ProjectsList";

/**
 * Authenticated entry point. A user with no organization is sent through
 * onboarding; otherwise they land on the projects dashboard.
 */
export function AppHome() {
  const orgs = useAuth((s) => s.orgs);
  if (orgs.length === 0) return <Onboarding />;
  return <ProjectsList />;
}
