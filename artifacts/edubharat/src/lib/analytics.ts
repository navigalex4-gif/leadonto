const ANALYTICS_BASE = (import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "") + "/api/analytics";
const CONSENT_KEY = "edubharat_analytics_consent";
const ANON_ID_KEY = "edubharat_anon_id";

export type Consent = "granted" | "denied" | "pending";

/** Stable acquisition funnel vocabulary. Keep failure stages separate so an
 * auth outage is not mistaken for visitor abandonment in the admin report. */
export type FunnelEvent =
  | "landing_viewed"
  | "cta_clicked"
  | "communication_check_opened"
  | "communication_check_started"
  | "communication_check_completed"
  | "signup_opened"
  | "signup_started"
  | "otp_requested"
  | "otp_verified"
  | "account_created"
  | "first_session_started"
  | "oauth_failed"
  | "otp_failed"
  | "otp_expired"
  | "validation_failed"
  | "api_failed"
  | "webview_blocked";

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return "anon-unknown";
  }
}

export function getConsent(): Consent {
  try {
    return (localStorage.getItem(CONSENT_KEY) as Consent) ?? "pending";
  } catch {
    return "denied";
  }
}

export function setConsent(value: Consent) {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
}

export function canTrack(): boolean {
  return getConsent() === "granted";
}

export function track(event: string, properties?: Record<string, unknown>) {
  sendEvent(event, properties);
}

export function trackFunnel(event: FunnelEvent, properties?: Record<string, unknown>) {
  sendEvent(`funnel_${event}`, properties);
}

function sendEvent(event: string, properties?: Record<string, unknown>) {
  const path = window.location.pathname + window.location.search;
  const payload = {
    anonymousId: getAnonId(),
    event,
    path,
    properties,
  };
  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: "application/json" });
  const sent = navigator.sendBeacon?.(`${ANALYTICS_BASE}/events`, blob);
  if (!sent) {
    fetch(`${ANALYTICS_BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => { /* ignore */ });
  }
}

export function trackPageView(path?: string) {
  // Page views are the anonymous visitor activity record. They are sent even
  // before analytics consent so the admin visitor log covers unsigned visitors.
  sendEvent("page_view", { path: path ?? window.location.pathname });
}

export function trackToolEvent(tool: string, action: string, data?: Record<string, unknown>) {
  track("tool_event", { tool, action, ...data });
}
