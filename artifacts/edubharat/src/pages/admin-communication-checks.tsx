import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Loader2, RefreshCw, Search, Timer } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PageMeta } from "@/components/page-meta";
import { useAuth } from "@/lib/use-auth";
import { AdminNav } from "@/components/admin-nav";
import { downloadCsv } from "@/lib/export-data";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type CheckRow = {
  id: number;
  userId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  targetRole: string | null;
  experienceLevel: string | null;
  overallScore: number | null;
  communicationScore: number | null;
  confidenceScore: number | null;
  clarityScore: number | null;
  durationSeconds: number | null;
  feedbackJson: string;
  answersJson: string;
  completedAt: string;
  createdAt: string;
  userEmail: string | null;
};

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function scoreClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 75) return "text-green-700";
  if (score >= 55) return "text-amber-700";
  return "text-red-700";
}

function parseJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}

export default function AdminCommunicationChecks() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const isAdmin = user?.isAdmin === true;

  const fetchChecks = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`${BASE}/api/admin/communication-checks`, { credentials: "include" });
      if (!res.ok) {
        toast({ title: "Failed to load 90-second checks", variant: "destructive" });
        return;
      }
      const data = await res.json() as { checks?: CheckRow[] };
      setChecks(data.checks ?? []);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate("/");
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) void fetchChecks();
  }, [fetchChecks, isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return checks;
    return checks.filter((check) => [
      check.name, check.email, check.phone, check.location,
      check.targetRole, check.experienceLevel,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q)));
  }, [checks, query]);

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <PageMeta title="90-second Checks · Admin · Lead Onto" description="Homepage communication check candidates and feedback" />
      <AdminNav />

      <main className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Timer className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-secondary">90-second Checks</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-secondary">{checks.length}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!filtered.length}
            onClick={() => downloadCsv(filtered.map((check) => ({
              id: check.id,
              name: check.name,
              email: check.email,
              phone: check.phone,
              location: check.location,
              targetRole: check.targetRole,
              experienceLevel: check.experienceLevel,
              overallScore: check.overallScore,
              communicationScore: check.communicationScore,
              confidenceScore: check.confidenceScore,
              clarityScore: check.clarityScore,
              durationSeconds: check.durationSeconds,
              completedAt: check.completedAt,
            })), "leadonto-90-second-checks")}
          >
            <Download className="mr-1.5 h-4 w-4" />Export CSV
          </Button>
          <Button variant="outline" size="sm" disabled={fetching} onClick={() => void fetchChecks()}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Homepage CTA candidates, their contact details, scorecard, and spoken answers.
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name, email, phone, city or role…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="mb-3 text-xs text-muted-foreground">{filtered.length} of {checks.length} candidates shown</div>

      {fetching && !checks.length ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No completed 90-second checks yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((check) => {
            const open = expanded === check.id;
            const feedbackValue = parseJson(check.feedbackJson);
            const feedback = feedbackValue && typeof feedbackValue === "object"
              ? feedbackValue as Record<string, unknown>
              : null;
            const answers = parseJson(check.answersJson);
            return (
              <Card key={check.id} className="overflow-hidden">
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40" onClick={() => setExpanded(open ? null : check.id)}>
                  {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-bold text-secondary">{check.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{check.email || "No email"}</span>
                      {check.phone && <span className="text-xs text-muted-foreground">{check.phone}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {check.targetRole && <span>Role: {check.targetRole}</span>}
                      {check.location && <span>Location: {check.location}</span>}
                      <span>{fmt(check.completedAt)}</span>
                    </div>
                  </div>
                  <div className="hidden items-center gap-3 sm:flex">
                    <div className="text-center"><p className={`text-lg font-extrabold ${scoreClass(check.overallScore)}`}>{check.overallScore ?? "—"}</p><p className="text-[10px] uppercase text-muted-foreground">Overall</p></div>
                    <div className="text-center"><p className={`text-lg font-extrabold ${scoreClass(check.communicationScore)}`}>{check.communicationScore ?? "—"}</p><p className="text-[10px] uppercase text-muted-foreground">Comm.</p></div>
                    <div className="text-center"><p className={`text-lg font-extrabold ${scoreClass(check.confidenceScore)}`}>{check.confidenceScore ?? "—"}</p><p className="text-[10px] uppercase text-muted-foreground">Conf.</p></div>
                  </div>
                </button>
                {open && (
                  <div className="space-y-5 border-t border-border bg-muted/20 px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-4">
                      {[
                        ["Overall", check.overallScore],
                        ["Communication", check.communicationScore],
                        ["Confidence", check.confidenceScore],
                        ["Clarity", check.clarityScore],
                      ].map(([label, value]) => <div key={label} className="rounded-lg border bg-background p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-bold ${scoreClass(value as number | null)}`}>{value ?? "—"}</p></div>)}
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-3">
                      <div><p className="text-[11px] uppercase text-muted-foreground">Experience</p><p className="text-secondary">{check.experienceLevel || "—"}</p></div>
                      <div><p className="text-[11px] uppercase text-muted-foreground">Duration</p><p className="text-secondary">{check.durationSeconds ?? 0}s</p></div>
                      <div><p className="text-[11px] uppercase text-muted-foreground">Account</p><p className="text-secondary">{check.userId ? `Signed-in user #${check.userId}` : "Guest lead"}</p></div>
                    </div>
                    {feedback && (
                      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Candidate feedback</p>
                        <p className="mt-1 font-semibold text-secondary">{String(feedback.headline || "")}</p>
                        <p className="mt-1 text-sm text-secondary">{String(feedback.summary || "")}</p>
                        <p className="mt-3 text-sm text-secondary"><strong>Next step:</strong> {String(feedback.oneNextStep || "")}</p>
                      </div>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Spoken answers</p>
                      <div className="space-y-2">
                        {Array.isArray(answers) ? answers.map((item, index) => {
                          const row = item as { question?: string; answer?: string };
                          return <div key={`${check.id}-${index}`} className="rounded-lg border bg-background p-3 text-sm"><p className="font-semibold text-secondary">Q{index + 1}. {row.question}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{row.answer || "(no answer captured)"}</p></div>;
                        }) : <p className="text-sm text-muted-foreground">No transcript available.</p>}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      </main>
    </div>
  );
}