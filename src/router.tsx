import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "@/components/RequireAuth";
import { Landing } from "@/pages/Landing";
import { Auth } from "@/pages/Auth";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { ResetPassword } from "@/pages/ResetPassword";
import { Join } from "@/pages/Join";
import { About } from "@/pages/About";
import { AppHome } from "@/pages/AppHome";
import { Profile } from "@/pages/Profile";
import { OrgAdmin } from "@/pages/OrgAdmin";
import { ProjectWorkspace } from "@/pages/ProjectWorkspace";
import { NotFound } from "@/pages/NotFound";

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/signin", element: <Auth mode="signin" /> },
  { path: "/signup", element: <Auth mode="signup" /> },
  { path: "/forgot", element: <ForgotPassword /> },
  { path: "/reset", element: <ResetPassword /> },
  { path: "/join", element: <Join /> },
  { path: "/about", element: <About /> },

  // Authenticated app (workspace + org/project routes are added in P3+).
  { path: "/app", element: <RequireAuth><AppHome /></RequireAuth> },
  { path: "/app/profile", element: <RequireAuth><Profile /></RequireAuth> },
  { path: "/app/org", element: <RequireAuth><OrgAdmin /></RequireAuth> },
  { path: "/app/projects/:id", element: <RequireAuth><ProjectWorkspace /></RequireAuth> },

  { path: "*", element: <NotFound /> },
]);
