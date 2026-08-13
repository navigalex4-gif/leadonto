import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Download, Globe2, Loader2, MapPin, RefreshCw, Search, UserRound } from "lucide-react";
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
  location: string | null;
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
  const [visitorFilter, setVisitorFilter] = useState<"all" | "anonymous" | "signed-in">("all");
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
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
      if (visitorFilter === "anonymous" && row.userId !== null) return false;
      if (visitorFilter === "signed-in" && row.userId === null) return false;
      if (locationFilters.length > 0 && !locationFilters.includes(row.location || "Location unavailable")) return false;
      if (!q) return true;
      return [row.event, row.path, row.ipAddress, row.location, row.anonymousId, row.userName, row.userEmail, row.userAgent]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, query, eventFilter, visitorFilter, locationFilters]);

  const eventOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.event))).sort(),
    [rows],
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.location || "Location unavailable"))).sort(),
    [rows],
  );

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <PageMeta title="Activity · Admin · Lead Onto" description="Anonymous visitor and signed-in activity" />
      <AdminNav />

      <main className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-secondary">Visitor Activity</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-secondary">{rows.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="font-semibold"
            onClick={() => downloadCsv(filtered.map((row) => ({
            id: row.id, event: row.event, path: row.path, anonymousId: row.anonymousId,
            userId: row.userId, userName: row.userName, userEmail: row.userEmail,
             ipAddress: row.ipAddress, location: row.location, userAgent: row.userAgent, createdAt: row.createdAt,
            properties: row.properties,
          })), "edubharat-activity")}
            disabled={!filtered.length}
          >
            <Download className="mr-1.5 h-4 w-4" />Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchActivity()} disabled={fetching}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Anonymous visitors are included. Each row shows the server-recorded location, IP, route, time, and activity.
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
      <div className="mb-4 rounded-xl border border-border bg-muted/20 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-secondary">Filter activity</p>
          <span className="text-xs text-muted-foreground">{filtered.length} of {rows.length} shown</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label htmlFor="activity-event-filter" className="text-xs font-semibold text-muted-foreground">
            Event type
            <select
              id="activity-event-filter"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal text-secondary"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
            >
              <option value="all">All events</option>
              {eventOptions.map((event) => <option key={event} value={event}>{event}</option>)}
            </select>
          </label>
          <label htmlFor="activity-visitor-filter" className="text-xs font-semibold text-muted-foreground">
            Visitor type
            <select
              id="activity-visitor-filter"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal text-secondary"
              value={visitorFilter}
              onChange={(event) => setVisitorFilter(event.target.value as typeof visitorFilter)}
            >
              <option value="all">All visitors</option>
              <option value="anonymous">Anonymous visitors</option>
              <option value="signed-in">Signed-in users</option>
            </select>
          </label>
          <label htmlFor="activity-location-filter" className="text-xs font-semibold text-muted-foreground">
            Location
            <details className="group relative mt-1">
              <summary
                id="activity-location-filter"
                className="flex cursor-pointer list-none items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm font-normal text-secondary [&::-webkit-details-marker]:hidden"
              >
                <span>{locationFilters.length ? `${locationFilters.length} location${locationFilters.length === 1 ? "" : "s"} selected` : "All locations"}</span>
                <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-background p-2 shadow-xl">
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-semibold text-secondary hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={locationFilters.length === 0}
                    onChange={() => setLocationFilters([])}
                    className="h-4 w-4 accent-primary"
                  />
                  All locations
                </label>
                <div className="my-1 border-t border-border" />
                {locationOptions.map((location) => (
                  <label key={location} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm font-normal text-secondary hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={locationFilters.includes(location)}
                      onChange={(event) => {
                        setLocationFilters((current) =>
                          event.target.checked
                            ? [...current, location]
                            : current.filter((selected) => selected !== location),
                        );
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span>{location}</span>
                  </label>
                ))}
              </div>
            </details>
          </label>
        </div>
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
                     <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{row.location || "Location unavailable"}</span>
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
      </main>
    </div>
  );
}