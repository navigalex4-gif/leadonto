import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/use-auth";
import { Loader2, Mail, ArrowRight, ShieldCheck, AlertTriangle, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { PageMeta } from "@/components/page-meta";
import { track, trackFunnel, trackGoogleAdsSignup, withAcquisition } from "@/lib/analytics";

type AuthConfig = { googleConfigured: boolean; googleCallbackUrl: string; otpEmailConfigured: boolean; otpDevMode: boolean };
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
function detectEmbeddedWebView(userAgent: string): boolean { return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Twitter|LinkedInApp|Snapchat|TikTok|Pinterest|;\s*wv\)|\bwv\b/i.test(userAgent); }
function getExternalBrowserUrl(url: string, userAgent: string): string {
  if (/Android/i.test(userAgent)) { const browserTarget = url.replace(/^https?:\/\//i, ""); return `intent://${browserTarget}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`; }
  if (/(iPhone|iPad|iPod)/i.test(userAgent) && /^https:/i.test(url)) return url.replace(/^https:/i, "x-safari-https:");
  return url;
}
function getGuestIdSafely(): string | undefined {
  // Embedded browsers/private modes may deny localStorage; OTP sign-in must still work.
  try { return window.localStorage.getItem("edubharat_guest_id") ?? undefined; } catch { return undefined; }
}
function getContextualCopy(returnTo: string | null): { title: string; description: string } {
  const path = returnTo ?? "";
  if (path.startsWith("/interview-ace")) return { title: "Keep your interview practice going", description: "Create your free account to unlock more mock interviews, save your history, and get 20 free credits." };
  if (path.startsWith("/english-guru")) return { title: "Don't lose your speaking streak", description: "Create your free account to keep practising with your coach and get 20 free credits." };
  if (path.startsWith("/resume-intelligence")) return { title: "Save your resume feedback", description: "Create your free account to keep your ATS scan results and get 20 free credits." };
  return { title: "Create your free account", description: "Save your progress and get 20 free credits to keep practising" };
}
export default function Login() { return <><PageMeta title="Create Your Free Account" description="Create a free Lead Onto account to save your progress and receive 20 credits." noindex /><LoginContent /></>; }
function LoginContent() {
  const [, navigate] = useLocation(); const search = useSearch(); const { loginWithGoogle, sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email"); const [email, setEmail] = useState(""); const [otp, setOtp] = useState(""); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => { const e = new URLSearchParams(search).get("error"); if (e === "google_failed") return "Google Sign-In failed. Please try again or use Email OTP below."; if (e === "google_unavailable") return "Google Sign-In is temporarily unavailable. Email OTP below works instantly."; if (e === "server_error") return "A temporary server issue occurred. Please try signing in again."; return ""; });
  const [devCode, setDevCode] = useState<string | undefined>(); const [otpSentAt, setOtpSentAt] = useState<number | null>(null); const [config, setConfig] = useState<AuthConfig | null>(null); const [configLoaded, setConfigLoaded] = useState(false); const [configError, setConfigError] = useState(false); const [copied, setCopied] = useState(false);
  const [isEmbeddedWebView] = useState(() => detectEmbeddedWebView(navigator.userAgent));
  useEffect(() => {
    const userAgent = navigator.userAgent; const embedded = detectEmbeddedWebView(userAgent);
    if (embedded) { track("oauth_blocked_webview", { userAgent: userAgent.slice(0, 240) }); trackFunnel("webview_blocked", { stage: "signup", browser: userAgent.slice(0, 160) }); }
    track("signup_form_viewed", { webview: embedded }); trackFunnel("signup_opened", { webview: embedded });
    fetch(`${BASE}/api/auth/config`, { credentials: "include" }).then(r => r.json()).then((d: AuthConfig) => { setConfig(d); setConfigLoaded(true); }).catch(() => { trackFunnel("api_failed", { stage: "auth_config" }); setConfigError(true); setConfigLoaded(true); });
  }, []);
  useEffect(() => { const errorCode = new URLSearchParams(search).get("error"); if (errorCode) trackFunnel("oauth_failed", { code: errorCode }); }, [search]);
  const handleSendOtp = async () => {
    trackFunnel("signup_started", { method: "email_otp" });
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { trackFunnel("validation_failed", { stage: "otp_request", field: "email" }); setError("Please enter a valid email address"); return; }
    setLoading(true); setError(""); const result = await sendOtp(email); setLoading(false);
    if (result.error) { trackFunnel("otp_failed", { stage: "request", reason: result.error.slice(0, 120) }); if (/send|delivery|email/i.test(result.error)) trackFunnel("api_failed", { stage: "otp_request" }); setError(result.error); track("otp_requested", { success: false, email_domain: email.trim().toLowerCase().split("@")[1] ?? "unknown", error_reason: result.error.slice(0, 120) }); trackFunnel("otp_requested", { method: "email", success: false }); }
    else { setStep("otp"); setDevCode(result.dev); setOtpSentAt(Date.now()); track("otp_requested", { success: true, email_domain: email.trim().toLowerCase().split("@")[1] ?? "unknown" }); trackFunnel("otp_requested", { method: "email", success: true }); }
  };
  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) { trackFunnel("validation_failed", { stage: "otp_verify", field: "code" }); setError("Please enter the 6-digit OTP"); return; }
    setLoading(true); setError(""); const guestId = getGuestIdSafely(); const result = await verifyOtp(email, otp, guestId); setLoading(false);
    if (result.error) { const genericExpiredMessage = /expired/i.test(result.error); const secondsSinceSent = otpSentAt ? (Date.now() - otpSentAt) / 1000 : Infinity; const likelyTypo = genericExpiredMessage && secondsSinceSent < 120; const expired = genericExpiredMessage && !likelyTypo; trackFunnel(expired ? "otp_expired" : "otp_failed", { stage: "verify", reason: result.error.slice(0, 120) }); setError(likelyTypo ? "That code doesn't match. Double-check the 6 digits from your email and try again." : result.error); track("otp_verify_attempted", { success: false, error_reason: result.error.slice(0, 120) }); track("otp_verify_failed", { error_reason: result.error.slice(0, 120) }); }
    else {
      track("otp_verify_attempted", { success: true }); track("otp_verify_success"); trackFunnel("otp_verified", { method: "email" }); track("account_created", { auth_method: "email_otp" }); trackFunnel("account_created", { method: "email_otp" }); trackFunnel("signup_completed", { method: "email_otp" }); trackGoogleAdsSignup("email_otp");
      const params = new URLSearchParams(search); const returnTo = params.get("returnTo"); navigate(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
    }
  };
  const copyCallbackUrl = () => { if (!config?.googleCallbackUrl) return; void navigator.clipboard.writeText(config.googleCallbackUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const googleReady = configLoaded && config?.googleConfigured === true;
  const externalBrowserUrl = getExternalBrowserUrl(new URL(withAcquisition(window.location.pathname + window.location.search), window.location.origin).toString(), navigator.userAgent);
  const returnToParam = new URLSearchParams(search).get("returnTo"); const contextualCopy = getContextualCopy(returnToParam);
  const openExternalBrowser = () => track("oauth_external_browser_clicked", { platform: /Android/i.test(navigator.userAgent) ? "android" : /(iPhone|iPad|iPod)/i.test(navigator.userAgent) ? "ios" : "other" });
  const copyCurrentUrl = () => { void navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8"><div className="w-full max-w-md space-y-4">
      <div className="text-center mb-6"><h1 className="text-4xl font-display font-extrabold text-primary mb-2">Lead Onto</h1><p className="text-muted-foreground">Practical communication and career preparation for India</p></div>
      {isEmbeddedWebView && <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">One tap to continue — open this page in your browser.</p><p className="mt-1 text-xs text-blue-700">This app's built-in browser blocks secure sign-in. It only takes a second.</p><a href={externalBrowserUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700" onClick={openExternalBrowser}><ExternalLink className="h-4 w-4" />Open in browser</a><button type="button" className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900" onClick={copyCurrentUrl}>{copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Link copied — paste it in your browser" : "Or copy this link"}</button><p className="mt-2 text-[11px] leading-relaxed text-blue-700">Didn't work? Use the <span className="font-medium">••• menu</span> in the top corner and choose <span className="font-medium">Open in browser</span>. You can still continue below with email — no browser switch needed.</p></div>}
      {config && !googleReady && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm space-y-2"><div className="flex items-center gap-2 font-semibold text-amber-800"><AlertTriangle className="w-4 h-4 shrink-0" />Google Sign-In needs one-time setup</div><p className="text-amber-700 text-xs leading-relaxed">Use Email OTP below while Google Sign-In is being configured.</p>{config.googleCallbackUrl && <><div className="rounded bg-white p-2 text-[11px] break-all">{config.googleCallbackUrl}</div><button type="button" onClick={copyCallbackUrl} className="text-xs font-semibold text-amber-900">{copied ? "Copied" : "Copy callback URL"}</button></>}</div>}
      {configError && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Sign-in configuration could not be checked. Email OTP remains available.</div>}
      <Card><CardHeader><CardTitle>{contextualCopy.title}</CardTitle><CardDescription>{contextualCopy.description}</CardDescription></CardHeader><CardContent>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {step === "email" ? <div className="space-y-4">
          {googleReady && !isEmbeddedWebView && <Button type="button" className="w-full h-12" disabled={loading} onClick={() => { trackFunnel("signup_started", { method: "google" }); void loginWithGoogle(undefined, withAcquisition(new URLSearchParams(search).get("returnTo") || "/")); }}><ShieldCheck className="mr-2 h-4 w-4" />Continue with Google</Button>}
          {googleReady && !isEmbeddedWebView && <div className="relative my-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or continue with email</span></div></div>}
          <form onSubmit={(e) => { e.preventDefault(); void handleSendOtp(); }} className="space-y-3"><label className="text-sm font-medium">Email address</label><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /><Button type="submit" className="w-full h-12" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}Continue with email</Button></form>
        </div> : <form onSubmit={(e) => { e.preventDefault(); void handleVerifyOtp(); }} className="space-y-4"><label className="text-sm font-medium">Enter the 6-digit code</label><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" autoFocus /><Button type="submit" className="w-full h-12" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Verify and continue</Button><button type="button" className="w-full text-xs text-muted-foreground" onClick={() => { setStep("email"); setError(""); }}>Use a different email</button>{devCode && <div className="rounded-lg bg-muted p-3 text-xs">Development OTP: <strong>{devCode}</strong></div>}</form>}
      </CardContent></Card>
      <p className="text-center text-xs text-muted-foreground">By continuing, you agree to Lead Onto's terms and privacy policy.</p>
      <Link href="/"><span className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to Lead Onto</span></Link>
    </div></div>
  );
}
