import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/use-auth";
import { Loader2, Mail, ArrowRight, ShieldCheck, AlertTriangle, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { PageMeta } from "@/components/page-meta";
import { track, trackFunnel } from "@/lib/analytics";

type AuthConfig = {
  googleConfigured: boolean;
  googleCallbackUrl: string;
  otpEmailConfigured: boolean;
  otpDevMode: boolean;
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function detectEmbeddedWebView(userAgent: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Twitter|LinkedInApp|Snapchat|TikTok|Pinterest|;\s*wv\)|\bwv\b/i.test(userAgent);
}

function getExternalBrowserUrl(url: string, userAgent: string): string {
  // Android's generic VIEW intent lets the OS choose an installed browser
  // instead of forcing Chrome. This is handled by Facebook/Instagram webviews.
  if (/Android/i.test(userAgent)) {
    const browserTarget = url.replace(/^https?:\/\//i, "");
    return `intent://${browserTarget}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
  }

  // Facebook's iOS webview recognizes this handoff scheme for Safari. Users
  // can still choose another installed browser from the iOS share sheet/menu.
  if (/(iPhone|iPad|iPod)/i.test(userAgent) && /^https:/i.test(url)) {
    return url.replace(/^https:/i, "x-safari-https:");
  }

  return url;
}

function getContextualCopy(returnTo: string | null): { title: string; description: string } {
  const path = returnTo ?? "";
  if (path.startsWith("/interview-ace")) {
    return {
      title: "Keep your interview practice going",
      description: "Create your free account to unlock more mock interviews, save your history, and get 20 free credits.",
    };
  }
  if (path.startsWith("/english-guru")) {
    return {
      title: "Don't lose your speaking streak",
      description: "Create your free account to keep practising with your coach and get 20 free credits.",
    };
  }
  if (path.startsWith("/resume-intelligence")) {
    return {
      title: "Save your resume feedback",
      description: "Create your free account to keep your ATS scan results and get 20 free credits.",
    };
  }
  return {
    title: "Create your free account",
    description: "Save your progress and get 20 free credits to keep practising",
  };
}

export default function Login() {
  return (
    <>
      <PageMeta title="Create Your Free Account" description="Create a free Lead Onto account to save your progress and receive 20 credits." noindex />
      <LoginContent />
    </>
  );
}

function LoginContent() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { loginWithGoogle, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    // Show error from Google OAuth redirect (e.g. ?error=google_failed)
    const params = new URLSearchParams(search);
    const e = params.get("error");
    if (e === "google_failed") return "Google Sign-In failed. Please try again or use Email OTP below.";
    return "";
  });
  const [devCode, setDevCode] = useState<string | undefined>();
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  // Fail open: assume Google is configured until we hear otherwise.
  // This prevents the button from being disabled on transient config-fetch errors.
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  // Detect during the initial render so Google is never clickable before the
  // page-load effect runs.
  const [isEmbeddedWebView] = useState(() => detectEmbeddedWebView(navigator.userAgent));

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const embedded = detectEmbeddedWebView(userAgent);
    if (embedded) track("oauth_blocked_webview", { userAgent: userAgent.slice(0, 240) });
    if (embedded) trackFunnel("webview_blocked", { stage: "signup", browser: userAgent.slice(0, 160) });
    if (embedded && typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
      console.log("[auth] Google OAuth blocked for embedded webview", { userAgent });
    }
    track("signup_form_viewed", { webview: embedded });
    trackFunnel("signup_opened", { webview: embedded });

    fetch(`${BASE}/api/auth/config`, { credentials: "include" })
      .then(r => r.json())
      .then((d: AuthConfig) => { setConfig(d); setConfigLoaded(true); })
      .catch(() => {
        trackFunnel("api_failed", { stage: "auth_config" });
        // Config fetch failed — fail open so Google button still works
        setConfigLoaded(true);
      });
  }, []);

  useEffect(() => {
    const errorCode = new URLSearchParams(search).get("error");
    if (!errorCode) return;
    trackFunnel("oauth_failed", { code: errorCode });
  }, [search]);

  const handleSendOtp = async () => {
    trackFunnel("signup_started", { method: "email_otp" });
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      trackFunnel("validation_failed", { stage: "otp_request", field: "email" });
      setError("Please enter a valid email address"); return;
    }
    setLoading(true);
    setError("");
    const result = await sendOtp(email);
    setLoading(false);
    if (result.error) {
      trackFunnel("otp_failed", { stage: "request", reason: result.error.slice(0, 120) });
      if (/send|delivery|email/i.test(result.error)) trackFunnel("api_failed", { stage: "otp_request" });
      setError(result.error);
      track("otp_requested", {
        success: false,
        email_domain: email.trim().toLowerCase().split("@")[1] ?? "unknown",
        error_reason: result.error.slice(0, 120),
      });
      trackFunnel("otp_requested", { method: "email", success: true });
    } else {
      setStep("otp");
      setDevCode(result.dev);
      setOtpSentAt(Date.now());
      track("otp_requested", {
        success: true,
        email_domain: email.trim().toLowerCase().split("@")[1] ?? "unknown",
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      trackFunnel("validation_failed", { stage: "otp_verify", field: "code" });
      setError("Please enter the 6-digit OTP"); return;
    }
    setLoading(true);
    setError("");
    // Pass any guest ID so the server can merge lesson progress into the account
    const guestId = localStorage.getItem("edubharat_guest_id") ?? undefined;
    const result = await verifyOtp(email, otp, guestId);
    setLoading(false);
    if (result.error) {
      const genericExpiredMessage = /expired/i.test(result.error);
      const secondsSinceSent = otpSentAt ? (Date.now() - otpSentAt) / 1000 : Infinity;
      const likelyTypo = genericExpiredMessage && secondsSinceSent < 120;
      const expired = genericExpiredMessage && !likelyTypo;
      trackFunnel(expired ? "otp_expired" : "otp_failed", { stage: "verify", reason: result.error.slice(0, 120) });
      setError(likelyTypo ? "That code doesn't match. Double-check the 6 digits from your email and try again." : result.error);
      track("otp_verify_attempted", { success: false, error_reason: result.error.slice(0, 120) });
      track("otp_verify_failed", { error_reason: result.error.slice(0, 120) });
    } else {
      track("otp_verify_attempted", { success: true });
      track("otp_verify_success");
      trackFunnel("otp_verified", { method: "email" });
      track("account_created", { auth_method: "email_otp" });
      trackFunnel("account_created", { method: "email_otp" });
      const params = new URLSearchParams(search);
      const returnTo = params.get("returnTo");
      navigate(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
    }
  };

  const copyCallbackUrl = () => {
    if (!config?.googleCallbackUrl) return;
    void navigator.clipboard.writeText(config.googleCallbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fail open: treat Google as ready until config explicitly says it isn't.
  // This prevents a transient /api/auth/config failure from disabling the button.
  const googleReady = configLoaded ? (config?.googleConfigured ?? true) : true;
  const externalBrowserUrl = getExternalBrowserUrl(window.location.href, navigator.userAgent);
  const returnToParam = new URLSearchParams(search).get("returnTo");
  const contextualCopy = getContextualCopy(returnToParam);
  const openExternalBrowser = () => {
    track("oauth_external_browser_clicked", {
      platform: /Android/i.test(navigator.userAgent) ? "android" : /(iPhone|iPad|iPod)/i.test(navigator.userAgent) ? "ios" : "other",
    });
  };
  const copyCurrentUrl = () => {
    void navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
           <h1 className="text-4xl font-display font-extrabold text-primary mb-2">Lead Onto</h1>
          <p className="text-muted-foreground">Practical communication and career preparation for India</p>
        </div>

        {isEmbeddedWebView && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">One tap to continue — open this page in your browser.</p>
            <p className="mt-1 text-xs text-blue-700">This app's built-in browser blocks secure sign-in. It only takes a second.</p>
            <a
              href={externalBrowserUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              onClick={openExternalBrowser}
            >
              <ExternalLink className="h-4 w-4" />Open in browser
            </a>
            <button type="button" className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900" onClick={copyCurrentUrl}>
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Link copied — paste it in your browser" : "Or copy this link"}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-blue-700">
              Didn't work? Use the <span className="font-medium">••• menu</span> in the top corner and choose <span className="font-medium">Open in browser</span>. You can still continue below with email — no browser switch needed.
            </p>
          </div>
        )}

        {/* Google OAuth setup notice — shown when callback URL isn't registered */}
        {config && !googleReady && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Google Sign-In needs one-time setup
            </div>
            <p className="text-amber-700 text-xs leading-relaxed">
              Add this URL to your{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Google Cloud Console
              </a>{" "}
              → OAuth 2.0 Client → Authorized redirect URIs:
            </p>
            <div className="flex items-center gap-2 bg-white rounded border border-amber-200 px-3 py-2">
              <code className="text-xs text-amber-900 flex-1 break-all">{config.googleCallbackUrl}</code>
              <button onClick={copyCallbackUrl} className="shrink-0 text-amber-600 hover:text-amber-800">
                {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-amber-600 text-xs">
              Or set <code className="bg-amber-100 px-1 rounded">GOOGLE_CALLBACK_URL</code> in Replit Secrets to that URL for a stable redirect. Use Email OTP below in the meantime.
            </p>
          </div>
        )}

        {/* Google OAuth setup notice — configured but let user know it might still mismatch if URL changed */}
        {config && googleReady && (
          <details className="rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500 p-3 cursor-pointer">
            <summary className="font-medium text-slate-600 select-none">Google Sign-In configured ✓</summary>
            <p className="mt-2 leading-relaxed">
              If you see a redirect_uri_mismatch error, add this exact URL to Google Cloud Console → Authorized redirect URIs:
            </p>
            <div className="flex items-center gap-2 bg-white rounded border border-slate-200 px-2 py-1.5 mt-1.5">
              <code className="flex-1 break-all">{config.googleCallbackUrl}</code>
              <button onClick={copyCallbackUrl} className="shrink-0 text-slate-500 hover:text-slate-700">
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </details>
        )}

        <Card className="shadow-xl border-none">
          <CardHeader className="text-center pb-2">
             <CardTitle className="text-2xl">{contextualCopy.title}</CardTitle>
             <CardDescription>{contextualCopy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {!isEmbeddedWebView && (
              <Button
                variant="outline"
                className="w-full h-12 font-semibold text-base border-2 disabled:opacity-60"
                onClick={googleReady
                   ? () => {
                       trackFunnel("signup_started", { method: "google" });
                       loginWithGoogle(
                      localStorage.getItem("edubharat_guest_id") ?? undefined,
                      new URLSearchParams(search).get("returnTo") ?? undefined,
                       );
                     }
                  : copyCallbackUrl}
                title={!googleReady ? "Google login not yet configured — see setup instructions above" : undefined}
                data-testid="button-google-login"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h-3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleReady ? "Continue with Google" : "Google Sign-In (not configured)"}
              </Button>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{isEmbeddedWebView ? "Continue securely with email" : "Or continue with email"}</span>
              </div>
            </div>

            {step === "email" ? (
              <div className="space-y-3">
                {config?.otpDevMode && (
                  <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2.5">
                    <strong>Dev mode:</strong> Email isn't connected, so your 6-digit code will appear on screen after you click Send OTP.
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    className="h-12 pl-10"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                    data-testid="input-email"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full h-12 font-bold" onClick={handleSendOtp} disabled={loading} data-testid="button-send-otp">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Send OTP
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center">
                  <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    OTP sent to <span className="font-semibold text-secondary">{email}</span>
                  </p>
                  {devCode && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-700 mb-1">Dev mode — your code is:</p>
                      <p className="text-3xl font-bold tracking-[0.4em] text-amber-900">{devCode}</p>
                      <p className="text-xs text-amber-600 mt-1">Email isn't connected — this code is shown for testing only</p>
                    </div>
                  )}
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  className="h-12 text-center text-2xl font-bold tracking-[0.5em]"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
                  data-testid="input-otp"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full h-12 font-bold" onClick={handleVerifyOtp} disabled={loading || otp.length < 6} data-testid="button-verify-otp">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Verify & Sign In
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setStep("email"); setOtp(""); setError(""); }}>
                  ← Use different email
                </Button>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              By signing in, you agree to our Terms of Service.{" "}
              <span className="text-muted-foreground/60">Your data is stored securely.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
