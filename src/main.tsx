import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initTheme } from "./store/ui";
import "./styles/index.css";

initTheme();

// Error monitoring — opt-in: only loads (lazily) when a DSN is configured, so
// local/dev builds and privacy-sensitive deploys pay zero cost.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  void import("@sentry/react").then((Sentry) => {
    Sentry.init({ dsn: sentryDsn, sendDefaultPii: false });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
