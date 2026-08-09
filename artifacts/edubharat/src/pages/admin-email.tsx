import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <AdminNav />

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
                  </ol>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No domain data available.</p>
          )}
        </div>
      </div>
    </>
  );
}
