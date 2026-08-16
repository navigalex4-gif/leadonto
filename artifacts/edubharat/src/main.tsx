import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { track } from "./lib/analytics";

let googleRejectionTracked = false;

function trackGoogleWebViewRejection(reason: unknown) {
  const message = typeof reason === "string"
    ? reason
    : reason && typeof reason === "object" && "message" in reason
      ? String((reason as { message?: unknown }).message ?? "")
      : String(reason ?? "");
  if (googleRejectionTracked || !message.toLowerCase().includes("disallowed_useragent")) return;
  googleRejectionTracked = true;
  track("oauth_google_rejected_serverside", {
    userAgent: navigator.userAgent.slice(0, 240),
    error: message.slice(0, 240),
  });
}

window.addEventListener("error", (event) => {
  trackGoogleWebViewRejection(event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  trackGoogleWebViewRejection(event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
