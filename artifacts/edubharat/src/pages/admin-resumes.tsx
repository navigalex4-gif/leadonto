import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Download, FileText, Loader2, RefreshCw, Search,
} from "lucide-react";
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

type ResumeVersionRow = {
  id: number;
  userId: number;
  versionType: "original" | "previous" | "improved" | string;
  fileName: string | null;
  targetRole: string | null;
  experienceLevel: string | null;
  hasAnalysis: boolean;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

type ResumeVersionDetail = ResumeVersionRow & {
  resumeText: string;
  resumeAnalysis: string | null;
};

const VERSION_LABELS: Record<string, string> = {
  original: "Uploaded / pasted",
  previous: "Previous resume",
  improved: "AI-modified resume",
};

const VERSION_STYLES: Record<string, string> = {
  original: "bg-blue-100 text-blue-700",
  previous: "bg-amber-100 text-amber-700",
  improved: "bg-green-100 text-green-700",
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

export default function AdminResumes() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [versions, setVersions] = useState<ResumeVersionRow[]>([]);
  const [details, setDetails] = useState<Record<number, ResumeVersionDetail>>({});
  const [query, setQuery] = useState("");
  const [versionFilter, setVersionFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);
  const isAdmin = user?.isAdmin === true;

  const fetchVersions = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`${BASE}/api/admin/resumes`, { credentials: "include" });
      if (!res.ok) {
        toast({ title: "Failed to load resume history", variant: "destructive" });
        return;
      }
      const data = await res.json() as { versions?: ResumeVersionRow[] };
      setVersions(data.versions ?? []);
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
    if (isAdmin) void fetchVersions();
  }, [isAdmin, fetchVersions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return versions.filter((version) => {
      if (versionFilter !== "all" && version.versionType !== versionFilter) return false;
      if (!q) return true;
      return [
        version.userName, version.userEmail, version.fileName,
        version.targetRole, version.experienceLevel, version.versionType,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    });
  }, [versions, query, versionFilter]);

  const toggle = useCallback(async (id: number) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (details[id]) return;
    setLoadingDetail(id);
    try {
      const res = await fetch(`${BASE}/api/admin/resumes/${id}`, { credentials: "include" });
      if (!res.ok) {
        toast({ title: "Could not load resume details", variant: "destructive" });
        return;
      }
      const data = await res.json() as { version: ResumeVersionDetail };
      setDetails((current) => ({ ...current, [id]: data.version }));
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoadingDetail(null);
    }
  }, [details, expanded, toast]);

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <PageMeta title="Resumes · Admin · Lead Onto" description="Resume upload and modification history" />
      <AdminNav />

      <main className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-secondary">Resume History</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-secondary">{versions.length}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(filtered.map((version) => ({
              id: version.id,
              userId: version.userId,
              candidate: version.userName || version.userEmail || `User ${version.userId}`,
              email: version.userEmail,
              versionType: VERSION_LABELS[version.versionType] ?? version.versionType,
              fileName: version.fileName,
              targetRole: version.targetRole,
              experienceLevel: version.experienceLevel,
              hasAnalysis: version.hasAnalysis,
              createdAt: version.createdAt,
            })), "leadonto-resume-history")}
            disabled={!filtered.length}
          >
            <Download className="mr-1.5 h-4 w-4" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchVersions()} disabled={fetching}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Every upload preserves the previous resume. AI-modified resume versions are also recorded for review.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search candidate, email, file or role…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          aria-label="Resume version type"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-secondary"
          value={versionFilter}
          onChange={(event) => setVersionFilter(event.target.value)}
        >
          <option value="all">All versions</option>
          <option value="original">Uploaded / pasted</option>
          <option value="previous">Previous resume</option>
          <option value="improved">AI-modified resume</option>
        </select>
      </div>

      <div className="mb-3 text-xs text-muted-foreground">{filtered.length} of {versions.length} versions shown</div>

      {fetching && versions.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No resume versions found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((version) => {
            const open = expanded === version.id;
            const detail = details[version.id];
            return (
              <Card key={version.id} className="overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => void toggle(version.id)}
                >
                  {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${VERSION_STYLES[version.versionType] ?? "bg-muted text-secondary"}`}>
                        {VERSION_LABELS[version.versionType] ?? version.versionType}
                      </span>
                      <span className="font-semibold text-secondary">{version.userName || "Unnamed candidate"}</span>
                      <span className="truncate text-xs text-muted-foreground">{version.userEmail}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{version.fileName || "Resume text"}</span>
                      {version.targetRole && <span>Role: {version.targetRole}</span>}
                      <span>{fmt(version.createdAt)}</span>
                    </div>
                  </div>
                  {version.hasAnalysis && <span className="hidden rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 sm:inline">Analysis saved</span>}
                </button>
                {open && (
                  <div className="border-t border-border bg-muted/20 px-4 py-4">
                    {loadingDetail === version.id && !detail ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading resume data…</div>
                    ) : detail ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Candidate</p><p className="text-sm text-secondary">{detail.userName || detail.userEmail}</p></div>
                          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Version</p><p className="text-sm text-secondary">{VERSION_LABELS[detail.versionType] ?? detail.versionType}</p></div>
                          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saved</p><p className="text-sm text-secondary">{fmt(detail.createdAt)}</p></div>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Resume data</p>
                          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-secondary">{detail.resumeText}</pre>
                        </div>
                        {detail.resumeAnalysis && (
                          <details>
                            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-muted-foreground">Saved analysis data</summary>
                            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-secondary">{detail.resumeAnalysis}</pre>
                          </details>
                        )}
                      </div>
                    ) : null}
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