const ANALYTICS_BASE = (import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "") + "/api/analytics";
const CONSENT_KEY = "edubharat_analytics_consent";
const ANON_ID_KEY = "edubharat_anon_id";
const ACQUISITION_KEY = "edubharat_acquisition";
const FIRST_VALUE_KEY = "leadonto_first_value_received";
const ACQUISITION_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gad_source", "gad_campaignid"] as const;
const GOOGLE_ADS_PURCHASE_SEND_TO = "AW-18381164231/a-wwCM-S0-YcEMd6bxE";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type Consent = "granted" | "denied" | "pending";

/** Stable acquisition funnel vocabulary. Keep failure stages separate so an
 * auth outage is not mistaken for visitor abandonment in the admin report. */
export type FunnelEvent =
  | "landing_viewed"
  | "cta_clicked"
  | "communication_check_opened"
  | "communication_check_started"
  | "communication_check_completed"
  | "first_session_started"
  | "first_value_received"
  | "payment_page_viewed"
  | "payment_started"
  | "payment_submitted"
  | "payment_pending"
  | "payment_approved"
  | "payment_succeeded"
  | "payment_rejected"
  | "signup_opened"
  | "signup_started"
  | "otp_requested"
  | "otp_verified"
  | "account_created"
  | "signup_completed"
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

type AcquisitionContext = Partial<Record<(typeof ACQUISITION_FIELDS)[number], string>> & {
  landingPath?: string;
};

function getAcquisitionContext(): AcquisitionContext {
  try {
    const params = new URLSearchParams(window.location.search);
    const current: AcquisitionContext = {};
    for (const field of ACQUISITION_FIELDS) {
      const value = params.get(field)?.trim();
      if (value) current[field] = value.slice(0, 180);
    }
    if (Object.keys(current).length) {
      const saved = readSavedAcquisition();
      const merged = {
        ...saved,
        ...current,
        landingPath: saved.landingPath ?? window.location.pathname.slice(0, 240),
      };
      localStorage.setItem(ACQUISITION_KEY, JSON.stringify(merged));
      return merged;
    }
    return readSavedAcquisition();
  } catch {
    // Analytics must never prevent the product from loading.
  }
  return {};
}

function readSavedAcquisition(): AcquisitionContext {
  const saved = localStorage.getItem(ACQUISITION_KEY);
  if (!saved) return {};
  const parsed = JSON.parse(saved) as AcquisitionContext;
  return parsed && typeof parsed === "object" ? parsed : {};
}

/** Keep campaign attribution on same-site funnel links as well as in storage.
 * This survives browser handoffs where localStorage may not be available. */
export function withAcquisition(href: string): string {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return href;
    const acquisition = getAcquisitionContext();
    for (const field of ACQUISITION_FIELDS) {
      const value = acquisition[field];
      if (value && !url.searchParams.has(field)) url.searchParams.set(field, value);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
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

/** Report a confirmed Cashfree purchase to the Google Ads conversion action. */
export function trackGoogleAdsPurchase(transactionId: string, value: number): boolean {
  if (typeof window.gtag !== "function") return false;
  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
    value,
    currency: "INR",
    transaction_id: transactionId,
  });
  return true;
}

export function trackFunnel(event: FunnelEvent, properties?: Record<string, unknown>) {
  sendEvent(`funnel_${event}`, properties);
}

/** Record activation once per browser identity so repeat practice does not
 * inflate the "first value" step of the acquisition funnel. */
export function trackFirstValue(feature: string, properties?: Record<string, unknown>): boolean {
  try {
    if (localStorage.getItem(FIRST_VALUE_KEY)) return false;
    localStorage.setItem(FIRST_VALUE_KEY, feature);
  } catch {
    // Storage-restricted browsers can still report the event; the admin funnel
    // de-duplicates by visitor identity.
  }
  trackFunnel("first_value_received", { feature, ...properties });
  return true;
}

function sendEvent(event: string, properties?: Record<string, unknown>) {
  const path = window.location.pathname + window.location.search;
  const payload = {
    anonymousId: getAnonId(),
    event,
    path,
    properties: {
      ...(properties ?? {}),
      acquisition: getAcquisitionContext(),
    },
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
