import { Router, type IRouter, type Request, type Response } from "express";
import { generateTextWithFallback } from "./ai";

const router: IRouter = Router();

type RozgarSection =
  | "top_jobs"
  | "govt_jobs"
  | "private_jobs"
  | "internships"
  | "scholarships"
  | "skill_trends"
  | "career_growth"
  | "ai_news"
  | "tech_news"
  | "business_news"
  | "govt_schemes"
  | "salary_insights"
  | "interview_qs"
  | "english_corner"
  | "vocab"
  | "quiz"
  | "jokes"
  | "success_stories"
  | "motivation";

type LiveItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  summary: string;
  company?: string;
  location?: string;
  jobType?: string;
  remote?: boolean;
  salary?: string;
  kind?: "vacancy" | "news" | "update";
};

type FeedSource = {
  name: string;
  query: string;
};

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const VALID_SECTIONS = new Set<RozgarSection>([
  "top_jobs",
  "govt_jobs",
  "private_jobs",
  "internships",
  "scholarships",
  "skill_trends",
  "career_growth",
  "ai_news",
  "tech_news",
  "business_news",
  "govt_schemes",
  "salary_insights",
  "interview_qs",
  "english_corner",
  "vocab",
  "quiz",
  "jokes",
  "success_stories",
  "motivation",
]);

const CACHE_MS = 8 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
const FETCH_TIMEOUT_MS = 12000;

function stripTags(text: string) {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return text
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

function cleanText(text: string) {
  return decodeHtmlEntities(stripTags(text)).replace(/\s+/g, " ").trim();
}

function textFromTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? cleanText(match[1] ?? "") : "";
}

function summaryFromRss(block: string) {
  const match = block.match(/<description>([\s\S]*?)<\/description>/i);
  if (!match) return "";
  const raw = decodeHtmlEntities(decodeHtmlEntities(match[1] ?? ""));
  return stripTags(raw)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/&(?:nbsp|amp|quot|apos);/gi, " ")
    .replace(/\b(?:read more|view full coverage|google news)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

function extractLinks(itemBlock: string) {
  const matches = [...itemBlock.matchAll(/<link>([\s\S]*?)<\/link>/gi)];
  const link = matches[0] ? cleanText(matches[0][1] ?? "") : "";
  if (link) return link;

  const alt = itemBlock.match(/<link[^>]*href="([^"]+)"/i);
  return alt ? cleanText(alt[1] ?? "") : "";
}

function parseRss(xml: string): LiveItem[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  const parsed: Array<LiveItem | null> = items.map((match): LiveItem | null => {
      const block = match[1] ?? "";
      const title = textFromTag(block, "title");
      const link = extractLinks(block);
      const source = textFromTag(block, "source") || "Google News";
      const summary = summaryFromRss(block);
      const publishedAt = textFromTag(block, "pubDate") || null;

      return title && link
        ? { title, link, source, summary, publishedAt, kind: "news" }
        : null;
    });
  return parsed.filter((item): item is LiveItem => item !== null);
}

function buildGoogleNewsFeed(query: string) {
  const params = new URLSearchParams({
    q: query,
    hl: "en-IN",
    gl: "IN",
    ceid: "IN:en",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EduBharat/1.0)",
        Accept: "application/json, text/plain, */*",
      },
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function sectionContext(params: URLSearchParams) {
  return {
    location: params.get("location")?.trim() || "India",
    // Empty means the candidate has not selected an industry. Use a neutral
    // search term for provider queries; the UI must never present Technology
    // as if it were selected.
    industry: params.get("industry")?.trim() || "career",
    status: params.get("status")?.trim() || "candidate",
    goal: params.get("goal")?.trim() || "Private Job",
    skills: params.get("skills")?.trim() || "",
  };
}

const LOCATION_AWARE_SECTIONS = new Set<RozgarSection>([
  "top_jobs", "govt_jobs", "private_jobs", "internships", "govt_schemes",
  "business_news", "salary_insights",
]);

function feedSourcesForSection(section: RozgarSection, ctx: ReturnType<typeof sectionContext>): FeedSource[] {
  const skills = ctx.skills.split(",").map((s) => s.trim()).filter(Boolean).join(" ");
  const industry = ctx.industry;

  const map: Record<RozgarSection, FeedSource[]> = {
    top_jobs: [
      { name: "Local hiring", query: `"${ctx.location}" ${industry} jobs hiring India` },
      { name: "Skills match", query: `${skills} jobs hiring India ${ctx.status}` },
    ],
    govt_jobs: [
      { name: "Government recruitment", query: `site:gov.in recruitment vacancy ${ctx.location} ${ctx.status}` },
      { name: "Employment news", query: `site:ncs.gov.in government jobs ${ctx.location} India` },
    ],
    private_jobs: [
      { name: "Private hiring", query: `"${ctx.location}" private jobs hiring ${industry}` },
      { name: "Company careers", query: `${skills} private jobs India ${ctx.status}` },
    ],
    internships: [
      { name: "Internships", query: `${industry} internship apprenticeship India ${ctx.location}` },
      { name: "Entry-level experience", query: `${skills} internship fresher India` },
    ],
    scholarships: [
      { name: "Scholarships", query: `scholarship fellowship ${ctx.industry} India` },
      { name: "Education funding", query: `student scholarship skill training India ${ctx.status}` },
    ],
    skill_trends: [
      { name: "Skills employers want", query: `${industry} skills hiring India ${skills}` },
      { name: "Hiring market", query: `${skills} in-demand skills jobs India ${ctx.status}` },
    ],
    career_growth: [
      { name: "Career moves", query: `${industry} career growth promotion skills India ${ctx.status}` },
      { name: "Upskilling", query: `${skills} upskilling certification India jobs` },
    ],
    ai_news: [
      { name: "AI at work", query: `AI tools ${industry} jobs hiring India ${skills}` },
      { name: "AI market", query: `generative AI hiring India ${industry} careers` },
    ],
    tech_news: [
      { name: "Industry technology", query: `${industry} technology tools hiring India ${skills}` },
      { name: "Career technology", query: `${skills} technology jobs India` },
    ],
    business_news: [
      { name: "Local market", query: `${ctx.location} ${industry} business hiring India` },
      { name: "Career market", query: `${ctx.goal} ${industry} employment salary trends India` },
    ],
    govt_schemes: [
      { name: "Local schemes", query: `site:gov.in ${ctx.location} skilling employment scheme ${ctx.status}` },
      { name: "Public programs", query: `site:myscheme.gov.in skill training employment ${industry} India` },
    ],
    salary_insights: [
      { name: "Role pay", query: `${industry} salary ${ctx.status} India ${skills}` },
      { name: "Compensation", query: `${ctx.location} ${industry} salary hiring market India` },
    ],
    interview_qs: [
      { name: "Role interviews", query: `${industry} interview questions hiring India ${skills}` },
      { name: "Interview advice", query: `${ctx.goal} interview preparation ${ctx.status} India` },
    ],
    english_corner: [
      { name: "Workplace English", query: `${industry} workplace English interview phrases India` },
      { name: "Communication", query: `${ctx.goal} English communication ${ctx.status} India` },
    ],
    vocab: [
      { name: "Role vocabulary", query: `${industry} workplace vocabulary ${skills}` },
      { name: "Interview language", query: `${ctx.goal} interview communication vocabulary India` },
    ],
    quiz: [
      { name: "Role practice", query: `${industry} skills assessment interview India ${skills}` },
      { name: "Skills practice", query: `${ctx.goal} aptitude interview practice ${ctx.status} India` },
    ],
    jokes: [
      { name: "Work culture", query: `${industry} workplace culture India` },
      { name: "Professional humor", query: `Indian office work humor careers` },
    ],
    success_stories: [
      { name: "Career stories", query: `${industry} career success story India` },
      { name: "Industry stories", query: `${skills} professional success story India` },
    ],
    motivation: [
      { name: "Motivation", query: `job seeker career motivation India` },
      { name: "Career inspiration", query: `${industry} career inspiration ${ctx.status} India` },
    ],
  };

  return map[section];
}

const FEED_RELEVANCE_TERMS: Record<RozgarSection, string[]> = {
  top_jobs: ["job", "hiring", "recruit", "vacancy", "opening", "career"],
  govt_jobs: ["government", "govt", "recruit", "vacancy", "notification", "exam", "public sector"],
  private_jobs: ["private", "company", "corporate", "hiring", "recruit", "job", "career"],
  internships: ["intern", "apprent", "trainee", "fresher", "entry level"],
  scholarships: ["scholarship", "fellowship", "grant", "student", "education", "stipend"],
  skill_trends: ["skill", "hiring", "demand", "learn", "upskill", "training", "course"],
  career_growth: ["career", "growth", "promotion", "skill", "upskill", "salary", "job"],
  ai_news: ["ai", "artificial intelligence", "machine learning", "genai", "automation"],
  tech_news: ["technology", "tech", "software", "digital", "cloud", "data", "cyber"],
  business_news: ["business", "company", "market", "hiring", "employment", "salary", "industry"],
  govt_schemes: ["scheme", "skilling", "skill", "training", "employment", "government", "pm ", "yojana"],
  salary_insights: ["salary", "pay", "compensation", "wage", "income", "ctc", "hiring"],
  interview_qs: ["interview", "hiring", "recruit", "candidate", "career", "question"],
  english_corner: ["english", "communication", "interview", "workplace", "language"],
  vocab: ["vocabulary", "word", "english", "communication", "workplace", "interview"],
  quiz: ["quiz", "assessment", "aptitude", "interview", "skill", "practice"],
  jokes: ["work", "office", "career", "professional", "workplace"],
  success_stories: ["success", "career", "professional", " entrepreneur", "achievement"],
  motivation: ["motivation", "career", "job", "inspiration", "success"],
};

function profileTerms(section: RozgarSection, ctx: ReturnType<typeof sectionContext>) {
  return [
    ...(LOCATION_AWARE_SECTIONS.has(section) ? [ctx.location] : []),
    ctx.industry,
    ...ctx.skills.split(","),
  ].map(term => term.trim().toLowerCase()).filter(term => term.length >= 3);
}

function isRelevantFeedItem(item: LiveItem, section: RozgarSection, ctx: ReturnType<typeof sectionContext>) {
  const haystack = `${item.title} ${item.summary} ${item.source}`.toLowerCase();
  if (NON_INDIA_TITLE_TERMS.some(term => haystack.includes(term))) return false;
  const sectionMatch = FEED_RELEVANCE_TERMS[section].some(term => haystack.includes(term));
  const candidateMatch = profileTerms(section, ctx).some(term => haystack.includes(term));
  // Keep a source when it is on-topic and either profile-specific or from a
  // query already narrowed to the candidate. This removes unrelated Google
  // News noise without making a useful general career brief empty.
  return sectionMatch && (candidateMatch || item.source.toLowerCase().includes("google news"));
}

function normalizeJobicy(job: Record<string, unknown>): LiveItem | null {
  const title = typeof job["jobTitle"] === "string" ? job["jobTitle"] : "";
  const link = typeof job["url"] === "string" ? job["url"] : "";
  if (!title || !link) return null;

  const company = typeof job["companyName"] === "string" ? job["companyName"] : undefined;
  const location = typeof job["jobGeo"] === "string" ? job["jobGeo"] : undefined;
  const summaryRaw = typeof job["jobExcerpt"] === "string" ? job["jobExcerpt"] : "";
  const publishedAt = typeof job["pubDate"] === "string" ? job["pubDate"] : null;
  const jobType = Array.isArray(job["jobType"]) ? job["jobType"].filter((v): v is string => typeof v === "string").join(", ") : undefined;
  const kind: LiveItem["kind"] = "vacancy";

  return {
    title,
    link,
    source: "Jobicy API",
    publishedAt,
    summary: cleanText(summaryRaw).slice(0, 220),
    company,
    location,
    jobType,
    remote: Boolean(String(location ?? "").toLowerCase().includes("remote")),
    kind,
  };
}

async function fetchFeedItems(source: FeedSource): Promise<LiveItem[]> {
  const url = buildGoogleNewsFeed(source.query);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; EduBharat/1.0)",
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status}`);
  }

  const xml = await response.text();
  return parseRss(xml).slice(0, 6);
}

function mergeItems(items: LiveItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.company || ""}|${item.title}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Returns true if a job is relevant to an India-based candidate.
 * Filters out jobs with explicit non-India locations (Australia, USA, Germany, etc.)
 * unless the job is explicitly marked remote.
 */
// Title/description keywords that indicate the job explicitly targets non-India regions
const NON_INDIA_TITLE_TERMS = [
  "latam", "latin america", "portuguese", "espaÃ±ol", "emea", "apac",
  "dach", "benelux", "nordics", "mena", "gcc", "cis", "cee",
  "europe", "european", "americas", "africa", "middle east",
  "australia", "canadian", "uk market", "us market",
  "malta", "new zealand", "ireland job market", "qatar", "saudi job market",
  "dubai job market", "uae job market", "overseas careers",
];

function isIndiaRelevantJob(item: LiveItem): boolean {
  const title = (item.title ?? "").toLowerCase();
  const company = (item.company ?? "").toLowerCase();
  const summary = (item.summary ?? "").toLowerCase();
  const haystack = `${title} ${company} ${summary}`;

  // Reject if title/summary explicitly targets a non-India region â€” even for remote jobs
  if (NON_INDIA_TITLE_TERMS.some(t => haystack.includes(t))) return false;

  // Unknown location â€” allow through
  if (!item.location) return true;
  const loc = item.location.toLowerCase().trim();
  if (!loc || loc === "remote" || loc === "worldwide") return true;

  // Explicitly India location â€” always allow
  if (loc.includes("india")) return true;

  // Remote but no non-India signal â€” allow
  if (item.remote === true) return true;

  // Exclude jobs with clearly non-India location tokens
  const tokens = loc.split(/[\s,/-]+/).map(t => t.trim()).filter(Boolean);
  const nonIndiaTokens = new Set([
    "australia", "aus", "usa", "us", "united", "states", "canada", "ca",
    "uk", "germany", "de", "france", "netherlands", "nl", "zealand",
    "brazil", "mexico", "japan", "jp", "china", "cn", "korea", "kr",
    "dubai", "uae", "hongkong", "taiwan", "tw", "sweden", "norway",
    "denmark", "finland", "switzerland", "austria", "spain", "italy",
    "portugal", "poland", "czech", "singapore", "sg", "malaysia", "my",
    "thailand", "th", "philippines", "ph", "indonesia", "id",
    "argentina", "colombia", "chile", "peru", "venezuela", "nigeria",
    "kenya", "ghana", "egypt", "turkey", "israel", "pakistan",
  ]);
  const nonIndiaPhrases = [
    "new zealand", "united states", "united kingdom", "hong kong",
    "south africa", "latin america", "south america",
  ];
  if (nonIndiaPhrases.some(p => loc.includes(p))) return false;
  return !tokens.some(t => nonIndiaTokens.has(t));
}

type RozgarJSearchJob = { job_title?: string; employer_name?: string; job_location?: string; job_city?: string; job_state?: string; job_country?: string; job_description?: string; job_apply_link?: string; job_posted_at_datetime_utc?: string; job_employment_type?: string; job_is_remote?: boolean; job_min_salary?: number; job_max_salary?: number; job_salary_currency?: string };

async function fetchJSearchItems(ctx: ReturnType<typeof sectionContext>): Promise<LiveItem[]> {
  const apiKey = process.env["JSEARCH_API_KEY"] ?? process.env["JSEARCH_RAPIDAPI_KEY"];
  const host = process.env["JSEARCH_API_HOST"] || "jsearch.p.rapidapi.com";
  if (!apiKey) return [];
  const query = [ctx.skills, ctx.industry, ctx.goal, ctx.location].filter(Boolean).join(" ") || "jobs in India";
  const params = new URLSearchParams({ query, page: "1", num_pages: /^fresher$/i.test(ctx.status) ? "3" : "1", country: "in", date_posted: "all" });
  const response = await fetch("https://" + host + "/search-v2?" + params.toString(), { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": host, "Content-Type": "application/json" } });
  if (!response.ok) throw new Error("JSearch HTTP " + response.status);
  const data = await response.json() as { data?: { jobs?: RozgarJSearchJob[] } };
  const jobs = Array.isArray(data.data?.jobs) ? data.data.jobs : [];
  return jobs.map(job => ({
    title: job.job_title || "Job Opportunity",
    link: job.job_apply_link || "",
    source: "JSearch",
    publishedAt: job.job_posted_at_datetime_utc || null,
    summary: stripTags(job.job_description || "").slice(0, 220),
    company: job.employer_name,
    location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ") || job.job_location || "India",
    salary: job.job_min_salary || job.job_max_salary ? String(job.job_salary_currency || "INR") + " " + String(job.job_min_salary || "") + (job.job_max_salary ? "-" + String(job.job_max_salary) : "+") : undefined,
    jobType: job.job_employment_type,
    remote: Boolean(job.job_is_remote),
    kind: "vacancy" as const
  })).filter(item => Boolean(item.link));
}

async function rankJobsWithAI(items: LiveItem[], ctx: ReturnType<typeof sectionContext>, enabled = true): Promise<{items: LiveItem[]; aiRanked: boolean}> {
  if (!enabled || items.length < 2) return { items, aiRanked: false };
  try {
    const text = await generateTextWithFallback({
      system: "Rank real job listings for a candidate. Return JSON only.",
      maxTokens: 500,
      prompt: "Candidate: " + JSON.stringify(ctx) + "\nJobs: " +
        JSON.stringify(items.map((x,index)=>({index,title:x.title,company:x.company,location:x.location,summary:x.summary}))) +
        '\nReturn exactly {"order":[indices]} with every index once, best fit first.'
    });
    const order = JSON.parse(text.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,"").trim()).order;
    if (!Array.isArray(order) || order.length !== items.length || new Set(order).size !== items.length) return { items, aiRanked: false };
    return { items: order.map(i => items[i]).filter(Boolean), aiRanked: true };
  } catch {
    return { items, aiRanked: false };
  }
}

router.get("/rozgar/live", async (req: Request, res: Response) => {
  const rawSection = req.query["section"] as string | undefined;
  const section: RozgarSection = rawSection && VALID_SECTIONS.has(rawSection as RozgarSection)
    ? (rawSection as RozgarSection)
    : "top_jobs";
  const ctx = sectionContext(new URLSearchParams(req.query as Record<string, string>));
  const cacheKey = `${section}:${ctx.location}:${ctx.industry}:${ctx.status}:${ctx.goal}:${ctx.skills}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.payload);
    return;
  }

  const sources = feedSourcesForSection(section, ctx);

  try {
    const vacancySections = new Set<RozgarSection>([
      "top_jobs",
      "govt_jobs",
      "private_jobs",
      "internships",
      "scholarships",
    ]);

    // Google News is useful for the career pulse, but its headlines are not
    // verified job listings. Only Jobicy records may enter vacancy sections.
    const itemGroups = await Promise.allSettled(
      section === "top_jobs"
        ? [Promise.all(sources.map((source) => fetchFeedItems(source))).then((groups) => groups.flat()), fetchJSearchItems(ctx)]
        : section === "private_jobs"
          ? [Promise.all(sources.map((source) => fetchFeedItems(source))).then((groups) => groups.flat()), fetchJSearchItems(ctx)]
          : section === "internships"
            ? [Promise.all(sources.map((source) => fetchFeedItems(source))).then((groups) => groups.flat()), fetchJSearchItems(ctx)]
            : section === "govt_jobs" || section === "scholarships"
              ? [Promise.all(sources.map((source) => fetchFeedItems(source))).then((groups) => groups.flat())]
              : [Promise.all(sources.map((source) => fetchFeedItems(source))).then((groups) => groups.flat())],
    );

    const rawItems = itemGroups.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

    const ranking = await rankJobsWithAI(mergeItems(
      rawItems.filter((item) => {
        // For job/vacancy sections from external APIs, filter to India-relevant only
        if (vacancySections.has(section) && item.source !== "JSearch") return false;
        if (vacancySections.has(section) && !isIndiaRelevantJob(item)) return false; if (vacancySections.has(section) && ctx.location && !item.remote && item.location && !item.location.toLowerCase().includes(ctx.location.toLowerCase())) return false; if (vacancySections.has(section) && item.publishedAt && Date.now() - new Date(item.publishedAt).getTime() > 30*24*60*60*1000) return false;
        if (vacancySections.has(section) && /^fresher$/i.test(ctx.status)) { const h=`${item.title} ${item.summary}`.toLowerCase(); if (/\b(senior|lead|manager|principal|director|architect|head of|[3-9]\+?\s*years?|[1-9]\s*-\s*[1-9]\s*years?)\b/.test(h)) return false; }

        if (!vacancySections.has(section)) {
          return isRelevantFeedItem(item, section, ctx);
        }

        const haystack = `${item.title} ${item.company ?? ""} ${item.location ?? ""} ${item.summary ?? ""}`.toLowerCase();
        if (section === "top_jobs") return true;
        if (section === "private_jobs") return !haystack.includes("government") && !haystack.includes("govt");
        if (section === "govt_jobs") return haystack.includes("recruit") || haystack.includes("vacanc") || haystack.includes("notification") || item.source.includes("Google");
        if (section === "internships") return haystack.includes("intern") || haystack.includes("apprent") || haystack.includes("trainee");
        if (section === "scholarships") return haystack.includes("scholarship") || haystack.includes("fellowship") || haystack.includes("grant");
        return true;
      }),
    ).slice(0, 10), ctx, vacancySections.has(section));
    const items = ranking.items.filter((item) => { if (!vacancySections.has(section) || !/^fresher$/i.test(ctx.status)) return true; const h=`${item.title} ${item.summary}`.toLowerCase(); return /(fresher|freshers|entry[- ]level|junior|intern|internship|trainee|graduate|0\s*[-to]+\s*2\s*(?:years?|yrs?)|1\s*[-to]+\s*2\s*(?:years?|yrs?))/.test(h) && !/(senior|lead|manager|principal|director|architect|head of|[3-9]\s*(?:\+|to|-)?\s*(?:years?|yrs?))/.test(h); });

    const payload = {
      aiRanked: ranking.aiRanked,
      section,
      fetchedAt: new Date().toISOString(),
      sources,
      items,
    };

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, payload });
    res.json(payload);
  } catch (err) {
    req.log?.warn?.({ err }, "Rozgar live feed failed");
    res.status(502).json({
      section,
      fetchedAt: new Date().toISOString(),
      sources,
      items: [],
      error: "Live source unavailable right now. Falling back to AI summary.",
    });
  }
});

export default router;











