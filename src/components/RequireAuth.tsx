import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/store/auth";

/** Guards the authenticated app area. Redirects anonymous users to sign-in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="grid min-h-full place-items-center bg-canvas">
        <Loader2 className="animate-spin text-brand-blue" size={28} />
      </div>
    );
  }
  if (status === "anon") {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
