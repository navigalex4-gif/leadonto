import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CheckSquare, Clock3, Download, Globe2, Loader2, MapPin, RefreshCw, Search, Trash2, UserRound, Users } from "lucide-react";
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

type FunnelSummary = {
  days: number;
  uniqueVisitors: number;
  stages: { stage: string; events: number; uniqueVisitors: number; conversionFromLanding: number }[];
  errors: Record<string, number>;
  breakdowns: Record<string, { label: string; uniqueVisitors: number }[]>;
};

type ActivityTab = "visitors" | "admin";

type ActivitySession = {
  key: string;
  rows: ActivityRow[];
  firstAt: string;
  lastAt: string;
  visitorId: string;
  ipAddress: string | null;
  location: string | null;
  userAgent: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  paths: string[];
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

function funnelLabel(value: string): string {
  return value.replace(/^communication_check_/, "check ").replace(/_/g, " ");
}

const SESSION_GAP_MS = 30 * 60 * 1000;

function groupIntoSessions(rows: ActivityRow[]): ActivitySession[] {
  const sorted = [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const sessions: ActivitySession[] = [];
  const activeByVisitor = new Map<string, ActivitySession>();

  for (const row of sorted) {
    const previous = activeByVisitor.get(row.anonymousId);
    const previousTime = previous ? new Date(previous.lastAt).getTime() : 0;
    const currentTime = new Date(row.createdAt).getTime();
    const sameAccount = !previous?.userId || !row.userId || previous.userId === row.userId;
    const sameIp = !previous?.ipAddress || !row.ipAddress || previous.ipAddress === row.ipAddress;
    const isContinuation = Boolean(previous) &&
      currentTime - previousTime <= SESSION_GAP_MS &&
      sameAccount &&
      sameIp;

    const session = isContinuation && previous
      ? previous
      : {
          key: `${row.anonymousId}-${row.id}`,
          rows: [],
          firstAt: row.createdAt,
          lastAt: row.createdAt,
          visitorId: row.anonymousId,
          ipAddress: row.ipAddress,
          location: row.location,
          userAgent: row.userAgent,
          userId: row.userId,
          userName: row.userName,
          userEmail: row.userEmail,
          paths: [],
        };

    session.rows.push(row);
    session.firstAt = session.rows[0]!.createdAt;
    session.lastAt = row.createdAt;
    session.ipAddress ||= row.ipAddress;
    session.location ||= row.location;
    session.userAgent ||= row.userAgent;
    session.userId ||= row.userId;
    session.userName ||= row.userName;
    session.userEmail ||= row.userEmail;
    if (row.path && !session.paths.includes(row.path)) session.paths.push(row.path);
    if (!isContinuation) sessions.push(session);
    activeByVisitor.set(row.anonymousId, session);
  }

  return sessions
    .map((session) => ({ ...session, rows: [...session.rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) }))
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
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
  const [activityTab, setActivityTab] = useState<ActivityTab>("visitors");
  const [funnelDays, setFunnelDays] = useState("30");
  const [funnelSummary, setFunnelSummary] = useState<FunnelSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = user?.isAdmin === true;

  const fetchActivity = useCallback(async () => {
    setFetching(true);
    try {
      const scope = activityTab === "admin" ? "admin" : "visitor";
      const res = await fetch(`${BASE}/api/admin/visitor-activity?scope=${scope}`, { credentials: "include" });
      if (!res.ok) {
        toast({ title: "Failed to load activity", variant: "destructive" });
        return;
      }
      const data = (await res.json()) as { activities?: ActivityRow[] };
      setRows(data.activities ?? []);
      setSelectedIds([]);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  }, [activityTab, toast]);

  const fetchFunnel = useCallback(async () => {
    try {
      const response = await fetch(`${BASE}/api/admin/funnel?days=${funnelDays}`, { credentials: "include" });
      const data = await response.json() as FunnelSummary & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load acquisition funnel");
      setFunnelSummary(data);
    } catch (error) {
      toast({ title: "Could not load acquisition funnel", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  }, [funnelDays, toast]);

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate("/");
  }, [isLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) void fetchActivity();
  }, [isAdmin, fetchActivity]);

  useEffect(() => {
    if (isAdmin && activityTab === "visitors") void fetchFunnel();
  }, [activityTab, fetchFunnel, isAdmin]);

  const deleteSelected = async () => {
    if (!selectedIds.length || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/api/admin/visitor-activity`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: data.error || "Failed to delete activity", variant: "destructive" });
        return;
      }
      setRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
      setSelectedIds([]);
      toast({ title: "Activity deleted", description: `${selectedIds.length} row${selectedIds.length === 1 ? "" : "s"} removed.` });
    } catch {
      toast({ title: "Network error while deleting activity", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

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

  const sessions = useMemo(() => groupIntoSessions(filtered), [filtered]);

  const eventOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.event))).sort(),
    [rows],
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.location || "Location unavailable"))).sort(),
    [rows],
  );
  const allLocationsSelected = locationFilters.length === 0;
  const allVisibleSelected = sessions.length > 0 && sessions.every((session) => session.rows.every((row) => selectedIds.includes(row.id)));
  const scopeLabel = activityTab === "admin" ? "Admin Activity" : "Unique Visitors";
  const scopeDescription = activityTab === "admin"
    ? "Admin routes and this PC activity are shown here separately from other visitors."
    : "Unique visitor events include captured IP addresses and resolved location details.";
  const funnelExportRows = funnelSummary
    ? [
        ...funnelSummary.stages.map((stage) => ({ type: "stage", ...stage })),
        ...Object.entries(funnelSummary.breakdowns).flatMap(([type, items]) => items.map((item) => ({ type, stage: item.label, events: "", uniqueVisitors: item.uniqueVisitors, conversionFromLanding: "" }))),
        ...Object.entries(funnelSummary.errors).map(([error, count]) => ({ type: "error", stage: error, events: count, uniqueVisitors: "", conversionFromLanding: "" })),
      ]
    : [];

  const prettyProperties = (properties: string | null) => {
    if (!properties) return "No additional event data";
    try {
      return JSON.stringify(JSON.parse(properties), null, 2);
    } catch {
      return properties;
    }
  };

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
            <h1 className="font-display text-2xl font-bold text-secondary">{scopeLabel}</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-secondary">{sessions.length} sessions</span>
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
           <Button variant="outline" size="sm" onClick={() => void deleteSelected()} disabled={!selectedIds.length || deleting || activityTab !== "admin"}>
             {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
             Delete{selectedIds.length ? ` (${selectedIds.length})` : ""}
           </Button>
        </div>
      </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2" role="tablist" aria-label="Activity type">
         {([
            ["visitors", "Unique Visitors"],
            ["admin", "Admin Activity"],
         ] as const).map(([scope, label]) => (
           <button
             key={scope}
             type="button"
             role="tab"
              aria-selected={activityTab === scope}
             onClick={() => {
                setActivityTab(scope);
               setEventFilter("all");
               setVisitorFilter("all");
               setLocationFilters([]);
             }}
             className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                activityTab === scope
                 ? "bg-primary text-primary-foreground shadow-sm"
                 : "text-muted-foreground hover:bg-muted hover:text-secondary"
             }`}
           >
             {label}
           </button>
         ))}
       </div>
        <p className="mb-4 text-sm text-muted-foreground">{scopeDescription} Select a row to view its full data.</p>

        {activityTab === "visitors" && (
          <Card className="mb-5">
            <CardContent className="p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="font-display text-lg font-bold text-secondary">Acquisition funnel</h2>
                    <p className="text-xs text-muted-foreground">Visitor conversion for the selected duration.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    Duration
                    <input
                      aria-label="Acquisition funnel duration in days"
                      type="number"
                      min="1"
                      max="180"
                      value={funnelDays}
                      onChange={(event) => setFunnelDays(event.target.value)}
                      onBlur={() => void fetchFunnel()}
                      onKeyDown={(event) => { if (event.key === "Enter") void fetchFunnel(); }}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal text-secondary"
                    />
                    <span>days</span>
                  </label>
                  <Button variant="outline" size="sm" onClick={() => void fetchFunnel()} disabled={fetching}>
                    <RefreshCw className={`mr-1.5 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadCsv(funnelExportRows, "leadonto-acquisition-funnel")} disabled={!funnelExportRows.length}>
                    <Download className="mr-1.5 h-4 w-4" />Download CSV
                  </Button>
                </div>
              </div>
              {funnelSummary ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-3"><Users className="h-4 w-4 text-primary" /><p className="mt-1 text-2xl font-extrabold text-secondary">{funnelSummary.uniqueVisitors}</p><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Unique visitors</p></div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-2xl font-extrabold text-secondary">{funnelSummary.stages.find((stage) => stage.stage === "communication_check_completed")?.uniqueVisitors ?? 0}</p><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Completed checks</p></div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-2xl font-extrabold text-secondary">{funnelSummary.stages.find((stage) => stage.stage === "account_created")?.uniqueVisitors ?? 0}</p><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Accounts created</p></div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <h3 className="mb-2 text-sm font-bold text-secondary">Stage conversion</h3>
                    <div className="space-y-2">{funnelSummary.stages.map((stage) => <div key={stage.stage} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-xs"><span className="font-semibold capitalize text-secondary">{funnelLabel(stage.stage)}</span><span className="text-muted-foreground">{stage.uniqueVisitors} visitors</span><span className="font-bold text-primary">{stage.conversionFromLanding}%</span></div>)}</div>
                  </div>
                </div>
              ) : <p className="py-4 text-sm text-muted-foreground">Loading acquisition funnel…</p>}
            </CardContent>
          </Card>
        )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by IP, route, event, visitor or user…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
       <div className="mb-4 rounded-xl border border-border bg-muted/20">
         <button type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
           <span className="text-xs font-bold uppercase tracking-wide text-secondary">Filter activity</span>
            <span className="text-xs text-muted-foreground">{sessions.length} sessions · {filtered.length} events · {filtersOpen ? "Hide" : "Show"}</span>
         </button>
         {filtersOpen && <div className="border-t border-border p-3">
         <div className="mb-2 grid gap-2 sm:grid-cols-4">
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
               <summary id="activity-location-filter" className="flex cursor-pointer list-none items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm font-normal text-secondary [&::-webkit-details-marker]:hidden">
                 <span>{allLocationsSelected ? "All locations" : `${locationFilters.length} location${locationFilters.length === 1 ? "" : "s"} selected`}</span>
                 <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
               </summary>
               <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-background p-2 shadow-xl">
                 <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-semibold text-secondary hover:bg-muted">
                   <input type="checkbox" checked={allLocationsSelected} onChange={(event) => setLocationFilters(event.target.checked ? [] : locationOptions)} className="h-4 w-4 accent-primary" />
                   All locations
                 </label>
                 <div className="my-1 border-t border-border" />
                 {locationOptions.map((location) => (
                   <label key={location} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm font-normal text-secondary hover:bg-muted">
                     <input
                       type="checkbox"
                       checked={allLocationsSelected || locationFilters.includes(location)}
                       onChange={(event) => {
                         setLocationFilters((current) => {
                           if (allLocationsSelected) return event.target.checked ? [] : locationOptions.filter((item) => item !== location);
                           const next = event.target.checked ? [...current, location] : current.filter((selected) => selected !== location);
                           return next.length === locationOptions.length ? [] : next;
                         });
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
         </div>}
      </div>

       {fetching && rows.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
       ) : sessions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No {scopeLabel.toLowerCase()} found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
           <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
             <label className="flex cursor-pointer items-center gap-2 font-semibold text-secondary">
                <input type="checkbox" checked={allVisibleSelected} onChange={(event) => setSelectedIds(event.target.checked ? sessions.flatMap((session) => session.rows.map((row) => row.id)) : [])} className="h-4 w-4 accent-primary" />
                <CheckSquare className="h-3.5 w-3.5 text-primary" />Select all sessions
             </label>
              <span className="text-muted-foreground">{selectedIds.length} events selected</span>
           </div>
            {sessions.map((session) => (
              <Card key={session.key}>
               <CardContent className="p-3">
                 <div className="flex items-start gap-3">
                    <input type="checkbox" aria-label={`Select session ${session.key}`} checked={session.rows.every((row) => selectedIds.includes(row.id))} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...new Set([...current, ...session.rows.map((row) => row.id)])] : current.filter((id) => !session.rows.some((row) => row.id === id)))} className="mt-1 h-4 w-4 accent-primary" />
                   <details className="min-w-0 flex-1 group">
                     <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                       <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">Session</span>
                          {session.userId ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><UserRound className="h-3 w-3" />{session.userName || session.userEmail || `User ${session.userId}`}</span>
                         ) : (
                           <span className="text-xs text-muted-foreground">Anonymous visitor</span>
                         )}
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{session.rows.length} events</span>
                          <span className="ml-auto text-xs font-semibold text-muted-foreground group-open:text-primary">View details⌄</span>
                       </div>
                        <div className="mt-2 grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <span><Clock3 className="mr-1 inline h-3 w-3" />{fmt(session.firstAt)} – {fmt(session.lastAt)}</span>
                          <span><Globe2 className="mr-1 inline h-3 w-3" />IP: {session.ipAddress || "Not recorded"}</span>
                          <span><MapPin className="mr-1 inline h-3 w-3" />{session.location || "Location unavailable"}</span>
                          <span className="truncate" title={session.userAgent || undefined}>Device: {session.userAgent || "User agent not recorded"}</span>
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-secondary" title={session.paths.join(", ")}>Activity: {session.paths.slice(0, 3).join(" · ")}{session.paths.length > 3 ? ` +${session.paths.length - 3} more` : ""}</p>
                     </summary>
                      <div className="mt-3 max-h-96 overflow-y-auto border-l-4 border-primary/30 pl-3 pr-2" style={{ scrollbarColor: "hsl(var(--primary)) transparent", scrollbarWidth: "thin" }}>
                        <div className="mb-3 grid gap-2 border-b border-border pb-3 text-xs text-muted-foreground sm:grid-cols-2">
                          <span className="break-all">Visitor: {session.visitorId}</span>
                          <span className="break-all">{session.userEmail || session.userName || "Anonymous visitor"}</span>
                          <span className="sm:col-span-2">Event timeline · {session.rows.length} events, oldest first</span>
                        </div>
                        <div className="space-y-3">
                          {session.rows.map((row) => (
                            <div key={row.id} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-secondary">{row.event}</span>
                                <span className="text-xs text-muted-foreground">{fmt(row.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">Page: {row.path}</p>
                              <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                <span>IP: {row.ipAddress || "Not recorded"}</span>
                                <span>Location: {row.location || "Location unavailable"}</span>
                                <span className="break-all sm:col-span-2">Event data: <pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2 font-mono">{prettyProperties(row.properties)}</pre></span>
                              </div>
                            </div>
                          ))}
                        </div>
                     </div>
                   </details>
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