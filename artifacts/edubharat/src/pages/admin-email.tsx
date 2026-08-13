import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Copy, Mail, Send, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PageMeta } from "@/components/page-meta";
import { useAuth } from "@/lib/use-auth";
import { AdminNav } from "@/components/admin-nav";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface DnsRecord {
  record: string;
  name: string;
  value: string;
  type: string;
  ttl: string;
  status: string;
  priority?: number;
}

interface DomainData {
  id: string;
  name: string;
  status: string;
  records: DnsRecord[];
  region: string;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Verified
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" /> Failed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="w-3 h-3" /> {status === "not_started" ? "Pending DNS" : status}
    </Badge>
  );
}

function CopyButton({ text }: { text: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function AdminEmail() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [domain, setDomain] = useState<DomainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [lastSentTo, setLastSentTo] = useState<string | null>(null);

  const isAdmin = user?.isAdmin === true;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/resend/domain`, { credentials: "include" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as DomainData;
      setDomain(data);
    } catch {
      toast({ title: "Could not load domain status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate("/");
  }, [isLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const sendTest = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch(`${BASE}/api/admin/resend/test-email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const d = (await res.json()) as { error?: string };
      if (res.ok) {
        setLastSentTo(testEmail);
        setTestResult({ ok: true, message: `Test OTP sent to ${testEmail}. Follow the checklist below to verify inbox delivery.` });
        toast({ title: "Test email sent!" });
      } else {
        setTestResult({ ok: false, message: d.error ?? "Failed to send test email." });
        toast({ title: d.error ?? "Send failed", variant: "destructive" });
      }
    } catch {
      setTestResult({ ok: false, message: "Network error — could not reach the server." });
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/api/admin/resend/domain/verify`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        toast({ title: d.error ?? "Verification failed", variant: "destructive" });
        return;
      }
      toast({ title: "Verification triggered — refreshing status…" });
      // Wait a moment then reload
      await new Promise((r) => setTimeout(r, 1500));
      await load();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading || (!isAdmin && !isLoading)) return null;

  return (
    <>
      <PageMeta title="Email Settings — Admin" description="Resend domain verification and DNS records for leadonto.com email delivery." />
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-8 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <AdminNav />

          <main className="min-w-0">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" />
                Email — leadonto.com
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Resend domain verification. Publish the DNS records below to your registrar, then click Verify.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={verify} disabled={verifying || loading || domain?.status === "verified"}>
                {verifying ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                {domain?.status === "verified" ? "Verified ✓" : "Verify Now"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : domain ? (
            <div className="space-y-4">
              {/* Domain overview */}
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Domain</span>
                      <p className="font-semibold text-foreground">{domain.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <div className="mt-0.5">
                        <StatusBadge status={domain.status} />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Region</span>
                      <p className="font-semibold text-foreground">{domain.region}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sender</span>
                      <p className="font-semibold text-foreground">email@leadonto.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DNS records */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">DNS Records to Publish</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Add all three records at your domain registrar (e.g. GoDaddy, Cloudflare, Namecheap). DNS changes can take up to 72 hours to propagate, though usually less than 30 minutes.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {domain.records.map((rec, i) => (
                      <div key={i} className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">{rec.type}</Badge>
                            <span className="text-sm font-medium text-foreground">{rec.record}</span>
                          </div>
                          <StatusBadge status={rec.status} />
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground w-12 shrink-0 pt-0.5">Host</span>
                            <span className="text-foreground break-all bg-muted/50 rounded px-2 py-1 flex-1">
                              {rec.name}
                              <CopyButton text={rec.name} />
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground w-12 shrink-0 pt-0.5">Value</span>
                            <span className="text-foreground break-all bg-muted/50 rounded px-2 py-1 flex-1">
                              {rec.value}
                              <CopyButton text={rec.value} />
                            </span>
                          </div>
                          {rec.priority !== undefined && (
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground w-12 shrink-0 pt-0.5">Prio</span>
                              <span className="text-foreground bg-muted/50 rounded px-2 py-1">{rec.priority}</span>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground w-12 shrink-0 pt-0.5">TTL</span>
                            <span className="text-foreground bg-muted/50 rounded px-2 py-1">{rec.ttl}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Verification Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Copy each DNS record above and add it at your leadonto.com registrar/DNS provider.</li>
                    <li>Wait for DNS to propagate (typically 5–30 minutes; up to 72 hours in the worst case).</li>
                    <li>Click <strong className="text-foreground">Verify Now</strong> — Resend will check all three records and mark the domain verified.</li>
                    <li>Once the domain status shows <strong className="text-foreground">Verified</strong>, OTP emails will reach all users, not just the Resend account owner.</li>
                    <li>Use <strong className="text-foreground">Send Test OTP</strong> below to confirm real delivery to a non-owner inbox.</li>
                  </ol>
                </CardContent>
              </Card>

              {/* Test email delivery */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    Send Test OTP Email
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Send a real OTP to any inbox to confirm end-to-end delivery. The code is written to the OTP table so you can complete the login flow as a genuine test.
                    {domain?.status !== "verified" && (
                      <span className="block mt-1 text-amber-600 font-medium">⚠ Domain is not yet verified — the email may only reach the Resend account owner.</span>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="test-email" className="text-sm">Recipient email</Label>
                      <Input
                        id="test-email"
                        type="email"
                        placeholder="you@gmail.com"
                        value={testEmail}
                        onChange={(e) => { setTestEmail(e.target.value); setTestResult(null); }}
                        disabled={sendingTest}
                        className="h-9"
                      />
                    </div>
                    <Button size="sm" onClick={sendTest} disabled={sendingTest || !testEmail} className="shrink-0">
                      {sendingTest
                        ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        : <Send className="w-4 h-4 mr-1.5" />}
                      {sendingTest ? "Sending…" : "Send Test OTP"}
                    </Button>
                  </div>
                  {testResult && (
                    <div className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm border ${
                      testResult.ok
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {testResult.ok
                        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Post-send delivery checklist — shown after a test OTP is sent */}
              {lastSentTo && (
                <Card className="border-blue-200 bg-blue-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Inbox Delivery Checklist
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Complete these steps to confirm the email reached the inbox and the login flow works end-to-end.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3 text-sm">
                      <li className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <p className="font-medium text-foreground">Open Gmail at <span className="font-mono text-blue-700">{lastSentTo}</span></p>
                          <p className="text-muted-foreground text-xs mt-0.5">Look for a message from <strong>email@leadonto.com</strong> with subject <strong>"Lead Onto — Test OTP Delivery"</strong>. It should arrive within 1–2 minutes.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <p className="font-medium text-foreground">Check it landed in the Inbox (not Spam)</p>
                          <p className="text-muted-foreground text-xs mt-0.5">If it's in spam, the SPF/DKIM records aren't verified yet — see the troubleshooting section below. If the domain shows Verified above, click Refresh and wait a few more minutes.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <p className="font-medium text-foreground">Verify the email content</p>
                          <p className="text-muted-foreground text-xs mt-0.5">The email should show the Lead Onto name, a 6-digit OTP code, and an expiry note. The sender name and code must be clearly readable.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">4</span>
                        <div>
                          <p className="font-medium text-foreground">Complete the login flow on leadonto.com</p>
                          <p className="text-muted-foreground text-xs mt-0.5">Go to <strong>leadonto.com → Login → "Sign in with email"</strong>. Enter <strong>{lastSentTo}</strong>, then paste the OTP from the email. Confirm you reach the dashboard successfully — this verifies the end-to-end auth flow.</p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              )}

              {/* Spam troubleshooting guide */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    If Email Lands in Spam
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground mb-1">Step 1 — Verify all three DNS records above are showing <Badge className="bg-green-100 text-green-800 border-green-200 text-xs ml-1">Verified</Badge></p>
                      <p className="text-muted-foreground">SPF, DKIM, and the Return-Path (CNAME) record must all be verified. If any show <strong>Pending DNS</strong>, the records haven't propagated yet — wait 30–60 minutes and click Verify Now again.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Step 2 — Check Gmail's spam reasoning</p>
                      <p className="text-muted-foreground">Open the email in Gmail spam → click the <strong>three-dot menu → Show original</strong>. Look at the Authentication Results header:</p>
                      <ul className="mt-1.5 space-y-1 text-muted-foreground list-disc list-inside">
                        <li><strong>spf=fail</strong> or <strong>spf=softfail</strong> → SPF TXT record not propagated or wrong value; re-check the Host/Value from the DNS records table above.</li>
                        <li><strong>dkim=fail</strong> → DKIM CNAME record not propagated or has a typo; copy the value with the copy button above to avoid errors.</li>
                        <li><strong>spf=pass dkim=pass</strong> but still in spam → domain reputation is new; send a few test emails over 1–2 days. Gmail warms up new domains automatically.</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Step 3 — Force a re-check</p>
                      <p className="text-muted-foreground">After fixing any DNS record, click <strong>Verify Now</strong> above to ask Resend to re-check immediately (instead of waiting for its next automatic check). Then send another test OTP.</p>
                    </div>
                    <div className="flex gap-2 items-start rounded-md bg-muted/60 px-3 py-2.5 border">
                      <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">New domains typically reach inbox reliably within 24 hours of SPF/DKIM verification as Gmail's reputation system registers the domain. Until then, test emails to a Gmail address you <em>own</em> may go to spam even with correct DNS — but live user OTP emails sent after a day of warmup will not.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No domain data available.</p>
          )}
          </main>
        </div>
      </div>
    </>
  );
}
