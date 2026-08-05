import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Download, Globe2, Loader2, RefreshCw, Search, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PageMeta } from "@/components/page-meta";
import { AdminNav } from "@/components/admin-nav";
import { useAuth } from "@/lib/use-auth";
import { downloadCsv } from "@/lib/export-data";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type ActivityRow = {
  id: number;
  event: string;
  path: string;
  properties: string | null;
  anonymousId: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
};

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function AdminActivity() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [fetching, setFetching] = useState(false);
  const isAdmin = user?.isAdmin === true;

  const fetchActivity = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`${BASE}/api/admin/visitor-activity`, { credentials: "include" });
      if (!res.ok) {
        toast({ title: "Failed to load activity", variant: "destructive" });
        return;
      }
      const data = (await res.json()) as { activities?: ActivityRow[] };
      setRows(data.activities ?? []);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate("/");
  }, [isLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) void fetchActivity();
  }, [isAdmin, fetchActivity]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (eventFilter !== "all" && row.event !== eventFilter) return false;
      if (!q) return true;
      return [row.event, row.path, row.ipAddress, row.anonymousId, row.userName, row.userEmail, row.userAgent]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, query, eventFilter]);

  const eventOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.event))).sort(),
    [rows],
  );

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <PageMeta title="Activity · Admin · EduBharat" description="Anonymous visitor and signed-in activity" />
      <AdminNav />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-secondary">Visitor Activity</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-secondary">{rows.length}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv(filtered.map((row) => ({
            id: row.id, event: row.event, path: row.path, anonymousId: row.anonymousId,
            userId: row.userId, userName: row.userName, userEmail: row.userEmail,
            ipAddress: row.ipAddress, userAgent: row.userAgent, createdAt: row.createdAt,
            properties: row.properties,
          })), "edubharat-activity")} disabled={!filtered.length}>
            <Download className="mr-1.5 h-4 w-4" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchActivity()} disabled={fetching}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Anonymous visitors are included. Each row shows the server-recorded IP, route, time, and activity.
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by IP, route, event, visitor or user…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="activity-event-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event</label>
        <select
          id="activity-event-filter"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-secondary"
          value={eventFilter}
          onChange={(event) => setEventFilter(event.target.value)}
        >
          <option value="all">All events</option>
          {eventOptions.map((event) => <option key={event} value={event}>{event}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      {fetching && rows.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No visitor activity found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <Card key={row.id}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{row.event}</span>
                    {row.userId ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><UserRound className="h-3 w-3" />{row.userName || row.userEmail || `User ${row.userId}`}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Anonymous visitor</span>
                    )}
                  </div>
                  <p className="truncate font-semibold text-secondary" title={row.path}>{row.path}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />IP: {row.ipAddress || "Not recorded"}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{fmt(row.createdAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground" title={row.userAgent || undefined}>{row.userAgent || "User agent not recorded"}</p>
                </div>
                <div className="text-left text-[11px] text-muted-foreground md:max-w-[260px] md:text-right">
                  <p className="font-mono">Visitor: {row.anonymousId.slice(0, 16)}…</p>
                  {row.userEmail && <p className="truncate">{row.userEmail}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}