const ANALYTICS_BASE = (import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "") + "/api/analytics";
const CONSENT_KEY = "edubharat_analytics_consent";
const ANON_ID_KEY = "edubharat_anon_id";
const ACQUISITION_KEY = "edubharat_acquisition";
const FIRST_VALUE_KEY = "leadonto_first_value_received";
const ACQUISITION_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gad_source", "gad_campaignid"] as const;
const GOOGLE_ADS_PURCHASE_SEND_TO = "AW-18381164231/a-wwCM-S0-YcEMd6bxE";
const GOOGLE_ADS_SIGNUP_SEND_TO = import.meta.env.VITE_GOOGLE_ADS_SIGNUP_SEND_TO?.trim() ?? "";
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() ?? "";
type MetaPixelFunction = ((...args: unknown[]) => void) & { queue?: unknown[] };
declare global { interface Window { gtag?: (...args: unknown[]) => void; fbq?: MetaPixelFunction; _fbq?: unknown; } }
export type Consent = "granted" | "denied" | "pending";
export type FunnelEvent = "landing_viewed" | "cta_clicked" | "communication_check_opened" | "communication_check_started" | "communication_check_completed" | "first_session_started" | "first_value_received" | "payment_page_viewed" | "payment_started" | "payment_submitted" | "payment_pending" | "payment_approved" | "payment_succeeded" | "payment_rejected" | "signup_opened" | "signup_started" | "otp_requested" | "otp_verified" | "account_created" | "signup_completed" | "oauth_failed" | "otp_failed" | "otp_expired" | "validation_failed" | "api_failed" | "webview_blocked";
function getAnonId(): string { try { let id = localStorage.getItem(ANON_ID_KEY); if (!id) { id = crypto.randomUUID(); localStorage.setItem(ANON_ID_KEY, id); } return id; } catch { return "anon-unknown"; } }
type AcquisitionContext = Partial<Record<(typeof ACQUISITION_FIELDS)[number], string>> & { landingPath?: string };
function readSavedAcquisition(): AcquisitionContext { try { const saved = localStorage.getItem(ACQUISITION_KEY); if (!saved) return {}; const parsed = JSON.parse(saved) as AcquisitionContext; return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }
function getAcquisitionContext(): AcquisitionContext { try { const params = new URLSearchParams(window.location.search); const current: AcquisitionContext = {}; for (const field of ACQUISITION_FIELDS) { const value = params.get(field)?.trim(); if (value) current[field] = value.slice(0, 180); } if (Object.keys(current).length) { const saved = readSavedAcquisition(); const merged = { ...saved, ...current, landingPath: saved.landingPath ?? window.location.pathname.slice(0, 240) }; localStorage.setItem(ACQUISITION_KEY, JSON.stringify(merged)); return merged; } return readSavedAcquisition(); } catch { return {}; } }
export function withAcquisition(href: string): string { try { const url = new URL(href, window.location.origin); if (url.origin !== window.location.origin) return href; const acquisition = getAcquisitionContext(); for (const field of ACQUISITION_FIELDS) { const value = acquisition[field]; if (value && !url.searchParams.has(field)) url.searchParams.set(field, value); } return `${url.pathname}${url.search}${url.hash}`; } catch { return href; } }
export function getConsent(): Consent { try { return (localStorage.getItem(CONSENT_KEY) as Consent) ?? "pending"; } catch { return "denied"; } }
export function setConsent(value: Consent) { try { localStorage.setItem(CONSENT_KEY, value); } catch { /* ignore */ } }
export function canTrack(): boolean { return getConsent() === "granted"; }
let metaLoadStarted = false;
function ensureMetaPixel() { if (!META_PIXEL_ID || !canTrack() || typeof document === "undefined" || typeof window.fbq === "function" || metaLoadStarted) return; metaLoadStarted = true; const w = window; const shim: MetaPixelFunction = (...args: unknown[]) => { shim.queue ??= []; shim.queue.push(args); }; w.fbq = shim; w._fbq = shim; const script = document.createElement("script"); script.async = true; script.src = "https://connect.facebook.net/en_US/fbevents.js"; script.onload = () => { w.fbq?.("init", META_PIXEL_ID); w.fbq?.("track", "PageView"); }; document.head.appendChild(script); }
function trackMeta(event: string, properties?: Record<string, unknown>) { if (!META_PIXEL_ID || !canTrack()) return; ensureMetaPixel(); if (typeof window.fbq === "function") window.fbq("trackCustom", event, properties ?? {}); }
export function track(event: string, properties?: Record<string, unknown>) { sendEvent(event, properties); trackMeta(event, properties); }
export function trackGoogleAdsPurchase(transactionId: string, value: number): boolean { if (typeof window.gtag !== "function") return false; window.gtag("event", "conversion", { send_to: GOOGLE_ADS_PURCHASE_SEND_TO, value, currency: "INR", transaction_id: transactionId }); return true; }
export function trackGoogleAdsSignup(method: string): boolean {
  let sent = false;
  if (typeof window.gtag === "function") {
    // Always emit a standard sign_up event for GA4/Google Ads imported conversions.
    // The optional send_to turns the same event into a direct Google Ads conversion
    // when the account supplies its signup conversion action ID/label.
    window.gtag("event", "sign_up", { method });
    if (GOOGLE_ADS_SIGNUP_SEND_TO) {
      window.gtag("event", "conversion", { send_to: GOOGLE_ADS_SIGNUP_SEND_TO, method });
      sent = true;
    }
  }
  if (META_PIXEL_ID && canTrack()) {
    ensureMetaPixel();
    if (typeof window.fbq === "function") window.fbq("track", "CompleteRegistration", { method });
  }
  return sent;
}
export function trackFunnel(event: FunnelEvent, properties?: Record<string, unknown>) { sendEvent(`funnel_${event}`, properties); trackMeta(`Funnel_${event}`, properties); }
export function trackFirstValue(feature: string, properties?: Record<string, unknown>): boolean { try { if (localStorage.getItem(FIRST_VALUE_KEY)) return false; localStorage.setItem(FIRST_VALUE_KEY, feature); } catch { /* continue */ } trackFunnel("first_value_received", { feature, ...properties }); return true; }
function sendEvent(event: string, properties?: Record<string, unknown>) { const path = window.location.pathname + window.location.search; const payload = { anonymousId: getAnonId(), event, path, properties: { ...(properties ?? {}), acquisition: getAcquisitionContext() } }; const body = JSON.stringify(payload); const blob = new Blob([body], { type: "application/json" }); const sent = navigator.sendBeacon?.(`${ANALYTICS_BASE}/events`, blob); if (!sent) fetch(`${ANALYTICS_BASE}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => { /* ignore */ }); }
export function trackPageView(path?: string) { sendEvent("page_view", { path: path ?? window.location.pathname }); }
export function trackToolEvent(tool: string, action: string, data?: Record<string, unknown>) { track("tool_event", { tool, action, ...data }); }
