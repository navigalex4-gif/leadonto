import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { INDIAN_LANGUAGES } from "@/lib/constants";
import { useHistory } from "@/lib/use-history";
import { useProgress } from "@/lib/use-progress";
import { useGeminiStream } from "@/lib/use-gemini-stream";
import { useRozgarLive, type RozgarLiveItem } from "@/lib/use-rozgar-live";
import { useRozgarJobs } from "@/lib/use-rozgar-jobs";
import { useSpeechSynthesis } from "@/lib/use-speech-synthesis";
import { useStudentProfile, type StudentProfile } from "@/lib/use-student-profile";
import { useSavedJobs, type SavedJob } from "@/lib/use-saved-jobs";
import {
  enrichJob, filterJobs, activeFilterCount, computeMatchScore,
  type EnrichedJob, type FilterState, type SalaryBand,
  DEFAULT_FILTERS, makeJobId, SALARY_BANDS,
} from "@/lib/rozgar-utils";
import { useToast } from "@/hooks/use-toast";
import { PageMeta } from "@/components/page-meta";
import {
  Newspaper, Volume2, Bookmark, BookmarkCheck, Loader2, ChevronDown, ChevronUp,
  User, Settings, Search, ExternalLink, X, Briefcase, SlidersHorizontal, MapPin,
  Share2, EyeOff, Filter, IndianRupee, Trash2, Sparkles, Lightbulb,
  CheckCircle2, ArrowUpRight, ListChecks, Clock3,
} from "lucide-react";
import { formatGeneratedText } from "@/lib/english-tools";

// ─── Data ─────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "top_jobs", emoji: "🔥", title: "Top Jobs Today" },
  { id: "govt_jobs", emoji: "🏛️", title: "Government Jobs" },
  { id: "private_jobs", emoji: "🏢", title: "Private Jobs" },
  { id: "internships", emoji: "🎓", title: "Internships & Apprenticeships" },
  { id: "scholarships", emoji: "🏅", title: "Scholarships" },
  { id: "skill_trends", emoji: "📈", title: "Skill Trends" },
  { id: "career_growth", emoji: "🚀", title: "Career Growth" },
  { id: "ai_news", emoji: "🤖", title: "AI Updates" },
  { id: "tech_news", emoji: "💻", title: "Technology News" },
  { id: "business_news", emoji: "💼", title: "Business News" },
  { id: "govt_schemes", emoji: "📋", title: "Government Schemes" },
  { id: "salary_insights", emoji: "💰", title: "Salary Insights" },
  { id: "interview_qs", emoji: "🎯", title: "Interview Questions" },
  { id: "english_corner", emoji: "🇬🇧", title: "English Learning Corner" },
  { id: "vocab", emoji: "📖", title: "Daily Vocabulary" },
  { id: "quiz", emoji: "❓", title: "Daily Quiz" },
  { id: "jokes", emoji: "😄", title: "Daily Jokes" },
  { id: "success_stories", emoji: "⭐", title: "Success Stories" },
  { id: "motivation", emoji: "🔆", title: "Motivation Corner" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];
type FeedFilter = "all" | "jobs" | "career" | "news" | "english" | "quiz" | "inspire";

const FEED_FILTERS: Array<{ id: FeedFilter; label: string; emoji: string }> = [
  { id: "all", label: "All", emoji: "✨" },
  { id: "jobs", label: "Jobs", emoji: "💼" },
  { id: "career", label: "Career", emoji: "🚀" },
  { id: "news", label: "News", emoji: "📰" },
  { id: "english", label: "English", emoji: "🇬🇧" },
  { id: "quiz", label: "Quiz", emoji: "❓" },
  { id: "inspire", label: "Inspire", emoji: "⭐" },
];

function sectionFeedCategory(section: typeof SECTIONS[number]): FeedFilter {
  if (["top_jobs", "govt_jobs", "private_jobs", "internships"].includes(section.id)) return "jobs";
  if (section.id === "quiz") return "quiz";
  if (["english_corner", "vocab"].includes(section.id)) return "english";
  if (["jokes", "success_stories", "motivation"].includes(section.id)) return "inspire";
  if (["ai_news", "tech_news", "business_news"].includes(section.id)) return "news";
  return "career";
}

const VACANCY_SECTIONS = new Set<SectionId>([
  "top_jobs", "govt_jobs", "private_jobs", "internships", "scholarships",
]);

// Location changes the usefulness of vacancies, local schemes, market signals,
// and salary benchmarks. It should not be repeated in learning and practice
// feeds where the candidate's goal and skill level matter more.
const LOCATION_AWARE_SECTIONS = new Set<SectionId>([
  "top_jobs", "govt_jobs", "private_jobs", "internships",
  "govt_schemes", "business_news", "salary_insights",
]);

function usesLocation(sectionId: SectionId): boolean {
  return LOCATION_AWARE_SECTIONS.has(sectionId);
}

function sectionAudienceLine(section: typeof SECTIONS[number], profile: Profile): string {
  if (usesLocation(section.id)) {
    return `Built for ${profile.status.toLowerCase()} candidates in ${profile.location}`;
  }
  if (["english_corner", "vocab", "quiz"].includes(section.id)) {
    return `Practical practice for ${profile.status.toLowerCase()}s targeting ${profile.industry} roles`;
  }
  return profile.industry.trim()
    ? `Personalized for your ${profile.industry} career goals`
    : "Personalized for your career goals";
}

function liveSourceLabel(section: typeof SECTIONS[number], profile: Profile): string {
  if (usesLocation(section.id)) return `Reference items for ${profile.location}`;
  if (["english_corner", "vocab", "quiz"].includes(section.id)) return "Reference items for this learning brief";
  return "Reference items for this career brief";
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Haryana",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha",
  "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh",
  "West Bengal", "Jharkhand", "Chhattisgarh", "Uttarakhand",
];

const INDUSTRIES = [
  "Technology / IT", "Banking / Finance", "Healthcare", "Education",
  "Manufacturing", "Government / Public Sector", "Retail / E-commerce",
  "Media / Entertainment", "Agriculture", "Construction",
];

const WORK_MODES = [
  { value: "all", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const SECTORS = [
  { value: "all", label: "Any" },
  { value: "government", label: "Government" },
  { value: "private", label: "Private" },
  { value: "startup", label: "Startup" },
];

const EXPERIENCES = [
  { value: "all", label: "Any" },
  { value: "fresher", label: "Fresher" },
  { value: "junior", label: "Junior (1-3 yrs)" },
  { value: "mid", label: "Mid (3-6 yrs)" },
  { value: "senior", label: "Senior (6+ yrs)" },
];

const EMPLOYMENT_TYPES = [
  { value: "all", label: "Any" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "salary", label: "Salary (high to low)" },
  { value: "match", label: "Match Score" },
];

// ─── Profile type ─────────────────────────────────────────────────────────────

type Profile = {
  name: string;
  age: string;
  education: string;
  status: string;
  skills: string;
  salaryExpectation: string;
  careerGoal: string;
  language: string;
  location: string;
  industry: string;
};

const DEFAULT_PROFILE: Profile = {
  name: "",
  age: "22",
  education: "Graduate",
  status: "Fresher",
  skills: "",
  salaryExpectation: "",
  careerGoal: "Private Job",
  language: "English",
  location: "Maharashtra",
  industry: "",
};

function feedProfileContext(section: typeof SECTIONS[number], profile: Profile): string {
  const fields: string[] = [];
  const add = (label: string, value: string) => {
    if (value.trim()) fields.push(`${label}: ${value}`);
  };

  add("Status", profile.status);
  add("Education", profile.education);
  add("Goal", profile.careerGoal);
  add("Industry", profile.industry);
  add("Skills", profile.skills);
  if (usesLocation(section.id)) add("Location", profile.location);
  if (VACANCY_SECTIONS.has(section.id) || section.id === "salary_insights") {
    add("Salary expectation", profile.salaryExpectation);
  }
  return fields.join(" | ");
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-blue-100 text-blue-700 border-blue-200";
  if (score >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// ─── Job card component ────────────────────────────────────────────────────────

function JobCard({
  item,
  onSave,
  onUnsave,
  onShare,
  onHide,
  saved,
  matchScore,
}: {
  item: EnrichedJob;
  onSave: (item: RozgarLiveItem) => void;
  onUnsave: (jobId: string) => void;
  onShare: (item: EnrichedJob) => void;
  onHide: (jobId: string) => void;
  saved: boolean;
  matchScore?: number;
}) {
  return (
    <div className="block rounded-xl border bg-card hover:border-primary/30 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {matchScore !== undefined && (
                <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${scoreColor(matchScore)}`}>
                  {matchScore}% Match
                </Badge>
              )}
              {item.workMode !== "unknown" && (
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {item.workMode === "remote" ? "Remote" : item.workMode === "hybrid" ? "Hybrid" : "On-site"}
                </Badge>
              )}
              {item.sector !== "unknown" && (
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {item.sector === "government" ? "Govt" : item.sector === "startup" ? "Startup" : "Private"}
                </Badge>
              )}
            </div>
            <p className="font-semibold text-secondary line-clamp-2 text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {item.company ? `${item.company} • ` : ""}
              {item.location ? `${item.location} • ` : ""}
              {item.source}
              {item.publishedAt ? ` • ${new Date(item.publishedAt).toLocaleDateString("en-IN")}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {item.jobType && <span className="rounded-full bg-muted px-2 py-0.5 border">{item.jobType}</span>}
          {item.salary && <span className="rounded-full bg-green-50 text-green-700 px-2 py-0.5 border">{item.salary}</span>}
          {item.experience !== "unknown" && (
            <span className="rounded-full bg-muted px-2 py-0.5 border capitalize">{item.experience}</span>
          )}
          {item.employmentType !== "unknown" && (
            <span className="rounded-full bg-muted px-2 py-0.5 border capitalize">{item.employmentType}</span>
          )}
          {item.requiredSkills.slice(0, 3).map(skill => (
            <span key={skill} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 border">{skill}</span>
          ))}
        </div>
        {item.summary && <p className="mt-3 text-xs text-secondary line-clamp-2">{item.summary}</p>}
      </div>
      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <a href={item.link} target="_blank" rel="noreferrer" className="flex-1">
          <Button variant="default" size="sm" className="w-full text-xs font-semibold h-9 rounded-lg">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Apply / View
          </Button>
        </a>
        <Button
          variant={saved ? "secondary" : "outline"}
          size="sm"
          className={`min-h-11 min-w-11 p-0 rounded-lg shrink-0 ${saved ? "text-primary" : ""}`}
          onClick={e => {
            e.preventDefault();
            if (saved) onUnsave(item.jobId);
            else onSave(item);
          }}
          title={saved ? "Unsave job" : "Save job"}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 min-w-11 p-0 rounded-lg shrink-0"
          onClick={e => {
            e.preventDefault();
            onShare(item);
          }}
          title="Share job"
        >
          <Share2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 min-w-11 p-0 rounded-lg shrink-0"
          onClick={e => {
            e.preventDefault();
            onHide(item.jobId);
          }}
          title="Hide job"
        >
          <EyeOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function CareerNewsCard({ item }: { item: RozgarLiveItem }) {
  return (
    <article className="rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="rounded-full text-[10px] text-blue-700 border-blue-200 bg-blue-50">Career news</Badge>
        <span className="text-[11px] text-muted-foreground truncate">{item.source}</span>
      </div>
      <h3 className="font-semibold text-secondary text-sm leading-snug">{formatGeneratedText(item.title)}</h3>
      {item.summary && <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">{formatGeneratedText(item.summary)}</p>}
      <div className="flex items-center justify-between gap-2 mt-3">
        {item.publishedAt && <span className="text-[11px] text-muted-foreground">{new Date(item.publishedAt).toLocaleDateString("en-IN")}</span>}
        <a href={item.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline ml-auto">
          Read source <ExternalLink className="inline w-3 h-3 ml-1" />
        </a>
      </div>
    </article>
  );
}

function parseFeedText(raw: string) {
  const clean = formatGeneratedText(raw);
  const lines = clean
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  const headingPattern = /^(?:WHY IT MATTERS|WHAT MATTERS|YOUR NEXT MOVE|NEXT MOVE|KEY TAKEAWAYS?|THIS WEEK|TRY THIS|PRACTICE|PRACTICE IT|SOURCE SIGNALS?|PLAIN-LANGUAGE EXPLANATION|EXPLAIN IT|IN SIMPLE WORDS|REAL-WORLD EXAMPLE|EXAMPLE|COMMON MISTAKE|WATCH OUT)\s*:?\s*/i;
  const headings = lines.filter(line => headingPattern.test(line));
  const withoutHeadings = lines.filter(line => !headingPattern.test(line));
  const bullets = withoutHeadings.filter(line => /^(?:•|\d+[.)])\s+/.test(line));
  const paragraphs = withoutHeadings.filter(line => !/^(?:•|\d+[.)])\s+/.test(line));
  const sectionText = (names: string[]) => {
    const start = lines.findIndex(line => names.some(name => new RegExp(`^${name}\\s*:?\\s*$`, "i").test(line)));
    if (start < 0) return [];
    const end = lines.findIndex((line, index) => index > start && headingPattern.test(line));
    return lines
      .slice(start + 1, end < 0 ? lines.length : end)
      .filter(Boolean)
      .map(line => line.replace(/^(?:•|\d+[.)])\s+/, ""))
      .slice(0, 6);
  };
  return {
    paragraphs: paragraphs.slice(0, 5),
    bullets: bullets.map(line => line.replace(/^(?:•|\d+[.)])\s+/, "")).slice(0, 8),
    why: sectionText(["WHY IT MATTERS", "WHAT MATTERS"]),
    next: sectionText(["YOUR NEXT MOVE", "NEXT MOVE"]),
    takeaways: sectionText(["KEY TAKEAWAYS?", "KEY TAKEAWAY"]),
    week: sectionText(["THIS WEEK", "TRY THIS", "PRACTICE"]),
    explanation: sectionText(["PLAIN-LANGUAGE EXPLANATION", "EXPLAIN IT", "IN SIMPLE WORDS"]),
    example: sectionText(["REAL-WORLD EXAMPLE", "EXAMPLE"]),
    mistake: sectionText(["COMMON MISTAKE", "WATCH OUT"]),
    practice: sectionText(["PRACTICE IT", "PRACTICE TASK"]),
    hasHeadings: headings.length > 0,
  };
}

function StructuredFeedOutput({
  section,
  text,
  isStreaming,
  profile,
}: {
  section: typeof SECTIONS[number];
  text: string;
  isStreaming: boolean;
  profile: Profile;
}) {
  const parsed = parseFeedText(text);
  const lead = parsed.why[0] || parsed.paragraphs[0] || `A focused ${section.title.toLowerCase()} brief for your ${profile.careerGoal.toLowerCase()} goal.`;
  const nextMove = parsed.next[0] || parsed.week[0] || parsed.bullets[0] || parsed.paragraphs[1] || "Review the source cards and choose one small action to complete today.";
  const takeaways = parsed.takeaways.length > 0 ? parsed.takeaways : parsed.bullets.slice(0, 6);
  const weekPlan = parsed.week.length > 0 ? parsed.week : parsed.bullets.slice(0, 3);
  const explanation = parsed.explanation[0] || parsed.paragraphs[1];
  const example = parsed.example[0];
  const mistake = parsed.mistake[0];
  const practice = parsed.practice[0];

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 px-5 py-5 text-white">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
              <Sparkles className="h-3.5 w-3.5" />
              Personalized career brief
            </div>
            <h3 className="font-display text-xl font-bold leading-tight">{section.title}</h3>
            <p className="mt-1 text-xs text-white/80">{sectionAudienceLine(section, profile)}</p>
          </div>
          {isStreaming && <Loader2 className="mt-1 h-5 w-5 animate-spin text-white" />}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <Lightbulb className="h-4 w-4" />
              What matters
            </div>
            <p className="text-sm leading-relaxed text-secondary">{lead}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              <ArrowUpRight className="h-4 w-4" />
              Your next move
            </div>
            <p className="text-sm leading-relaxed text-secondary">{nextMove}</p>
          </div>
        </div>

        {takeaways.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="h-4 w-4 text-primary" />
              Key takeaways
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {takeaways.slice(0, 6).map((bullet, index) => (
                <div key={`${bullet}-${index}`} className="flex gap-2 rounded-xl border bg-slate-50/80 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <p className="text-xs leading-relaxed text-secondary">{bullet}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(explanation || example || mistake || practice) && (
          <div className="grid gap-3 md:grid-cols-2">
            {explanation && (
              <div className="rounded-xl border bg-background p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">In simple words</p>
                <p className="text-sm leading-relaxed text-secondary">{explanation}</p>
              </div>
            )}
            {example && (
              <div className="rounded-xl border bg-background p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">Real-world example</p>
                <p className="text-sm leading-relaxed text-secondary">{example}</p>
              </div>
            )}
            {mistake && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Common mistake</p>
                <p className="text-sm leading-relaxed text-secondary">{mistake}</p>
              </div>
            )}
            {practice && (
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">Try it now</p>
                <p className="text-sm leading-relaxed text-secondary">{practice}</p>
              </div>
            )}
          </div>
        )}

        {weekPlan.length > 0 && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <Clock3 className="h-4 w-4" />
              7-day action plan
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {weekPlan.slice(0, 3).map((step, index) => (
                <div key={`${step}-${index}`} className="rounded-xl border border-indigo-100 bg-white/80 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">Step {index + 1}</p>
                  <p className="text-xs leading-relaxed text-secondary">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed.paragraphs.slice(1, 4).length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {parsed.paragraphs.slice(1, 4).map((paragraph, index) => (
              <div key={`${paragraph}-${index}`} className="rounded-xl border bg-background p-3">
                <p className="text-xs leading-relaxed text-secondary">{paragraph}</p>
              </div>
            ))}
          </div>
        )}

        {isStreaming && !text && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
            <Clock3 className="h-4 w-4 animate-pulse text-primary" />
            Preparing your live brief…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  id,
  section,
  profile,
  studentProfile,
  synth,
  onSaveJob,
  onUnsaveJob,
  onShare,
  onHide,
  isJobSaved,
  hiddenJobIds,
}: {
  id?: string;
  section: typeof SECTIONS[number];
  profile: Profile;
  studentProfile: StudentProfile;
  synth: ReturnType<typeof useSpeechSynthesis>;
  onSaveJob: (item: RozgarLiveItem) => void;
  onUnsaveJob: (jobId: string) => void;
  onShare: (job: EnrichedJob) => void;
  onHide: (jobId: string) => void;
  isJobSaved: (jobId: string) => boolean;
  hiddenJobIds: Set<string>;
}) {
  const { save } = useHistory();
  const { track } = useProgress();
  const { text, isStreaming, stream } = useGeminiStream();
  const { data: liveData, isLoading: liveLoading, error: liveError, load: loadLive } = useRozgarLive();
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (loaded && !isStreaming) {
      setExpanded(e => !e);
      return;
    }
    setExpanded(true);
    setLoaded(true);
    track("Rozgar Samachar", section.id);

    const profileCtx = feedProfileContext(section, profile);

    const prompts: Record<SectionId, string> = {
      top_jobs: `Explain only the real job cards supplied below for this candidate. Compare the best 2-3 matches by role, location, skills, and entry fit; do not create vacancies.`,
      govt_jobs: `Explain only the supplied government recruitment items. Highlight eligibility clues, location, deadline/application facts only when present, and what to verify on the official source.`,
      private_jobs: `Explain only the supplied private-sector job cards. Rank the best matches for the candidate's skills and goal; never invent employer, salary, deadline, or role details.`,
      internships: `Explain only the supplied internship/apprenticeship items. Identify who each suits, what skill it builds, and what the candidate should verify before applying.`,
      scholarships: `Explain only the supplied scholarship/fellowship items. Highlight likely fit, study/career relevance, and verification steps; never invent amounts or deadlines.`,
      skill_trends: `Turn the supplied live hiring signals into 3 specific skills for this candidate's target roles. For each, connect the signal to the candidate, give a free practice task, and a portfolio proof idea.`,
      career_growth: `Create a realistic 3-step growth plan using the supplied signals. Prioritize the candidate's current skills, target goal, and next reachable role; label general advice clearly.`,
      ai_news: `Use the supplied AI items to explain what changes for this candidate's target work. Include one tool or workflow to try safely and one portfolio/interview proof.`,
      tech_news: `Use the supplied technology items to explain what changes for this candidate's target roles. Focus on practical skills, not broad headlines, and give one small project idea.`,
      business_news: `Use the supplied business and hiring items to explain the local and industry signal for this candidate. Connect it to roles, skills, and a practical action this week.`,
      govt_schemes: `Explain up to 3 supplied government schemes or training programs that fit this candidate. State who may qualify and what to verify on the official site; do not invent benefits.`,
      salary_insights: `Use supplied salary signals where present; otherwise clearly label general guidance. Explain realistic research and negotiation steps for this candidate's experience, location, and target role.`,
      interview_qs: `Create 5 role-relevant interview questions for this candidate's target role and skills. Give a short answer framework and one practice task for each.`,
      english_corner: `Teach a useful workplace-English lesson, not a generic news summary. Start with a relatable situation for this candidate's target role, explain one correction in simple language, teach 5 useful phrases with when to use each, write a short mini-dialogue, and finish with a practice task.`,
      vocab: `Teach 5 job-market words relevant to this candidate's industry and skills. For every word give pronunciation help, a simple meaning, a role-specific example, a common misuse, and a quick recall exercise.`,
      quiz: `Create a 5-question interactive quiz about this candidate's target role and skills. Include the answer, a brief explanation of why it is correct, and a score-based next step.`,
      jokes: `Create 3 clean, relatable workplace jokes for an Indian job seeker in this industry, then add one useful career lesson from the theme.`,
      success_stories: `Share a realistic, clearly labelled illustrative success story matching this candidate's stage, goal, and industry. Extract 3 repeatable actions; do not present invented facts as news.`,
      motivation: `Write an encouraging but practical message for this candidate. Tie it to their goal and current stage, then give a concrete 7-day challenge rather than generic inspiration.`,
    };

    const live = await loadLive(section.id, {
      ...(usesLocation(section.id) ? { location: profile.location } : {}),
      industry: profile.industry,
      status: profile.status,
      goal: profile.careerGoal,
      skills: profile.skills,
    });
    if (VACANCY_SECTIONS.has(section.id) && (live?.items?.length ?? 0) > 0) {
      setLoaded(true);
      return;
    }

    const liveContext = live?.items?.length
      ? [
          `Live sources fetched at ${new Date(live.fetchedAt).toLocaleString("en-IN")}. Candidate context: ${profileCtx}.`,
          ...live.items.slice(0, 5).map((item, index) => {
            const published = item.publishedAt ? ` | ${new Date(item.publishedAt).toLocaleDateString("en-IN")}` : "";
            return `${index + 1}. ${item.title} — ${item.source}${published}\nSummary: ${item.summary || "No summary supplied."}\nLocation/company: ${item.location || item.company || "Not stated"}\nLink: ${item.link}`;
          }),
        ].join("\n")
      : "No live items were available. Say that fresh source items are unavailable and provide clearly labelled general guidance only.";

    const prompt = `${prompts[section.id]}\n\nGround every current fact in these live items:\n${liveContext}\n\nReturn plain text in exactly this structure:\nWHY IT MATTERS:\nExplain why this is useful for the candidate in 2-3 natural sentences. Do not mention location unless it is included in the candidate context for this section.\nPLAIN-LANGUAGE EXPLANATION:\nExplain the idea as if a helpful mentor is sitting beside the candidate. Define unfamiliar terms instead of assuming prior knowledge.\nKEY TAKEAWAYS:\n1. A source-backed fact or clearly labelled general insight.\n2. A practical implication for the candidate.\n3. One detail worth remembering.\nREAL-WORLD EXAMPLE:\nShow how the candidate could use this in a real job, interview, workplace conversation, or learning situation.\nCOMMON MISTAKE:\nName one realistic mistake beginners make and how to avoid it.\nYOUR NEXT MOVE:\nGive one concrete action the candidate can complete today.\nPRACTICE IT:\nGive a small exercise, sentence, mini-task, or portfolio action with enough detail to actually do it.\nTHIS WEEK:\n1. Day 1-2 action.\n2. Day 3-5 action.\n3. Day 6-7 proof/check-in.\nKeep the tone warm and human, vary the advice by section, explain rather than merely label, and never pad the answer with generic filler.`;
    await stream(
      prompt,
      `You are EduBharat's warm, observant career mentor writing "${section.title}" for one Indian candidate. Today's date: ${new Date().toLocaleDateString("en-IN")}. Sound like a thoughtful human who understands a learner's confidence level, not like a search engine. Never invent a current job, employer, date, salary, vacancy, scheme, or news fact. Distinguish source-backed facts from general advice. Avoid repeating the same advice across sections. Mention location only when it changes the usefulness of the section; for English, vocabulary, quizzes, skills, interviews, AI, and technology, focus on the candidate's target role, level, and skills without naming their city.`,
      undefined,
      { endpoint: "/api/ai/stream", maxTokens: 2200 },
    );
  }, [loadLive, loaded, isStreaming, profile, section, stream, track]);

  const visibleLiveItems = (liveData?.items ?? []).filter(item =>
    !hiddenJobIds.has(makeJobId(item.link)) &&
    (!VACANCY_SECTIONS.has(section.id) || item.kind === "vacancy"),
  );

  return (
    <div className={`space-y-2 ${expanded ? "col-span-full" : ""}`}>
      <button
        className={`group w-full flex min-h-[58px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-sm transition-all ${
          expanded
            ? "border-primary/50 bg-primary/10 text-primary shadow-md"
            : "border-border/80 bg-white hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        }`}
        onClick={load}
        data-testid={`section-${section.id}`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${expanded ? "bg-white" : "bg-primary/10"}`}>
          {section.emoji}
        </span>
        <span className={`font-semibold text-xs leading-tight line-clamp-2 ${expanded ? "text-primary" : "text-secondary group-hover:text-primary"}`}>
          {section.title}
        </span>
        {isStreaming
          ? <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
          : <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
      </button>
      {expanded && (text || isStreaming || liveLoading || visibleLiveItems.length > 0 || Boolean(liveError)) && (
        <Card id={id} className="scroll-mt-24 overflow-hidden rounded-2xl border bg-muted/20 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            {(liveLoading || visibleLiveItems.length > 0 || liveError) && (
              <div className="rounded-2xl border bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live sources</p>
                    <p className="mt-0.5 text-xs text-secondary">{liveSourceLabel(section, profile)}</p>
                  </div>
                  {liveLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
                {liveError && <p className="mb-3 text-xs text-muted-foreground">{liveError}</p>}
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleLiveItems.slice(0, 4).map(item => {
                    const enriched = enrichJob(item);
                    return VACANCY_SECTIONS.has(section.id) ? (
                      <JobCard
                        key={`${item.title}-${item.link}`}
                        item={enriched}
                        onSave={onSaveJob}
                        onUnsave={onUnsaveJob}
                        onShare={onShare}
                        onHide={onHide}
                        saved={isJobSaved(makeJobId(item.link))}
                        matchScore={computeMatchScore(enriched, studentProfile)}
                      />
                    ) : <CareerNewsCard key={`${item.title}-${item.link}`} item={item} />;
                  })}
                </div>
              </div>
            )}

            {(text || isStreaming) && (
              <StructuredFeedOutput section={section} text={text} isStreaming={isStreaming} profile={profile} />
            )}

            {(text || isStreaming || !VACANCY_SECTIONS.has(section.id)) && (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" className="text-xs" disabled={isStreaming || !text}
                  onClick={() => { synth.stop(); synth.speak(formatGeneratedText(text), profile.language); }}>
                  <Volume2 className="mr-1 h-3.5 w-3.5" />{isStreaming ? "Loading…" : "Listen"}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" disabled={saved || !text}
                  onClick={() => { save({ tool: "Rozgar Samachar", title: `${section.title} — ${new Date().toLocaleDateString("en-IN")}`, content: text }); setSaved(true); }}>
                  {saved
                    ? <><BookmarkCheck className="mr-1 h-3.5 w-3.5 text-primary" />Saved</>
                    : <><Bookmark className="mr-1 h-3.5 w-3.5" />Save</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Saved job card ───────────────────────────────────────────────────────────

function SavedJobCard({ job, onUnsave }: { job: SavedJob; onUnsave: (id: string) => void }) {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-secondary text-sm line-clamp-2">{job.title}</p>
          {job.company && <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>}
        </div>
        <button
          onClick={() => onUnsave(job.jobId)}
          className="shrink-0 p-2 min-h-11 min-w-11 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        {job.location && <span className="rounded-full bg-muted px-2 py-0.5">{job.location}</span>}
        {job.salary && <span className="rounded-full bg-green-50 text-green-700 px-2 py-0.5">{job.salary}</span>}
        {job.jobType && <span className="rounded-full bg-muted px-2 py-0.5">{job.jobType}</span>}
        {job.source && <span className="rounded-full bg-muted px-2 py-0.5">{job.source}</span>}
      </div>
      <div className="text-[10px] text-muted-foreground">
        Saved {new Date(job.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </div>
      <a href={job.link} target="_blank" rel="noreferrer" className="block">
        <Button size="sm" className="w-full text-xs font-semibold h-8 rounded-lg">
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Apply Now
        </Button>
      </a>
    </div>
  );
}

// ─── Filter panel content ──────────────────────────────────────────────────────

function FilterPanelInner({
  filters,
  onChange,
  onClear,
  hasSalaryData,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  hasSalaryData: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-secondary flex items-center gap-2"><Filter className="w-4 h-4" />Filters</h3>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClear}>Clear all</Button>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-bold text-muted-foreground">City / State</span>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="e.g. Bangalore, Delhi"
            value={filters.city}
            onChange={e => onChange({ city: e.target.value })}
            className="pl-9 h-10 text-sm rounded-xl"
          />
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold text-muted-foreground">Work Mode</span>
        <Select value={filters.workMode} onValueChange={v => onChange({ workMode: v as FilterState["workMode"] })}>
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{WORK_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold text-muted-foreground">Sector</span>
        <Select value={filters.sector} onValueChange={v => onChange({ sector: v as FilterState["sector"] })}>
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{SECTORS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold text-muted-foreground">Experience</span>
        <Select value={filters.experience} onValueChange={v => onChange({ experience: v as FilterState["experience"] })}>
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{EXPERIENCES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
        </Select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold text-muted-foreground">Employment Type</span>
        <Select value={filters.employmentType} onValueChange={v => onChange({ employmentType: v as FilterState["employmentType"] })}>
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </label>

      <div className="block space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${hasSalaryData ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
            Salary Range
          </span>
          {!hasSalaryData && (
            <span className="text-[10px] text-muted-foreground/50 italic">No salary data in results</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SALARY_BANDS.map(band => {
            const isActive = (filters.salaryBand ?? "any") === band.value;
            const disabled = !hasSalaryData && band.value !== "any";
            return (
              <button
                key={band.value}
                onClick={() => !disabled && onChange({ salaryBand: band.value as SalaryBand })}
                disabled={disabled}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : disabled
                    ? "bg-muted/40 text-muted-foreground/40 border-border/40 cursor-not-allowed"
                    : "bg-background text-foreground border-border hover:bg-muted",
                ].join(" ")}
              >
                {band.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FilterPanel(props: { filters: FilterState; onChange: (patch: Partial<FilterState>) => void; onClear: () => void; hasSalaryData: boolean }) {
  return <FilterPanelInner {...props} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RozgarSamachar() {
  return (
    <>
      <PageMeta
        title="Rozgar Samachar"
        description="Your daily career newspaper with live jobs, government updates, salary insights, and English learning tips for Indian professionals."
      />
      <RozgarSamacharContent />
    </>
  );
}

function RozgarSamacharContent() {
  const synth = useSpeechSynthesis();
  const { toast } = useToast();
  const { profile: studentProfile, updateProfile: updateStudentProfile } = useStudentProfile();
  const { saveJob, unsaveJob, isJobSaved, savedJobs, count: savedCount } = useSavedJobs();

  const derivedDefault = useMemo<Profile>(() => ({
    name: studentProfile.name || DEFAULT_PROFILE.name,
    age: DEFAULT_PROFILE.age,
    education: studentProfile.degree || DEFAULT_PROFILE.education,
    status: studentProfile.experienceLevel || DEFAULT_PROFILE.status,
    skills: Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0
      ? studentProfile.skills.join(", ")
      : "",
    salaryExpectation: studentProfile.expectedSalary || "",
    careerGoal: studentProfile.careerGoal || DEFAULT_PROFILE.careerGoal,
    language: studentProfile.preferredLanguage || DEFAULT_PROFILE.language,
    location: studentProfile.preferredCity || studentProfile.location || DEFAULT_PROFILE.location,
    industry: studentProfile.industryPreference || DEFAULT_PROFILE.industry,
  }), [studentProfile]);

  const [profile, setProfile] = useState<Profile>(derivedDefault);
  const [showProfile, setShowProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Profile gate — shown on first visit if both name AND location are not set
  const [gateComplete, setGateComplete] = useState(() => {
    try { return !!localStorage.getItem("rozgar_gate_done"); } catch { return false; }
  });
  const [gateName, setGateName] = useState("");
  const [gateCity, setGateCity] = useState("");
  const [gateGoal, setGateGoal] = useState("Private Job");
  const [gateExp, setGateExp] = useState("Fresher");
  // Gate shows whenever real profile is incomplete — ignore localStorage flag
  const hasValidProfile = !!(
    profile.name && profile.name.trim().length > 1 && profile.name !== "Anonymous" &&
    profile.location && profile.location.trim().length > 1
  );
  const needsGate = !hasValidProfile;
  const [activeTab, setActiveTab] = useState<"jobs" | "feed" | "saved">("jobs");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromUrl());
  const [searchInput, setSearchInput] = useState(filters.keyword);
  const [filterOpen, setFilterOpen] = useState(false);

  const hasFilters = !!(
    hasValidProfile ||
    filters.keyword.trim() ||
    filters.city.trim() ||
    filters.workMode !== "all" ||
    filters.sector !== "all" ||
    filters.experience !== "all" ||
    filters.employmentType !== "all" ||
    (filters.salaryBand && filters.salaryBand !== "any")
  );

  const { data: allJobs, isLoading: jobsLoading, error: jobsError, reload, source: jobsSource } = useRozgarJobs(
    studentProfile,
    { keyword: filters.keyword, city: filters.city, experience: filters.experience, sector: filters.sector },
    hasValidProfile,
  );
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  useEffect(() => {
    setProfile(p => ({
      name: studentProfile.name || p.name,
      age: p.age,
      education: studentProfile.degree || p.education,
      status: studentProfile.experienceLevel || p.status,
      skills: Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0
        ? studentProfile.skills.join(", ")
        : "",
      salaryExpectation: studentProfile.expectedSalary || "",
      careerGoal: studentProfile.careerGoal || p.careerGoal,
      language: studentProfile.preferredLanguage || p.language,
      location: studentProfile.preferredCity || studentProfile.location || p.location,
      industry: studentProfile.industryPreference || p.industry,
    }));
  }, [studentProfile]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set("q", filters.keyword);
    if (filters.city) params.set("city", filters.city);
    if (filters.workMode !== "all") params.set("workMode", filters.workMode);
    if (filters.sector !== "all") params.set("sector", filters.sector);
    if (filters.experience !== "all") params.set("experience", filters.experience);
    if (filters.employmentType !== "all") params.set("type", filters.employmentType);
    if ((filters.salaryBand ?? "any") !== "any") params.set("salaryBand", filters.salaryBand);
    if (filters.sort !== "relevance") params.set("sort", filters.sort);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  // Debounce keyword input into filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => f.keyword === searchInput ? f : { ...f, keyword: searchInput });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const enrichedJobs = useMemo(() => allJobs.map(enrichJob), [allJobs]);
  const filteredJobs = useMemo(() => filterJobs(enrichedJobs, filters, studentProfile).filter(j => !hiddenJobIds.has(j.jobId)), [enrichedJobs, filters, studentProfile, hiddenJobIds]);

  // Source breakdown for the "X verified listings · Y from Adzuna · Z from news" summary
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allJobs) {
      const src = item.source || "Other";
      counts[src] = (counts[src] ?? 0) + 1;
    }
    return counts;
  }, [allJobs]);

  const visibleFeedSections = useMemo(
    () => SECTIONS.filter(section => feedFilter === "all" || sectionFeedCategory(section) === feedFilter),
    [feedFilter],
  );

  const update = (key: keyof Profile) => (val: string) => setProfile(p => ({ ...p, [key]: val }));

  const handleSaveJob = useCallback((item: RozgarLiveItem) => {
    const jobId = makeJobId(item.link);
    void saveJob({ jobId, title: item.title, company: item.company, link: item.link, location: item.location, salary: item.salary, jobType: item.jobType, source: item.source });
  }, [saveJob]);

  const handleUnsaveJob = useCallback((jobId: string) => {
    void unsaveJob(jobId);
  }, [unsaveJob]);

  const handleShare = useCallback((job: EnrichedJob) => {
    const url = job.link;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!", description: "You can share this job with friends." });
    }).catch(() => {
      toast({ title: "Could not copy", description: "Please copy the link manually.", variant: "destructive" });
    });
  }, [toast]);

  const handleHide = useCallback((jobId: string) => {
    setHiddenJobIds(prev => new Set([...prev, jobId]));
    toast({ title: "Hidden", description: "This job will not appear in your current session." });
  }, [toast]);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
    setActiveTab("jobs");
  }, []);

  const updateFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters(f => ({ ...f, ...patch }));
    setActiveTab("jobs");
  }, []);

  const handleSaveProfile = useCallback(async () => {
    const skills = profile.skills
      .split(",")
      .map(skill => skill.trim())
      .filter(Boolean);
    await updateStudentProfile({
      name: profile.name.trim(),
      degree: profile.education,
      experienceLevel: profile.status,
      skills,
      expectedSalary: profile.salaryExpectation,
      careerGoal: profile.careerGoal,
      preferredLanguage: profile.language,
      preferredCity: profile.location,
      location: profile.location,
      industryPreference: profile.industry,
    });
    setProfileSaved(true);
    setShowProfile(false);
    void reload();
  }, [profile, reload, updateStudentProfile]);

  const activeCount = activeFilterCount(filters);

  // True when at least one job in the current result set has salary data — used to enable/grey the salary filter
  const hasSalaryData = useMemo(() => enrichedJobs.some(j => j.salaryMin > 0 || j.salaryMax > 0), [enrichedJobs]);

  // Filter panel for desktop sidebar
  const filterSidebar = (
    <div className="hidden lg:block">
      <Card className="rounded-2xl border shadow-sm sticky top-20">
        <CardContent className="p-5">
          <FilterPanel filters={filters} onChange={updateFilters} onClear={clearFilters} hasSalaryData={hasSalaryData} />
        </CardContent>
      </Card>
    </div>
  );

  // Mobile filter sheet
  const filterSheet = (
    <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden rounded-full font-semibold">
          <SlidersHorizontal className="w-4 h-4 mr-1.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Filter jobs</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <FilterPanel filters={filters} onChange={updateFilters} onClear={clearFilters} hasSalaryData={hasSalaryData} />
        </div>
        <SheetClose asChild>
          <Button className="w-full mt-2">Show {filteredJobs.length} jobs</Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );

  // ── Profile gate ─────────────────────────────────────────────────────────────
  if (needsGate) {
    const handleGateSubmit = () => {
      if (!gateName.trim() || !gateCity) return;
      // Persist to local component state
      setProfile(p => ({ ...p, name: gateName.trim(), location: gateCity, careerGoal: gateGoal, status: gateExp }));
      // Persist to durable student profile store (survives page refresh)
      void updateStudentProfile({
        name: gateName.trim(),
        preferredCity: gateCity,
        location: gateCity,
        careerGoal: gateGoal,
        experienceLevel: gateExp,
      });
      setProfileSaved(true);
      setGateComplete(true);
      try { localStorage.setItem("rozgar_gate_done", "1"); } catch { /* ignore */ }
      void reload();
    };
    return (
      <div className="rozgar-theme min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Newspaper className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-display font-extrabold text-secondary mb-2">Welcome to Rozgar Samachar</h1>
            <p className="text-muted-foreground text-sm">Tell us a bit about yourself so we can show you <strong>personalised</strong> jobs and opportunities across India.</p>
          </div>
          <Card className="border-teal-100 shadow-md rounded-2xl">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="gate-name" className="text-xs font-bold text-secondary">Your Name <span className="text-red-500">*</span></label>
                <Input id="gate-name" value={gateName} onChange={e => setGateName(e.target.value)} placeholder="e.g. Rahul Sharma" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="gate-city" className="text-xs font-bold text-secondary">State / City <span className="text-red-500">*</span></label>
                <Select value={gateCity} onValueChange={setGateCity}>
                  <SelectTrigger id="gate-city" className="h-11 rounded-xl"><SelectValue placeholder="Select your state or city" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="gate-goal" className="text-xs font-bold text-secondary">Career Goal</label>
                <Select value={gateGoal} onValueChange={setGateGoal}>
                  <SelectTrigger id="gate-goal" className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Government Job", "Private Job", "IT / Tech", "Startup", "Business", "Higher Education", "Foreign Opportunity"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="gate-exp" className="text-xs font-bold text-secondary">Experience Level</label>
                <Select value={gateExp} onValueChange={setGateExp}>
                  <SelectTrigger id="gate-exp" className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Student", "Fresher", "Working Professional (1-3 yrs)", "Working Professional (3-6 yrs)", "Senior Professional (6+ yrs)"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button
                className="w-full h-11 font-bold rounded-xl mt-2"
                disabled={!gateName.trim() || !gateCity}
                onClick={handleGateSubmit}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Show My Personalised Jobs →
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">Your data stays on your device. We use it only to personalise your feed.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="rozgar-theme min-h-full overflow-y-auto container mx-auto px-4 py-4 max-w-[1400px] bg-gradient-to-br from-teal-50/50 via-white to-indigo-50/50">
      <div className="flex min-h-full flex-col gap-4">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center shadow-sm">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-extrabold text-secondary">Rozgar Samachar</h1>
              <p className="text-xs text-muted-foreground font-medium">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasValidProfile && <Badge variant="outline" className="text-xs rounded-full px-3 py-1">Profile ready</Badge>}
            <Button variant="ghost" size="sm" className="h-8 text-xs px-3 rounded-full" onClick={() => setShowProfile(!showProfile)}>
              <Settings className="w-3 h-3 mr-1" />Profile
            </Button>
          </div>
        </div>

        {/* ── Reference-style compact filter row ── */}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto border-b bg-white/95 px-4 py-2">
          <span className="max-w-[96px] shrink-0 truncate text-xs font-semibold text-secondary">{profile.name}</span>
          <span className="shrink-0 text-muted-foreground/40">•</span>
          <div className="relative shrink-0">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.city}
              onChange={e => updateFilters({ city: e.target.value })}
              placeholder="City"
              className="h-8 w-[112px] rounded-full pl-7 text-xs"
            />
          </div>
          <Select value={filters.workMode} onValueChange={v => updateFilters({ workMode: v as FilterState["workMode"] })}>
            <SelectTrigger className="h-8 w-[78px] shrink-0 rounded-full px-3 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{WORK_MODES.map(mode => <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.sector} onValueChange={v => updateFilters({ sector: v as FilterState["sector"] })}>
            <SelectTrigger className="h-8 w-[88px] shrink-0 rounded-full px-3 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SECTORS.map(sector => <SelectItem key={sector.value} value={sector.value}>{sector.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.experience} onValueChange={v => updateFilters({ experience: v as FilterState["experience"] })}>
            <SelectTrigger className="h-8 w-[88px] shrink-0 rounded-full px-3 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{EXPERIENCES.map(experience => <SelectItem key={experience.value} value={experience.value}>{experience.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="ml-auto shrink-0">{filterSheet}</div>
        </div>

        <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[210px_1fr]">
          {/* ── Left rail ── */}
          <aside className="flex min-h-0 flex-col gap-4">
            {showProfile ? (
              <Card className="border-primary/20 bg-primary/3 shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Your Career Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold">Name</span>
                      <Input value={profile.name} onChange={e => update("name")(e.target.value)} placeholder="Your name" className="h-10 text-sm rounded-xl" />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold">Age</span>
                      <Input type="number" min="15" max="55" value={profile.age} onChange={e => update("age")(e.target.value)} className="h-10 text-sm rounded-xl" />
                    </label>
                    <label className="block space-y-1.5 sm:col-span-2">
                      <span className="text-xs font-bold">Education</span>
                      <Select value={profile.education} onValueChange={update("education")}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{["10th Pass", "12th Pass", "Diploma", "Graduate", "Post-Graduate", "PhD"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold">Current Status</span>
                      <Select value={profile.status} onValueChange={update("status")}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Student", "Fresher", "Working Professional", "Career Switcher", "Entrepreneur"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold">Career Goal</span>
                      <Select value={profile.careerGoal} onValueChange={update("careerGoal")}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Government Job", "Private Job", "IT / Tech", "Startup", "Business", "Higher Education", "Foreign Opportunity"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="block space-y-1.5 sm:col-span-2">
                      <span className="text-xs font-bold">Skills</span>
                      <Input value={profile.skills} onChange={e => update("skills")(e.target.value)} placeholder="Excel, communication, Java..." className="h-10 text-sm rounded-xl" />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold">Salary Expectation</span>
                      <Select value={profile.salaryExpectation} onValueChange={update("salaryExpectation")}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                        <SelectContent>{["₹2-3 LPA", "₹3-5 LPA", "₹5-8 LPA", "₹8-12 LPA", "₹12+ LPA"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold">Language</span>
                      <Select value={profile.language} onValueChange={update("language")}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="English">English</SelectItem>{INDIAN_LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-bold">State / Location</span>
                      <Select value={profile.location} onValueChange={update("location")}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                    <label className="block space-y-1.5 sm:col-span-2">
                      <span className="text-xs font-bold">Industry</span>
                      <Select value={profile.industry || undefined} onValueChange={update("industry")}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowProfile(false)} className="rounded-full">Close</Button>
                    <Button size="sm" className="font-bold rounded-full" onClick={() => void handleSaveProfile()}>Save Profile</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Candidate Snapshot</p>
                      <p className="font-bold text-secondary truncate">{profile.name || "Anonymous Candidate"}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1 shrink-0">{profile.careerGoal}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-muted/40 p-3"><p className="text-muted-foreground">Location</p><p className="font-semibold text-secondary">{profile.location}</p></div>
                    <div className="rounded-xl bg-muted/40 p-3"><p className="text-muted-foreground">Salary</p><p className="font-semibold text-secondary">{profile.salaryExpectation || "Not set"}</p></div>
                    <div className="rounded-xl bg-muted/40 p-3 col-span-2"><p className="text-muted-foreground">Skills</p><p className="font-semibold text-secondary truncate">{profile.skills || "Not set"}</p></div>
                  </div>
                  <Button variant="outline" className="w-full rounded-full font-semibold" onClick={() => setShowProfile(true)}>Refine profile for better results</Button>
                </CardContent>
              </Card>
            )}

            <div className="rounded-2xl border bg-muted/30 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Today's brief</p>
              <p className="mt-1 text-sm text-secondary leading-relaxed">
                A personalized newspaper for {profile.status.toLowerCase()} candidates. It mixes verified opportunities, useful career signals, and small actions you can take next.
              </p>
            </div>

            {savedCount > 0 && (
              <button onClick={() => setActiveTab("saved")} className="rounded-2xl border bg-primary/5 border-primary/20 p-4 shadow-sm w-full text-left hover:bg-primary/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary font-bold">Saved Jobs</p>
                    <p className="text-2xl font-display font-bold text-secondary mt-0.5">{savedCount}</p>
                    <p className="text-xs text-muted-foreground">jobs bookmarked</p>
                  </div>
                  <Briefcase className="w-8 h-8 text-primary/40" />
                </div>
              </button>
            )}
          </aside>

          {/* ── Right feed ── */}
          <section className="flex min-h-0 flex-col rounded-2xl border shadow-sm overflow-hidden bg-card">
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-4 pt-4 border-b overflow-x-auto">
              {[
                { id: "jobs", label: "Jobs Feed", icon: Search },
                { id: "feed", label: "Career Feed", icon: Newspaper },
                { id: "saved", label: "Saved Jobs", icon: Bookmark },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-secondary"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.id === "saved" && savedCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {savedCount > 9 ? "9+" : savedCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === "saved" && (
              <div className="flex-1 overflow-y-auto p-5">
                {savedJobs.length === 0 ? (
                  <div className="text-center py-16">
                    <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-semibold text-secondary">No saved jobs yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Click the bookmark icon on any job card to save it here.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab("jobs")}>Browse Jobs</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-secondary">{savedCount} saved job{savedCount !== 1 ? "s" : ""}</p>
                      <Badge variant="secondary" className="text-xs">Tap to apply</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {savedJobs.map(job => <SavedJobCard key={job.id} job={job} onUnsave={handleUnsaveJob} />)}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "jobs" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Search + controls */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by role, company, skills, or keyword"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className="pl-9 h-11 text-sm rounded-xl"
                      />
                    </div>
                    <Select value={filters.sort} onValueChange={v => updateFilters({ sort: v as FilterState["sort"] })}>
                      <SelectTrigger className="h-11 text-sm rounded-xl w-full sm:w-[180px]">
                        <span className="text-muted-foreground mr-1">Sort:</span>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>{SORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {/* Source summary — shown once results are ready */}
                  {!jobsLoading && allJobs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {allJobs.length} verified listing{allJobs.length !== 1 ? "s" : ""}
                      </span>
                      {Object.entries(sourceCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([src, count]) => (
                          <span key={src} className="rounded-full bg-muted px-2 py-0.5 border">
                            {count} from {src}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Active filter chips */}
                  {activeCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {filters.city && (
                        <Badge variant="secondary" className="rounded-full text-xs pl-2 pr-1 py-1 gap-1">
                          <MapPin className="w-3 h-3" />{filters.city}
                          <button onClick={() => updateFilters({ city: "" })} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      )}
                      {filters.workMode !== "all" && (
                        <Badge variant="secondary" className="rounded-full text-xs pl-2 pr-1 py-1 gap-1">
                          {filters.workMode}
                          <button onClick={() => updateFilters({ workMode: "all" })} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      )}
                      {filters.sector !== "all" && (
                        <Badge variant="secondary" className="rounded-full text-xs pl-2 pr-1 py-1 gap-1">
                          {filters.sector}
                          <button onClick={() => updateFilters({ sector: "all" })} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      )}
                      {filters.experience !== "all" && (
                        <Badge variant="secondary" className="rounded-full text-xs pl-2 pr-1 py-1 gap-1">
                          {filters.experience}
                          <button onClick={() => updateFilters({ experience: "all" })} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      )}
                      {filters.employmentType !== "all" && (
                        <Badge variant="secondary" className="rounded-full text-xs pl-2 pr-1 py-1 gap-1">
                          {filters.employmentType}
                          <button onClick={() => updateFilters({ employmentType: "all" })} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      )}
                      {(filters.salaryBand ?? "any") !== "any" && (
                        <Badge variant="secondary" className="rounded-full text-xs pl-2 pr-1 py-1 gap-1">
                          <IndianRupee className="w-3 h-3" />{SALARY_BANDS.find(b => b.value === filters.salaryBand)?.label ?? filters.salaryBand}
                          <button onClick={() => updateFilters({ salaryBand: "any" })} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>Clear all</Button>
                    </div>
                  )}
                </div>

                {/* Gate: prompt until filters are applied */}
                {!hasValidProfile ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Search className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-secondary text-lg">Search to find jobs</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Enter a job title, skill, or company above — or open <strong>Filters</strong> to narrow by location, experience, or sector.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}>
                      Open Filters
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Job results */}
                    {jobsLoading ? (
                      <div className="text-center py-16">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {filters.keyword ? `Searching live listings for "${filters.keyword}"…` : "Finding jobs for your filters…"}
                        </p>
                      </div>
                    ) : jobsError ? (
                      <div className="text-center py-16">
                        <p className="font-semibold text-secondary">Could not load jobs</p>
                        <p className="text-sm text-muted-foreground mt-1">{jobsError}</p>
                        <Button variant="outline" className="mt-4" onClick={() => reload()}>Try again</Button>
                      </div>
                    ) : filteredJobs.length === 0 ? (
                      <div className="text-center py-16">
                        <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="font-semibold text-secondary">No jobs match your filters</p>
                        <p className="text-sm text-muted-foreground mt-1">Try clearing filters or widening your search.</p>
                        <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm text-muted-foreground">
                            {filteredJobs.length === allJobs.length
                              ? `${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""}`
                              : `${filteredJobs.length} of ${allJobs.length} jobs`}
                          </p>
                          {jobsSource === "search" && (
                            <Badge variant="outline" className="text-[10px] rounded-full text-emerald-700 border-emerald-200 bg-emerald-50">
                              🟢 Live results
                            </Badge>
                          )}
                          {jobsSource === "live" && (
                            <Badge variant="outline" className="text-[10px] rounded-full text-blue-700 border-blue-200 bg-blue-50">
                              📡 Live feed
                            </Badge>
                          )}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {filteredJobs.map(job => (
                            <JobCard
                              key={job.jobId}
                              item={job}
                              onSave={handleSaveJob}
                              onUnsave={handleUnsaveJob}
                              onShare={handleShare}
                              onHide={handleHide}
                              saved={isJobSaved(job.jobId)}
                              matchScore={job.matchScore}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "feed" && (
              <div className="flex-1 overflow-y-auto space-y-5 p-5">
                <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 p-5 text-white shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70 font-bold">Your career desk</p>
                  <h2 className="mt-1 text-xl font-display font-bold">Fresh guidance for {profile.careerGoal}</h2>
                  <p className="mt-1 text-sm text-white/80">Live career updates and practical next steps for your goal and target roles.</p>
                </div>
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter sections</p>
                      <p className="mt-1 text-xs text-muted-foreground">Choose a tile to open its live, personalized brief.</p>
                    </div>
                    <Badge variant="outline" className="hidden rounded-full text-[10px] sm:inline-flex">
                      {visibleFeedSections.length} feeds
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FEED_FILTERS.map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => setFeedFilter(filter.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          feedFilter === filter.id
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        <span>{filter.emoji}</span>
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
                {feedFilter === "quiz" && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="rounded-full bg-primary/10 p-2 text-primary">❓</div>
                      <div>
                        <p className="font-bold text-secondary">What is the Quiz feed?</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Daily Quiz is a role-focused learning brief with five practice questions,
                          the correct answer, a short explanation, and a suggested next step.
                          It is generated for your selected career goal and skills. It is not a
                          formal exam, paid assessment, or saved score unless you use the questions
                          for your own practice.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid items-start gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {visibleFeedSections.map(section => (
                    <SectionCard
                      key={section.id}
                      id={`rozgar-section-${section.id}`}
                      section={section}
                      profile={profile}
                      studentProfile={studentProfile}
                      synth={synth}
                      onSaveJob={handleSaveJob}
                      onUnsaveJob={handleUnsaveJob}
                      onShare={handleShare}
                      onHide={handleHide}
                      isJobSaved={isJobSaved}
                      hiddenJobIds={hiddenJobIds}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

const VALID_WORK_MODES = new Set<FilterState["workMode"]>(["all", "remote", "hybrid", "onsite"]);
const VALID_SECTORS = new Set<FilterState["sector"]>(["all", "government", "private", "startup"]);
const VALID_EXPERIENCES = new Set<FilterState["experience"]>(["all", "fresher", "junior", "mid", "senior"]);
const VALID_EMPLOYMENT_TYPES = new Set<FilterState["employmentType"]>(["all", "full-time", "part-time", "internship", "contract"]);
const VALID_SORTS = new Set<FilterState["sort"]>(["relevance", "newest", "salary", "match"]);

function readFiltersFromUrl(): FilterState {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  const params = new URLSearchParams(window.location.search);
  const workMode = (params.get("workMode") as FilterState["workMode"]) || "all";
  const sector = (params.get("sector") as FilterState["sector"]) || "all";
  const experience = (params.get("experience") as FilterState["experience"]) || "all";
  const employmentType = (params.get("type") as FilterState["employmentType"]) || "all";
  const sort = (params.get("sort") as FilterState["sort"]) || "relevance";
  return {
    keyword: params.get("q") || "",
    city: params.get("city") || "",
    workMode: VALID_WORK_MODES.has(workMode) ? workMode : "all",
    sector: VALID_SECTORS.has(sector) ? sector : "all",
    experience: VALID_EXPERIENCES.has(experience) ? experience : "all",
    employmentType: VALID_EMPLOYMENT_TYPES.has(employmentType) ? employmentType : "all",
    salaryBand: (["any","0-3","3-6","6-12","12+"].includes(params.get("salaryBand") ?? "")) ? (params.get("salaryBand") as SalaryBand) : "any",
    sort: VALID_SORTS.has(sort) ? sort : "relevance",
  };
}
