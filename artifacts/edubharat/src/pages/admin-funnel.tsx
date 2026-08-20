import { useCallback, useEffect, useState } from "react";
import { BarChart3, Download, Loader2, RefreshCw, Users } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageMeta } from "@/components/page-meta";
import { AdminNav } from "@/components/admin-nav";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/lib/export-data";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
type Summary = {
  days: number;
  uniqueVisitors: number;
  stages: { stage: string; events: number; uniqueVisitors: number; conversionFromLanding: number }[];
  errors: Record<string, number>;
  breakdowns: Record<string, { label: string; uniqueVisitors: number }[]>;
};

function label(value: string): string {
  return value.replace(/^communication_check_/, "check ").replace(/_/g, " ");
}

export default function AdminFunnel() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [days, setDays] = useState("30");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fetching, setFetching] = useState(false);
  const isAdmin = user?.isAdmin === true;

  const fetchSummary = useCallback(async () => {
    setFetching(true);
    try {
      const response = await fetch(`${BASE}/api/admin/funnel?days=${days}`, { credentials: "include" });
      const data = await response.json() as Summary & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load funnel");
      setSummary(data);
    } catch (error) {
      toast({ title: "Could not load funnel", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  }, [days, toast]);

  useEffect(() => { if (!isLoading && !isAdmin) navigate("/"); }, [isAdmin, isLoading, navigate]);
  useEffect(() => { if (isAdmin) void fetchSummary(); }, [fetchSummary, isAdmin]);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <PageMeta title="Funnel · Admin · Lead Onto" description="Acquisition and signup funnel diagnostics" />
      <AdminNav />
      <main className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><BarChart3 className="h-6 w-6 text-primary" /><h1 className="font-display text-2xl font-bold text-secondary">Acquisition funnel</h1></div>
          <div className="flex items-center gap-2">
            <select aria-label="Funnel date range" className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={days} onChange={(event) => setDays(event.target.value)}>
              <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 180 days</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => void fetchSummary()} disabled={fetching}><RefreshCw className={`mr-1.5 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />Refresh</Button>
            <Button variant="outline" size="sm" disabled={!summary} onClick={() => summary && downloadCsv(summary.stages, "leadonto-funnel-stages")}><Download className="mr-1.5 h-4 w-4" />Export</Button>
          </div>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">Unique external visitors and stage conversion. Admin routes, the seeded admin account, and events marked as test are excluded.</p>
        {fetching && !summary ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : summary ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card><CardContent className="p-5"><Users className="h-5 w-5 text-primary" /><p className="mt-3 text-3xl font-extrabold text-secondary">{summary.uniqueVisitors}</p><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unique visitors</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-3xl font-extrabold text-secondary">{summary.stages.find((stage) => stage.stage === "communication_check_completed")?.uniqueVisitors ?? 0}</p><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed checks</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-3xl font-extrabold text-secondary">{summary.stages.find((stage) => stage.stage === "account_created")?.uniqueVisitors ?? 0}</p><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accounts created</p></CardContent></Card>
            </div>
            <Card><CardHeader><CardTitle>Stage conversion</CardTitle></CardHeader><CardContent className="space-y-3">
              {summary.stages.map((stage) => <div key={stage.stage} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm"><span className="font-semibold capitalize text-secondary">{label(stage.stage)}</span><span className="text-muted-foreground">{stage.uniqueVisitors} visitors · {stage.events} events</span><span className="font-bold text-primary">{stage.conversionFromLanding}%</span></div>)}
            </CardContent></Card>
            <div className="grid gap-5 lg:grid-cols-3">
              {(["browser", "device", "source"] as const).map((kind) => <Card key={kind}><CardHeader><CardTitle className="capitalize">{kind}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{(summary.breakdowns[kind] ?? []).length ? summary.breakdowns[kind]!.map((item) => <div key={item.label} className="flex justify-between gap-3"><span className="truncate text-secondary">{item.label}</span><span className="font-bold text-muted-foreground">{item.uniqueVisitors}</span></div>) : <p className="text-muted-foreground">No data yet.</p>}</CardContent></Card>)}
            </div>
            <Card><CardHeader><CardTitle>Funnel errors</CardTitle></CardHeader><CardContent>{Object.keys(summary.errors).length ? <div className="flex flex-wrap gap-2">{Object.entries(summary.errors).map(([error, count]) => <span key={error} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{label(error)} · {count}</span>)}</div> : <p className="text-sm text-muted-foreground">No classified funnel errors in this period.</p>}</CardContent></Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}