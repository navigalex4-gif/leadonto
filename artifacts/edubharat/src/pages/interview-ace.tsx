import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useHistory } from "@/lib/use-history";
import { useGeminiStream } from "@/lib/use-gemini-stream";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { useGoogleTTS, unlockAudio, useMouthLevel } from "@/lib/use-edge-tts";
import { useStudentProfile } from "@/lib/use-student-profile";
import { useAuth } from "@/lib/use-auth";
import { useCredits, chargeInterview, tickInterview, endInterview, interviewCreditCost, interviewBlockSeconds, INTERVIEW_MAX_BLOCKS } from "@/lib/use-credits";
import { useGuestTrial, guestInterviewsLeft, consumeGuestInterview } from "@/lib/guest-trial";
import { AnimatedAvatar } from "@/components/avatar";
import { INTERVIEW_COACHES, recommendedCoachFor } from "@/lib/tutors";
import { COMPETENCIES, coveredCompetencies, weightedScoreFor, areaForBeat, functionalKnowledgeFor, questionFrameworkFor, calibrationFor, type CompetencyKey } from "@/lib/interview-format";
import { useToast } from "@/hooks/use-toast";
import { PageMeta } from "@/components/page-meta";
import { MobilePrimaryCTA } from "@/components/mobile-primary-cta";
import { formatGeneratedText } from "@/lib/english-tools";
import { interviewVerdict as verdictFor, recommendationForWeighted, ratingLabel, RECOMMENDATION_STYLES, type RecommendationLabel } from "@/lib/interview-verdict";
import {
  Loader2, Mic, MicOff, PlayCircle, ChevronRight, Download, Volume2,
  LogOut, CheckCircle2, ChevronDown, MessageCircle, Pencil, Flame, Brain,
  Star, Clock, Timer, AlertCircle, Save, PhoneOff, VideoOff, Video, Target, XCircle,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const INTERVIEW_TYPES = [
  { value: "hr", label: "HR Interview", icon: "🤝" },
  { value: "software", label: "Software Developer", icon: "💻" },
  { value: "sales", label: "Sales Executive", icon: "📈" },
  { value: "sales_manager", label: "Sales Manager", icon: "📈" },
  { value: "business_analyst", label: "Business Analyst", icon: "📊" },
  { value: "marketing", label: "Marketing Manager", icon: "📣" },
  { value: "customer_service", label: "Customer Service", icon: "🎧" },
  { value: "bpo", label: "BPO / Call Center", icon: "☎️" },
  { value: "banking", label: "Banking / BFSI", icon: "🏦" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "operations", label: "Operations", icon: "⚙️" },
  { value: "data_analytics", label: "Data Analytics", icon: "📊" },
  { value: "finance", label: "Finance / CA", icon: "💰" },
  { value: "freshers", label: "Freshers / Campus", icon: "🎓" },
  { value: "government", label: "Government / SSC / UPSC", icon: "🏛️" },
];

const EXPERIENCE_LEVELS = ["Fresher", "1-2 years", "3-5 years", "5+ years"];
const DURATIONS = [
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 25, label: "25 minutes" },
];
// A calm, deliberate interviewer voice. This changes delivery speed only;
// reply-start timing remains live-conversation speed.
const INTERVIEW_SPEECH_RATE = 0.96;
const ANANYA_SPEECH_RATE = 0.97;

// ─── Types ─────────────────────────────────────────────────────────────────────

type SubScores = {
  communication?: number;
  grammar?: number;
  confidence?: number;
  technical?: number;
};

type QA = {
  question: string;
  answer?: string;
  feedback?: string;
  score?: number;
} & SubScores;

type Coach = typeof INTERVIEW_COACHES[number];

/** Interviewers introduce themselves by name only, without honorifics. */
function interviewerDisplayName(name: string): string {
  return name.replace(/\s+(?:sir|ma['’]am|madam)\b/gi, "").trim();
}

function spokenRoleLabel(label: string): string {
  return label.replace(/\s+Interview$/i, "").trim() || label;
}

type CompetencyRating = { rating: number; comment: string };

type InterviewReport = {
  /** 0–100 overall (= weightedScore × 20). Kept for analytics, trends and
   *  older saved reports so nothing downstream breaks. */
  overallScore: number;
  /** 1–5 Total Weighted Score — the scorecard's primary result. */
  weightedScore: number;
  /** Strong Hire / Hire / Hold / No Hire, derived from weightedScore. */
  recommendation: RecommendationLabel;
  communicationScore: number;
  grammarScore: number;
  confidenceScore: number;
  technicalScore: number;
  roleFit: string;
  /** Concise hiring-panel summary grounded in transcript evidence. */
  hiringSummary?: string;
  /** How much usable evidence the interview produced; not a truth detector. */
  evidenceQuality?: "High" | "Medium" | "Low";
  /** Observable answer-quality signals, never a claim that the candidate is truthful. */
  authenticitySignals?: string[];
  /** Specific gaps or untested areas that prevent a confident hiring decision. */
  evidenceLimitations?: string[];
  /** Questions a human panel should verify in the next round. */
  followUpChecks?: string[];
  /** Practical next action for the candidate or recruiter. */
  recommendedNextStep?: string;
  /** The job role that best suits this candidate based on their interests,
   *  motivation, strengths and answers — may differ from the role interviewed
   *  for. Empty string when not assessed (e.g. older saved reports). */
  bestFitRole?: string;
  /** Human hiring-recommendation rationale shown next to the Selected / Not
   *  Selected result (the label itself is derived from overallScore). */
  verdictReason?: string;
  /** Per-competency 1–5 ratings, keyed by CompetencyKey (only the competencies
   *  this interview length covered are present). */
  competencies?: Partial<Record<CompetencyKey, CompetencyRating>>;
  strengths: string[];
  concerns: string[];
  /** Legacy field kept only so older saved reports still parse cleanly. */
  improvements?: string[];
  nextSteps: string[];
  questionScores?: Array<{
    score: number; communication: number; grammar: number;
    confidence: number; technical: number; feedback: string;
  }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSubScore(text: string, key: string): number | undefined {
  const pattern = new RegExp(`\\b${key}\\b[^\\d]{0,10}(\\d{1,2})(?:\\s*\\/\\s*10)?`, "i");
  const m = text.match(pattern);
  if (!m) return undefined;
  const n = parseInt(m[1]!);
  return n >= 1 && n <= 10 ? n : undefined;
}

function avgOf(nums: (number | undefined)[]): number {
  const valid = nums.filter((n): n is number => n !== undefined);
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
}

function grade(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: "Outstanding", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  if (score >= 80) return { label: "Excellent", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (score >= 70) return { label: "Good", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
  if (score >= 60) return { label: "Average", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" };
  if (score >= 50) return { label: "Below Average", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" };
  return { label: "Needs Work", color: "text-red-700", bg: "bg-red-50 border-red-200" };
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Remove any prompt artifacts (Ack:/Next:, labels, markdown) that could leak into TTS. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^(?:Ack|Next):\s*/gim, "")
    .replace(/\b(?:Ack|Next):\s*/gi, "")
    .replace(/^[A-Za-zÀ-ÿ'\s]{2,30}:\s*/, "")
    .replace(/\b(hello|hi|hey)(?:[,\s!]+)(?:hello|hi|hey)\b/gi, "$1")
    .replace(/\bchat(?:ting)?\b/gi, "conversation")
    .replace(/[#*_]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Keep the live interviewer conversational: one clear question per turn.
 * The prompt asks the model for this shape, but this final guard prevents a
 * model occasionally returning a two-part questionnaire or a long paragraph.
 */
function keepOneSimpleQuestion(text: string): string {
  let question = text
    .replace(/^(?:Next|Question):\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const questionEnd = question.indexOf("?");
  if (questionEnd >= 0) {
    question = question.slice(0, questionEnd + 1).trim();
  } else {
    const sentenceEnd = question.search(/[.!](?:\s|$)/);
    if (sentenceEnd >= 0) question = question.slice(0, sentenceEnd + 1).trim();
  }

  return question;
}

const INTERVIEW_FALLBACK_QUESTIONS = [
  "What did you learn?",
  "What did you do first?",
  "What changed because of your actions?",
  "How would you handle it now?",
  "What would success look like?",
  "What would be most challenging?",
  "How would you explain your approach?",
  "What would you improve next time?",
  "What would you do if the plan failed?",
  "What is one example from your work or studies?",
  "How did you know it worked?",
  "What would help you do this well?",
  "What would you try differently?",
  "How would you make this easier?",
  "What is the first sign of a problem?",
  "What would you like to strengthen?",
];

const INTERVIEW_BEHAVIOR_MOMENTS = [
  "If the answer reveals effort or uncertainty, acknowledge that specific human detail briefly before asking the next question.",
  "If the answer is short, stay curious rather than sounding disappointed; offer a concrete angle that makes answering easier.",
  "If the candidate shares a win, let a little genuine energy through, then test what they personally contributed.",
  "Occasionally use a short bridge such as “That’s useful context,” “I can see why that mattered,” or “Let’s stay with that for a moment,” but never repeat one.",
  "Vary the shape of the next question: a choice, a counterfactual, a concrete example, a trade-off, a reflection, or a role-specific scenario.",
  "Leave room for a natural conversational beat. Do not pack every response with praise or rush to the next competency.",
];

const AREA_FALLBACK_QUESTIONS: Record<string, string[]> = {
  education: [
    "Which part of your education has prepared you best for this role?",
    "What subject or project from your studies do you feel most confident talking about?",
    "Was there a course or project that changed how you think about work?",
  ],
  personality: [
    "What's something you enjoy doing outside work or studies that helps you recharge?",
    "If you had a completely free weekend, how would you spend it?",
    "What's a hobby or interest people are often surprised to learn about you?",
    "What's something you've gotten better at recently, just for yourself?",
  ],
  adaptability: [
    "Tell me about a time you had to quickly learn something new for a task.",
    "How do you usually react when plans change at the last minute?",
    "What's one skill you're currently trying to build or improve?",
    "How do you typically respond when feedback catches you off guard?",
  ],
  problemSolving: [
    "Walk me through how you'd tackle a problem you've never seen before.",
    "When you're stuck on something, what's usually the first thing you try?",
    "Describe a time you had to make a decision without all the information you wanted.",
  ],
  ownership: [
    "Tell me about something you saw through from start to finish, even when it got hard.",
    "Describe a time no one was checking on your work — what did you do?",
    "When have you caught your own mistake before someone else did?",
  ],
  collaboration: [
    "How do you usually handle a disagreement with a teammate?",
    "Tell me about a time you had to work closely with someone very different from you.",
    "What does being a good team player mean to you?",
  ],
  itSkills: [
    "Which digital tool or app do you use confidently, and how does it help you?",
    "How comfortable are you picking up new software or systems on the job?",
    "What's your approach to keeping your work and data organised digitally?",
  ],
  domainKnowledge: [],
};

/** Functional/domain fallback questions woven around the actual role label, so
 *  even a fallback question still sounds tied to the job being interviewed for
 *  rather than generic. */
function domainFallbackQuestions(roleLabel: string, type: string, experience: string): string[] {
  const roleQuestions: Record<string, string[]> = {
    sales: [
      "How would you find and qualify a new prospect for this role?",
      "A prospect says your product is too expensive. How would you respond?",
      "How would you decide whether to follow up with a lead and what would you record in a CRM?",
    ],
    sales_manager: [
      "A team is behind target halfway through the month. What would you inspect first?",
      "How would you coach a representative whose activity is high but conversions are low?",
      "What would you include in a reliable sales forecast, and how would you test it?",
    ],
    operations: [
      "A process is missing its SLA because of a repeated handoff error. How would you investigate it?",
      "How would you balance speed and accuracy when the team has a growing backlog?",
      "What would you measure before deciding that an operations process has improved?",
    ],
    customer_service: [
      "A customer is upset because their issue has not been resolved. What would you do first?",
      "How would you decide whether to resolve a complaint yourself or escalate it?",
      "Which details would you record after a customer interaction so the next colleague can help effectively?",
    ],
  };
  return [
    ...(roleQuestions[type] ?? []),
    `What part of a ${roleLabel} role do you think you'd pick up the fastest?`,
    `What's one thing about ${roleLabel} work you're still figuring out?`,
    `If you started this ${roleLabel} role tomorrow as a ${experience || "new"} candidate, what would you want to learn first?`,
    `What do you think separates someone average at ${roleLabel} work from someone really good at it?`,
  ];
}

/** The selected role is the contract for the whole interview: question wording,
 * domain expertise, fallback questions, and report language must all use it. */
function roleLabelFor(
  preferredRole: string,
  selectedType: string,
  typeLabel: string,
  mapRoleToType: (role: string) => string,
): string {
  const savedRole = preferredRole.trim();
  return savedRole && mapRoleToType(savedRole) === selectedType ? savedRole : typeLabel;
}

/** Simple Fisher-Yates shuffle so repeated fallbacks (which happen whenever the
 *  AI stream is slow) don't hand every candidate the exact same question in the
 *  exact same order. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function normalizeInterviewQuestion(text: string): string {
  return cleanForSpeech(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRepeatedInterviewQuestion(question: string, askedQuestions: string[]): boolean {
  const candidate = normalizeInterviewQuestion(question);
  if (!candidate) return true;
  const candidateWords = new Set(candidate.split(" ").filter(word => word.length > 2));
  return askedQuestions.some(asked => {
    const normalizedAsked = normalizeInterviewQuestion(asked);
    if (normalizedAsked === candidate) return true;
    const askedWords = new Set(normalizedAsked.split(" ").filter(word => word.length > 2));
    if (!candidateWords.size || !askedWords.size) return false;
    const shared = [...candidateWords].filter(word => askedWords.has(word)).length;
    return shared / Math.min(candidateWords.size, askedWords.size) >= 0.78;
  });
}

function isCannedInterviewQuestion(question: string): boolean {
  return /^(?:could|can|would|please)\s+(?:you\s+)?(?:elaborate|tell me more|walk me through)|^can you give me a specific example|^what was the biggest challenge you faced in that situation/i.test(
    normalizeInterviewQuestion(question),
  );
}

function nextUnusedInterviewQuestion(askedQuestions: string[], areaKey: string, roleLabel: string, type: string, experience: string): string {
  // Area-specific bank first (shuffled, so repeated fallbacks vary between
  // sessions and within one), domain questions woven around the actual role,
  // then the generic bank as a last resort.
  const candidates = [
    ...shuffled(AREA_FALLBACK_QUESTIONS[areaKey] ?? []),
    ...(areaKey === "domainKnowledge" ? shuffled(domainFallbackQuestions(roleLabel, type, experience)) : []),
    ...shuffled(INTERVIEW_FALLBACK_QUESTIONS),
  ];
  return candidates.find(question =>
    !isRepeatedInterviewQuestion(question, askedQuestions) && !isCannedInterviewQuestion(question),
  ) ?? "What is one new thing you would try next time?";
}

function parseCompetencyRating(v: unknown): CompetencyRating {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const raw = Number(o["rating"]);
  const rating = Number.isFinite(raw) ? Math.min(5, Math.max(1, Math.round(raw))) : 3;
  return { rating, comment: String(o["comment"] || "") };
}

/** Deterministically derive the weighted score (1–5), the 0–100 overall
 *  (weighted × 20, kept for analytics/trends), the recommendation band and the
 *  typed sub-scores from the 1–5 ratings — over the competencies this interview
 *  length covers. Computing this here (not from the AI) guarantees the score,
 *  ratings and recommendation can never contradict one another. */
function deriveScores(
  competencies: Partial<Record<CompetencyKey, CompetencyRating>>,
  durationMin: number,
) {
  const ratings: Partial<Record<CompetencyKey, number>> = {};
  for (const key of Object.keys(competencies) as CompetencyKey[]) {
    ratings[key] = competencies[key]!.rating;
  }
  const weightedScore = weightedScoreFor(ratings, durationMin);
  const overallScore = Math.round(weightedScore * 20);
  const recommendation = recommendationForWeighted(weightedScore).label;
  const pct = (key: CompetencyKey) =>
    typeof ratings[key] === "number" ? ratings[key]! * 20 : overallScore;
  return {
    weightedScore,
    overallScore,
    recommendation,
    communicationScore: pct("communication"),
    grammarScore: pct("communication"),
    confidenceScore: pct("ownership"),
    technicalScore: pct("domainKnowledge"),
  };
}

/** A neutral fallback report (every covered competency rated 3) used only when
 *  automated scoring is interrupted, so the user still sees a coherent result. */
function neutralReport(durationMin: number): InterviewReport {
  const competencies: Partial<Record<CompetencyKey, CompetencyRating>> = {};
  for (const c of coveredCompetencies(durationMin)) {
    competencies[c.key] = { rating: 3, comment: "Automated scoring was interrupted — this is an indicative result." };
  }
  return {
    ...deriveScores(competencies, durationMin),
    roleFit: "Promising candidate with room to grow.",
    bestFitRole: "",
    verdictReason: "Automated scoring was interrupted, so this is an indicative result — please review the detailed feedback below.",
    competencies,
    strengths: ["Engaged actively throughout the interview", "Attempted every question", "Showed willingness to learn"],
    concerns: ["Automated scoring was interrupted — re-run the interview for a precise assessment"],
    nextSteps: ["Practice structured STAR-method answers", "Record yourself and review your clarity", "Book another mock interview this week"],
  };
}

function parseReportJson(text: string, durationMin: number): InterviewReport | null {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  // If the model wrapped the JSON in prose, keep only the outermost {...} block
  // so a stray sentence before/after the object doesn't break JSON.parse.
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const rawComp =
      parsed["competencies"] && typeof parsed["competencies"] === "object"
        ? (parsed["competencies"] as Record<string, unknown>)
        : {};
    // Keep the complete scorecard; every competency is required for every
    // interview, with a neutral note when the transcript contains limited
    // evidence for one area.
    const competencies: Partial<Record<CompetencyKey, CompetencyRating>> = {};
    for (const c of coveredCompetencies(durationMin)) {
      competencies[c.key] =
        rawComp[c.key] !== undefined
          ? parseCompetencyRating(rawComp[c.key])
          : { rating: 3, comment: "Only lightly tested in this interview." };
    }
    const concerns = Array.isArray(parsed["concerns"])
      ? parsed["concerns"].map(String)
      : Array.isArray(parsed["improvements"])
        ? parsed["improvements"].map(String)
        : [];
    return {
      ...deriveScores(competencies, durationMin),
      roleFit: String(parsed["roleFit"] || ""),
      hiringSummary: String(parsed["hiringSummary"] || ""),
      evidenceQuality:
        parsed["evidenceQuality"] === "High" ||
        parsed["evidenceQuality"] === "Medium" ||
        parsed["evidenceQuality"] === "Low"
          ? parsed["evidenceQuality"]
          : "Medium",
      authenticitySignals: Array.isArray(parsed["authenticitySignals"])
        ? parsed["authenticitySignals"].map(String).slice(0, 5)
        : [],
      evidenceLimitations: Array.isArray(parsed["evidenceLimitations"])
        ? parsed["evidenceLimitations"].map(String).slice(0, 5)
        : [],
      followUpChecks: Array.isArray(parsed["followUpChecks"])
        ? parsed["followUpChecks"].map(String).slice(0, 5)
        : [],
      recommendedNextStep: String(parsed["recommendedNextStep"] || ""),
      bestFitRole: String(parsed["bestFitRole"] || ""),
      verdictReason: String(parsed["verdictReason"] || parsed["recommendation"] || ""),
      competencies,
      strengths: Array.isArray(parsed["strengths"]) ? parsed["strengths"].map(String) : [],
      concerns,
      nextSteps: Array.isArray(parsed["nextSteps"]) ? parsed["nextSteps"].map(String) : [],
    };
  } catch { return null; }
}

// ─── Small components ─────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const g = grade(score);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold border ${g.bg} ${g.color}`}>
      {score}%
    </span>
  );
}

function SkillBar({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className={`flex items-center gap-1.5 text-xs font-bold ${color}`}>
          <Icon className="w-3 h-3" />{label}
        </div>
        <span className={`text-xs font-bold ${color}`}>{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

function AvatarBar({ coach, isSpeaking, isThinking, className = "" }: {
  coach: Coach; isSpeaking: boolean; isThinking: boolean; className?: string;
}) {
  const displayName = interviewerDisplayName(coach.name);
  return (
    <div className={`flex items-center gap-3 p-3 bg-card rounded-xl border shadow-sm ${className}`}>
      <AnimatedAvatar
        name={displayName}
        subtitle={coach.role}
        isSpeaking={isSpeaking}
        isThinking={isThinking}
        gender={coach.gender}
        size="md"
        imageSrc={coach.imageSrc}
      />
      <div className="min-w-0">
        <p className="font-bold text-sm text-secondary">{displayName}</p>
        <p className="text-xs text-muted-foreground">{coach.role}</p>
        {isThinking && <span className="text-xs text-primary animate-pulse">Thinking...</span>}
        {isSpeaking && !isThinking && <span className="text-xs text-primary animate-pulse">Speaking...</span>}
      </div>
    </div>
  );
}

function TimerDisplay({ elapsedSeconds, durationMinutes }: { elapsedSeconds: number; durationMinutes: number }) {
  const totalSeconds = durationMinutes * 60;
  const pct = Math.min(100, (elapsedSeconds / totalSeconds) * 100);
  const remaining = totalSeconds - elapsedSeconds;
  const isEnding = remaining <= 30;
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 text-sm font-bold ${isEnding ? "text-red-600" : "text-muted-foreground"}`}>
        <Timer className="w-4 h-4" />
        {formatTime(elapsedSeconds)} / {durationMinutes} min
      </div>
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${isEnding ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CreditGate({ onClose, isLoggedIn }: { onClose: () => void; isLoggedIn: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-gate-title"
    >
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Interview Ace</p>
            <h2 id="credit-gate-title" className="mt-1 text-xl font-display font-bold text-secondary">
              {isLoggedIn ? "You're out of credits" : "Keep practising with free credits"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        {isLoggedIn ? (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your credit balance is too low to start this interview. Top up to keep practising — your saved progress and reports stay right where they are.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-secondary">
              <li>✓ Instant top-up, no waiting</li>
              <li>✓ Credits never expire</li>
              <li>✓ All your past reports stay saved</li>
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Maybe later</Button>
              <Link href="/credits?returnTo=%2Finterview-ace">
                <Button className="font-bold">Top Up Credits</Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your free interview sessions are used up. Sign up to unlock 20 free credits and continue practising with your saved progress.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-secondary">
              <li>✓ 20 free credits to start</li>
              <li>✓ Save interview reports and score trends</li>
              <li>✓ Personalised AI feedback after every session</li>
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Maybe later</Button>
              <Link href="/login?returnTo=%2Finterview-ace">
                <Button className="font-bold">Sign Up — it’s free</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function InterviewAce() {
  return (
    <>
      <PageMeta
        title="Interview Ace"
        description="Practice AI mock interviews with voice feedback, scores, and personalised tips for Indian roles."
        ogUrl="https://leadonto.com/interview-ace"
        canonicalUrl="https://leadonto.com/interview-ace"
      />
      <InterviewAceContent />
    </>
  );
}

function InterviewAceContent() {
  const [routeLocation, setLocation] = useLocation();
  const { save } = useHistory();
  const { text: streamText, isStreaming, stream, reset: resetStream } = useGeminiStream();
  const synth = useGoogleTTS();
  const speech = useSpeechRecognition("English");
  // Real-time loudness of whatever the coach is currently saying — drives the
  // voice-visualiser bars below with the actual waveform instead of a canned
  // CSS pulse. Closed/zero automatically whenever the coach isn't speaking.
  const mouth = useMouthLevel(synth.isSpeaking);
  // Tracks whether the coach is currently speaking (TTS active). The auto-listen
  // effect checks this so it never restarts the mic while the coach is mid-speech,
  // fixing the "stops after 1 question" bug caused by the effect firing eagerly
  // between when the stream ends and when speakCoach actually starts TTS.
  const [coachSpeaking, setCoachSpeaking] = useState(false);
  // coachThinking drives the "considering your answer" indicator during the
  // deliberate pause between the candidate finishing and the interviewer replying.
  const [coachThinking, setCoachThinking] = useState(false);
  // Safety timer: if TTS is aborted or the fetch hangs, onEnd never fires and
  // coachSpeaking gets stuck true permanently — the mic never starts. This ref
  // holds a fallback timer that force-clears the flag after a generous timeout.
  const coachSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The TTS callback must be able to wake the current answer listener without
  // waiting for a React effect/state round-trip.
  const resumeInterviewListeningRef = useRef<(() => void) | null>(null);
  /**
   * speakCoach — the ONLY way the interviewer should talk. It hard-pauses the
   * mic the instant the AI begins speaking (kills echo/self-repeat on phones
   * and laptop speakers) and releases it ~1.1s after the audio ends.
   * coachSpeaking stays true until TTS finishes, letting the auto-listen effect
   * know it should wait before restarting the mic.
   */
  const speakCoach = useCallback(
    (text: string, opts: { voiceGender?: "male" | "female"; voiceStyle?: string; pitch?: number; rate?: number }) => {
      const ttsText = cleanForSpeech(text);
      if (!ttsText) return;
      speech.pause();
      // Clear any previous safety timer before starting fresh
      if (coachSafetyTimerRef.current) { clearTimeout(coachSafetyTimerRef.current); coachSafetyTimerRef.current = null; }
      setCoachSpeaking(true);
      // 50 ms/char + 5 s base, minimum 16 s (just after the 15 s TTS hang-abort).
      // When this fires it means TTS hung — release the 10-min mic block that
      // speech.pause() set so the auto-listen effect can restart the mic.
      const safetyMs = Math.max(text.length * 50 + 5_000, 16_000);
      coachSafetyTimerRef.current = setTimeout(() => {
        coachSafetyTimerRef.current = null;
        speech.suppressUntil(Date.now() + 900);
         speech.blockFor(800); // let speaker reverb fully decay before reopening STT
        setCoachSpeaking(false);
      }, safetyMs);
      void synth.speak(ttsText, "English", () => {
        if (coachSafetyTimerRef.current) { clearTimeout(coachSafetyTimerRef.current); coachSafetyTimerRef.current = null; }
        speech.suppressUntil(Date.now() + 900);
         speech.blockFor(800);
         resumeInterviewListeningRef.current?.();
        setCoachSpeaking(false);
      }, {
        ...opts,
         // Keep interviewer replies brisk and conversational so the candidate
         // gets the next question within the live-turn budget.
         rate: Math.min(
           opts.rate ?? (coach.id === "ananya" ? ANANYA_SPEECH_RATE : INTERVIEW_SPEECH_RATE),
           coach.id === "ananya" ? ANANYA_SPEECH_RATE : INTERVIEW_SPEECH_RATE,
         ),
      });
    },
    [speech, synth],
  );
  /**
   * interruptCoach — lets the candidate tap the avatar to cut the interviewer
   * off mid-sentence, like a real conversation, instead of sitting through
   * the whole question. Mirrors the exact cleanup speakCoach's onEnd does
   * (clear safety timer, release the mic, drop coachSpeaking) so interrupting
   * can never leave the mic stuck paused.
   */
  const interruptCoach = useCallback(() => {
    if (coachSafetyTimerRef.current) { clearTimeout(coachSafetyTimerRef.current); coachSafetyTimerRef.current = null; }
    synth.stop();
    speech.suppressUntil(Date.now() + 450);
    speech.blockFor(450);
    setCoachSpeaking(false);
  }, [speech, synth]);
  const { profile } = useStudentProfile();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { balance } = useCredits();
  const { interviewsLeft: guestInterviewsRemaining } = useGuestTrial();

  const mapPreferredRoleToType = (role: string): string => {
    const r = role.toLowerCase();
    if (r.includes("software") || r.includes("developer") || r.includes("engineer") || r.includes("tech")) return "software";
    if (r.includes("sales manager") || r.includes("sales lead") || r.includes("sales head")) return "sales_manager";
    if (r.includes("sales")) return "sales";
    if (r.includes("market")) return "marketing";
    if (r.includes("customer") || r.includes("support")) return "customer_service";
    if (r.includes("bank") || r.includes("finance") || r.includes("bfsi")) return "banking";
    if (r.includes("data") || r.includes("analytic")) return "data_analytics";
    if (r.includes("insurance")) return "insurance";
    if (r.includes("operation")) return "operations";
    if (r.includes("government") || r.includes("ssc") || r.includes("upsc")) return "government";
    if (r.includes("fresher") || r.includes("campus")) return "freshers";
    return INTERVIEW_TYPES[0]!.value;
  };

  // B2B interview params — populated when this page is launched from a recruiter invite link.
  const b2bParams = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      token:    p.get("b2bToken"),
      type:     p.get("b2bType"),
      duration: p.get("b2bDuration") ? Number(p.get("b2bDuration")) : null,
      coach:    p.get("b2bCoach"),
    };
  }, []);
  const b2bToken = b2bParams.token;

  const initialType = b2bParams.type || mapPreferredRoleToType(profile.preferredRole);
  const [type, setType] = useState(initialType);
  // Experience is an explicit candidate choice. Role selection must never
  // infer seniority because the same role can be appropriate at many levels.
  const [experience, setExperience] = useState("");
  const [coach, setCoach] = useState<Coach>(() => {
    // B2B invites lock the interviewer to the recruiter's choice; otherwise the
    // interviewer is auto-matched to the interview type the candidate picked.
    if (b2bParams.coach) {
      return INTERVIEW_COACHES.find(c => c.id === b2bParams.coach) ?? INTERVIEW_COACHES[0]!;
    }
    return recommendedCoachFor(type);
  });
  const displayCoachName = interviewerDisplayName(coach.name);
  const candidateDisplayName = profile.name || user?.name || "You";
  const [duration, setDuration] = useState(() => b2bParams.duration || 10);
  const [phase, setPhase] = useState<"setup" | "interview" | "report">("setup");

  // The navbar's "Interview Ace" link appends ?begin=1 when the user is ALREADY
  // on this route (see navbar.tsx) specifically so a click from the feedback/
  // report page lands back on the setup/Begin screen — wouter keeps this page
  // mounted for a same-path navigation, so without this the URL changed but
  // nothing ever reacted to it and the user stayed stuck on the report view.
  useEffect(() => {
    if (!routeLocation.includes("begin=1")) return;
    endingRef.current = true;
    setPhase("setup");
    setQuestions([]);
    setReport(null);
    setSaved(false);
    // Strip the flag so it doesn't re-trigger on the next unrelated re-render
    // and doesn't fight with the user pressing Begin themselves.
    setLocation("/interview-ace", { replace: true });
  }, [routeLocation]);
  const [showCreditGate, setShowCreditGate] = useState(false);
  const [questions, setQuestions] = useState<QA[]>([]);
  const questionsRef = useRef<QA[]>([]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  // phaseRef mirrors `phase` so async callbacks (e.g. an in-flight submit) can
  // tell if the interview already ended without capturing a stale `phase`.
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  const [sessionStart, setSessionStart] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // No-reply watchdog: if the candidate says NOTHING for 33 s after a question is
  // asked (never even starts an answer), we conclude the interview and generate
  // feedback. Armed when the mic starts listening; cleared the instant they speak.
  const noReplyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endingRef = useRef(false);
  const windDownRef = useRef(false);
  // Guards against a second interview turn starting before the current one finishes
  // (record → stream → thinking pause → speak). Set synchronously at the top of
  // submitCurrentAnswer; reset reactively below when the coach stops speaking — which
  // marks the true end of a turn (coachSpeaking stays true through the thinking pause).
  const turnInFlightRef = useRef(false);
  useEffect(() => { if (!coachSpeaking) turnInFlightRef.current = false; }, [coachSpeaking]);
  // Diversified interview rotation: which "beat" (competency area) the current
  // question targets. Advances one beat per answered question so consecutive
  // questions cover DIFFERENT areas instead of chaining the same topic.
  const beatIdxRef = useRef(0);
  // Tracks the last spoken acknowledgement so the conversational filler does
  // not repeat back-to-back.
  // Retries on the current beat, for the 2-attempt rule: a weak answer earns ONE
  // gentle re-ask; after that we move on to a fresh area rather than dwelling.
  const retryRef = useRef(0);
  // Interview credits are metered per block (1 credit each). The first block is
  // charged at start; this counts blocks charged so the meter stops at the max
  // (a full session costs at most INTERVIEW_MAX_BLOCKS credits).
  const interviewBlocksChargedRef = useRef(1);
  // Server-minted token for THIS tab's interview (from /charge); presented on
  // every tick/end so this tab can only bill/clear the interview it started.
  const interviewIdRef = useRef<string | null>(null);
  const answerRef = useRef("");
  const answerTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = answerTextareaRef.current;
    if (!textarea) return;

    // Keep a short answer compact so the video stage gets the available
    // viewport height. Long answers grow until the answer panel's viewport
    // budget is reached, then scroll internally instead of pushing controls
    // below the fold.
    textarea.style.height = "auto";
    const minHeight = 28;
    const maxHeight = Math.max(minHeight, Math.floor(window.innerHeight * 0.08));
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [answer, speech.interimTranscript]);
  // Webcam for video call mode
  const webcamRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const typeMeta = INTERVIEW_TYPES.find(t => t.value === type)!;
  const interviewRoleLabel = roleLabelFor(
    profile.preferredRole,
    type,
    typeMeta.label,
    mapPreferredRoleToType,
  );
  const spokenInterviewRoleLabel = spokenRoleLabel(interviewRoleLabel);
  const domainExpertise = `${functionalKnowledgeFor(typeMeta.value, interviewRoleLabel)}
${questionFrameworkFor(typeMeta.value, interviewRoleLabel, experience, profile.industryPreference)}`;
  const recommendedCoachId = recommendedCoachFor(type).id;
  // B2B invites lock the interviewer to the recruiter's choice — the candidate
  // must not be able to swap it (from the type dropdown or the coach grid).
  const coachLocked = !!b2bParams.coach;
  const currentQ = questions[currentIdx];
  const answeredCount = questions.filter(q => q.answer).length;
  const interviewCost = interviewCreditCost(duration);

  useEffect(() => { answerRef.current = answer; }, [answer]);

  const clearAutoSubmitTimer = useCallback(() => {
    if (autoSubmitRef.current) clearTimeout(autoSubmitRef.current);
    autoSubmitRef.current = null;
    // Clear the no-reply watchdog in lockstep: any time the pending auto-submit is
    // cleared (candidate spoke, submitted, paused or the interview ended) the
    // "said nothing at all" window no longer applies.
    if (noReplyRef.current) clearTimeout(noReplyRef.current);
    noReplyRef.current = null;
  }, []);

  // The navbar can be clicked while this stateful route is already mounted.
  // A query flag makes that navigation an explicit request for a fresh Begin
  // screen instead of leaving the candidate on the previous report.
  useEffect(() => {
    const params = new URLSearchParams(routeLocation.split("?")[1] ?? "");
    if (params.get("begin") !== "1") return;
    endingRef.current = true;
    clearAutoSubmitTimer();
    speech.stop();
    synth.stop();
    setPhase("setup");
    if (!b2bParams.coach) setCoach(recommendedCoachFor(type));
    setQuestions([]);
    setReport(null);
    setSaved(false);
    setShowCreditGate(false);
    window.history.replaceState({}, "", `${window.location.pathname}`);
    // This is intentionally a one-shot navigation command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeLocation]);

  // Live timer during interview
  useEffect(() => {
    if (phase !== "interview") return;
    const id = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, sessionStart]);

  // Start the wind-down 30 seconds before the selected duration ends. The first
  // branch only announces the closing window; the second branch still ends at
  // the selected duration so candidates do not lose the final 30 seconds.
  useEffect(() => {
    if (phase !== "interview" || endingRef.current) return;
    if (elapsedSeconds < Math.max(0, duration * 60 - 30)) return;
    if (!windDownRef.current) {
      windDownRef.current = true;
      resetStream();
      clearAutoSubmitTimer();
      if (!isRecording) {
        speakCoach(`We have about 30 seconds left, ${((profile.name || "there").split(" ")[0])}. Finish your thought and I’ll wrap up shortly.`, { voiceGender: coach.gender, voiceStyle: coach.voiceStyle });
      }
    }
    if (elapsedSeconds < duration * 60) return;
    endingRef.current = true;
    // Abort any in-flight "next question" stream so it can't resolve after the
    // sign-off and tack on an extra question / make the coach speak again.
    resetStream();
    if (autoSubmitRef.current) { clearTimeout(autoSubmitRef.current); autoSubmitRef.current = null; }
    if (noReplyRef.current) { clearTimeout(noReplyRef.current); noReplyRef.current = null; }
    speech.stop();
    setIsRecording(false);
    setAutoListenEnabled(false);
    const pending = answerRef.current.trim();
    if (pending) {
      setQuestions(prev => prev.map((q, i) => i === currentIdx && !q.answer ? { ...q, answer: pending } : q));
    }
    const firstName = (profile.name || "there").split(" ")[0];
    speakCoach(`That is all the time we have, ${firstName}. I’ll now prepare your feedback report.`, { voiceGender: coach.gender, voiceStyle: coach.voiceStyle });
    setTimeout(() => setPhase("report"), 2600);
  }, [elapsedSeconds, duration, phase, currentIdx, profile.name, coach.gender, speakCoach, speech, resetStream, clearAutoSubmitTimer, isRecording]);

  // Conclude the interview when the candidate goes completely silent on a new
  // question (the 30 s no-reply watchdog fired). Mirrors the clock-runout path:
  // stop the mic and any in-flight stream, give a short natural sign-off, then
  // move to the report so feedback is generated from whatever was answered.
  const concludeNoReply = useCallback(() => {
    if (endingRef.current || phaseRef.current !== "interview") return;
    endingRef.current = true;
    resetStream();
    clearAutoSubmitTimer();
    speech.stop();
    setIsRecording(false);
    setAutoListenEnabled(false);
    const firstName = (profile.name || "there").split(" ")[0];
    speakCoach(`It looks like we've lost you there, ${firstName}. No problem — I'll wrap up here and get your feedback ready.`, { voiceGender: coach.gender, voiceStyle: coach.voiceStyle });
    setTimeout(() => setPhase("report"), 2600);
  }, [resetStream, clearAutoSubmitTimer, speech, profile.name, coach.gender, speakCoach]);

  // Live ref so the 30 s timer (armed inside the auto-listen effect) always calls
  // the latest concludeNoReply without adding it to that effect's deps.
  const concludeNoReplyRef = useRef(concludeNoReply);
  useEffect(() => { concludeNoReplyRef.current = concludeNoReply; }, [concludeNoReply]);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // The interview may have ended (time-up / hang-up / final question) while the
      // permission prompt was still open. The phase-transition cleanup already ran
      // and won't fire again for this stream, so release it now instead of leaving
      // the camera live on the report screen.
      if (phaseRef.current !== "interview") {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      webcamStreamRef.current = stream;
      // Attach to video element once it mounts (slight delay to allow React render)
      setTimeout(() => {
        if (webcamRef.current) webcamRef.current.srcObject = stream;
      }, 200);
      setCameraOn(true);
      setCameraError(false);
    } catch {
      setCameraError(true);
      setCameraOn(false);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    webcamStreamRef.current?.getTracks().forEach(t => t.stop());
    webcamStreamRef.current = null;
    if (webcamRef.current) webcamRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  // Cleanup webcam on unmount
  useEffect(() => () => stopWebcam(), [stopWebcam]);

  // Auto-release the candidate's camera the moment the interview is over
  // (time-up, all questions answered, or hang-up). The webcam PiP lives only in
  // the "interview" phase, but this component stays mounted through the report,
  // so stop the stream on any transition out of "interview" instead of relying
  // on unmount.
  useEffect(() => {
    if (phase !== "interview") stopWebcam();
  }, [phase, stopWebcam]);

  useEffect(() => {
    if (phase !== "interview" || isStreaming || synth.isSpeaking) {
      clearAutoSubmitTimer();
      if (isRecording && (isStreaming || synth.isSpeaking)) { setIsRecording(false); speech.stop(); }
    }
  }, [phase, isStreaming, synth.isSpeaking, isRecording, speech, clearAutoSubmitTimer]);

  useEffect(() => { return () => clearAutoSubmitTimer(); }, [clearAutoSubmitTimer]);

  const buildProfileSummary = useCallback(() => {
    return [
      `Name: ${profile.name || "Candidate"}`,
      `Education: ${profile.degree || "Not specified"}`,
      `Experience: ${experience}`,
      `Career goal: ${profile.careerGoal || interviewRoleLabel}`,
      `Preferred role: ${interviewRoleLabel}`,
      `Industry: ${profile.industryPreference || "Not specified"}`,
      `Skills: ${(profile.skills || []).join(", ") || "Not specified"}`,
      `English level: ${profile.englishLevel || "Beginner"}`,
    ].join(" | ");
  }, [profile, experience, interviewRoleLabel]);

  const buildTranscript = useCallback((upToIndex: number) => {
    return questions
      .slice(0, upToIndex + 1)
      .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer ?? "(not answered)"}`)
      .join("\n\n");
  }, [questions]);

  const startSession = useCallback(async () => {
    if (!experience) {
      toast({
        title: "Select your experience level",
        description: "Choose Fresher, 1–2 years, 3–5 years, or 5+ years before starting.",
        variant: "destructive",
      });
      return;
    }
    // Unlock browser autoplay policy synchronously within the user-gesture stack.
    // Must run before any await so Chrome still considers this a gesture-initiated play.
    unlockAudio();
    // Interview Ace requires a live microphone. Ask for it before the opening AI
    // request, while this function is still running from the Begin button gesture.
    // Waiting until after the AI request can make Chrome/Brave reject Speech-
    // Recognition without a useful permission prompt.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getTracks().forEach(track => track.stop());
      } catch {
        toast({
          title: "Microphone access is needed",
          description: "Allow microphone access for this site, then tap Begin again.",
          variant: "destructive",
        });
        return;
      }
    }
    // Don't decide guest vs. paid until auth has resolved — otherwise a signed-in
    // user could slip onto the free path before /api/auth/me returns.
    if (authLoading) {
      toast({ title: "One moment…", description: "Checking your account — please try again in a second." });
      return;
    }
    // Guests get 2 free interviews (no signup); signed-in users spend credits.
    if (!user && guestInterviewsLeft() <= 0) {
      setShowCreditGate(true);
      return;
    }
    resetStream();
    const candidateName = profile.name || "there";
    const firstName = candidateName.split(" ")[0];
    // Every interview begins with a basic introduction before domain testing.
    const safeOpening = `Hello, I'm ${displayCoachName}, your ${spokenInterviewRoleLabel} interviewer. To begin, please introduce yourself, including your education, relevant experience or projects, and why you're interested in ${spokenInterviewRoleLabel}.`;
    // Now that a real interview is starting:
    // - Valid B2B token: company pays on completion — no charge to the candidate
    // - Guest (no b2b): consume free trial slot
    // - Signed-in user (no b2b): charge credits as usual
    if (b2bToken) {
      // Validate the invite token server-side BEFORE bypassing credit/trial checks.
      // This prevents fake tokens from granting unlimited free interviews.
      const baseCheck = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      try {
        const infoRes = await fetch(`${baseCheck}/api/b2b/invite/${b2bToken}/info`, { credentials: "include" });
        if (!infoRes.ok) {
          const d = await infoRes.json() as { error?: string };
          toast({ title: d.error ?? "Invalid invite link", description: "This interview link could not be verified.", variant: "destructive" });
          return;
        }
      } catch {
        toast({ title: "Could not verify invite link", description: "Check your internet connection and try again.", variant: "destructive" });
        return;
      }
      // Valid B2B invite — company's account is billed when the session is submitted
    } else if (!user) {
      consumeGuestInterview();
    } else {
      const charge = await chargeInterview(duration);
      if (!charge.ok) {
        if (charge.status === 402) {
          setShowCreditGate(true);
        } else if (charge.status === 409) {
          toast({ title: "Interview already in progress", description: "Finish or close your other interview tab before starting a new one.", variant: "destructive" });
        } else {
          toast({ title: "Couldn't start interview", description: charge.error ?? "Please try again.", variant: "destructive" });
        }
        return;
      }
      interviewIdRef.current = charge.interviewId ?? null;
    }
    // The opening combines greeting + first question — store as first QA entry
    setQuestions([{ question: safeOpening }]);
    setCurrentIdx(0);
    setAnswer("");
    setIsRecording(false);
    setAutoListenEnabled(true);
    setSessionStart(Date.now());
    setElapsedSeconds(0);
    setReport(null);
    setSaved(false);
    endingRef.current = false;
    windDownRef.current = false;
    beatIdxRef.current = 0;
    retryRef.current = 0;
    setPhase("interview");
    // Camera does NOT start automatically — user must enable it via the button.
    // Set coachSpeaking BEFORE the delay so the auto-listen effect cannot fire
    // during the 300ms window between phase="interview" and speakCoach start.
    const pitchVariation = coach.gender === "male" ? 0.88 : 1.08;
    setCoachSpeaking(true);
    setTimeout(() => speakCoach(safeOpening, { voiceGender: coach.gender, voiceStyle: coach.voiceStyle, pitch: pitchVariation }), 300);
  }, [typeMeta, experience, duration, coach, stream, resetStream, speakCoach, profile.name, user, authLoading, toast]);

  const toggleRecording = useCallback(() => {
    if (autoListenEnabled) {
      setAutoListenEnabled(false);
      clearAutoSubmitTimer();
      setIsRecording(false);
      speech.stop();
      return;
    }
    // Resuming: clear any lingering mic-block window (e.g. from a stuck pause())
    // so the auto-listen effect can start recognition immediately.
    speech.blockFor(0);
    setIsRecording(false); // force auto-listen effect to re-evaluate and restart
    setAutoListenEnabled(true);
  }, [autoListenEnabled, clearAutoSubmitTimer, speech]);

  const submitCurrentAnswer = useCallback(async (userAnswer: string) => {
    if (!userAnswer || !currentQ) return;
    // Non-reentrancy: never start a new turn while one is still in flight. The
    // deliberate thinking pause leaves isStreaming false for ~4.5s, so a manual
    // submit could otherwise start an overlapping turn and double-advance the
    // stage. The ref is synchronous, closing even a same-tick double submit.
    if (turnInFlightRef.current) return;
    turnInFlightRef.current = true;
    clearAutoSubmitTimer();
    setIsRecording(false);
    speech.stop();
    // Lock the coach-speaking flag BEFORE the async stream call so the auto-listen
    // effect never sees a window where isRecording=false AND coachSpeaking=false AND
    // isStreaming=false all at once (which would make it restart the mic mid-processing).
    setCoachSpeaking(true);
    const recordedAnswer = userAnswer.trim();
    setAnswer("");
    resetStream();

    const elapsedMin = Math.floor(elapsedSeconds / 60);
    const remainingMin = duration - elapsedMin;
    const isFinalQuestion = elapsedSeconds >= duration * 60 - 30;

    // Record the answer without generating per-question feedback
    setQuestions(prev => prev.map((q, i) => i === currentIdx
      ? { ...q, answer: recordedAnswer }
      : q
    ));

    const firstName = (profile.name || "there").split(" ")[0];

    if (isFinalQuestion) {
      endingRef.current = true;
      speakCoach(`That is our final response, ${firstName}. I’ll prepare your feedback report now.`, { voiceGender: coach.gender, voiceStyle: coach.voiceStyle });
      const remainingMs = Math.max(1500, (duration * 60 - elapsedSeconds) * 1000);
      setTimeout(() => setPhase("report"), remainingMs);
      return;
    }

    // Build recent interview history for context (last 3 answered questions)
    const recentAnswered = questionsRef.current
      .filter(q => q.answer)
      .slice(-3)
      .map((q, i) => `Q: ${q.question}\nA: ${q.answer}`)
      .join("\n\n");
    const askedQuestions = questionsRef.current.map(q => q.question);

    // Detect whether the candidate could not answer, so we can apply the
    // 2-attempt rule (give ONE more chance, then move on kindly) instead of
    // drilling the same question over and over.
    const wordCount = recordedAnswer.split(/\s+/).filter(Boolean).length;
    const lowerAnswer = recordedAnswer.toLowerCase();
    const saysDontKnow = /\b(i (?:really |just )?(?:don'?t|do not) know|not sure|no idea|can'?t (?:recall|remember|answer)|don'?t (?:recall|remember)|i'?m not sure|no clue|not aware|please skip|skip this|next question|let'?s move on|move to the next)\b/.test(lowerAnswer);
    const isWeakAnswer = saysDontKnow || wordCount < 8;

    // DIVERSIFIED rotation: each question targets a DIFFERENT competency area so
    // the interview never becomes a chain of near-identical questions. We advance
    // one beat per answered question. 2-attempt rule: a weak answer re-probes the
    // SAME area ONCE (a gentle rephrase/hint); if it is still weak we move on to a
    // fresh area instead of dwelling. Refs are committed only after a valid
    // question is produced (below), so an aborted/errored turn never skips.
    const willRetry = isWeakAnswer && retryRef.current < 1;
    const nextRetry = willRetry ? retryRef.current + 1 : 0;
    const targetBeatIdx = willRetry ? beatIdxRef.current : beatIdxRef.current + 1;
    const area = areaForBeat(targetBeatIdx, {
      durationMin: duration,
      experience,
      type: typeMeta.value,
      roleLabel: interviewRoleLabel,
    });
    // areaForBeat already composes the full focus (role-specific for domain
    // knowledge, experience-specific for the depth probe), so use it directly.
    const areaFocus = area.focus;

    let directive: string;
    if (willRetry) {
      directive = `${firstName} struggled with that question${saysDontKnow ? " (they said they don't know)" : ` (only ${wordCount} words)`}. Give them ONE more chance on the SAME area, but use a genuinely different question and simpler wording. Do not repeat the earlier wording. Keep it warm and encouraging — this is still about "${area.label}".`;
    } else if (isWeakAnswer) {
      directive = `${firstName} could not answer that even after a second attempt — do NOT dwell on it or ask it again. Acknowledge briefly and kindly (something like "No problem, let's move on."), then ask a fresh question on a NEW area. New area — ${area.label}. Focus on: ${areaFocus}.`;
    } else if (area.kind === "warmup") {
      directive = `Keep the conversation warm, personal and flowing — this is the friendly "getting to know you" part of the interview, not a test. Ask about: ${areaFocus} You may briefly and genuinely react to what ${firstName} just said before your question. Ask EXACTLY ONE question, and never one you have already asked.`;
    } else {
      directive = `Now move to a DIFFERENT area to keep the interview varied — do NOT keep drilling the previous topic. New area — ${area.label}. Focus on: ${areaFocus}. You may briefly connect to what they just said, but the question itself must target this new area. Ask a genuinely fresh question you have not asked before.`;
    }

    let response: string;
    // Neutral fallback questions used when the AI stream times out or errors.
    // Defined here so they're available both in the timeout path and the parsing fallback below.

    // Keep the response human-paced without letting a slow model stall the
    // interview. The stream and the minimum conversational pause run in
    // parallel, so fast responses still wait at least three seconds while a
    // slow response has a hard deadline and a useful fallback.
    const naturalPauseMs = (() => {
      const words = recordedAnswer.split(/\s+/).filter(Boolean).length;
      const hesitationMs = /\b(um|uh|well|let me think|actually)\b/i.test(recordedAnswer) ? 250 : 0;
      const base = words < 15 ? 1300 : words <= 50 ? 1550 : 1800;
      return Math.min(2200, Math.max(1200, base + hesitationMs));
    })();
    const turnStartedAt = performance.now();
    const minWaitPromise = new Promise<void>((resolve) => setTimeout(resolve, 1200));
    const STREAM_DEADLINE_MS = 1800;
    let streamTimedOut = false;
    const streamDeadlinePromise = new Promise<string>(resolve =>
      setTimeout(() => { streamTimedOut = true; resolve(""); }, STREAM_DEADLINE_MS)
    );

    setCoachThinking(true);
    try {
      response = await Promise.race([
        stream(
          `You are ${displayCoachName} conducting a friendly but professional ${interviewRoleLabel} interview. ${remainingMin} minutes left.

Candidate: ${firstName} | ${buildProfileSummary()}

DOMAIN EXPERTISE — this is non-negotiable:
You are the subject-matter expert for ${interviewRoleLabel}. Ask questions that a real hiring panel for this exact role would ask. Use the role's real tools, workflows, decisions, risks, metrics, and day-to-day scenarios at the candidate's experience level. Do not substitute generic HR questions when the target area is functional knowledge.
${domainExpertise}

Recent exchanges:
${recentAnswered || "(This is the first response)"}

All questions already asked in this interview:
${askedQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}

Your last question: "${currentQ.question}"
${firstName} answered: "${recordedAnswer}"

${directive}

STYLE — important:
- Warm, encouraging and genuinely personable — you want ${firstName} to relax and enjoy the conversation. Use a light, witty observation only when it genuinely fits; never force a joke, praise, or enthusiasm into every turn.
- Sound like a human interviewer speaking live, not like someone reading a written report. Use contractions, short spoken phrases, varied sentence lengths, and occasional natural bridges such as "Right", "I see", or "And then…". Avoid stiff phrases such as "thank you for sharing", "that's very interesting", "moving forward", "let us delve", and "could you please elaborate" unless the answer truly calls for them.
        - This is a formal interview, not an informal social conversation. Keep every spoken response focused on the interview.
- Do not repeat or closely paraphrase anything in the full asked-question list. Avoid generic prompts such as "Could you elaborate", "Tell me more", "Walk me through that", or "Can you give me a specific example"; ask a fresh, concrete question tied to the new area instead.
 - A brief listening acknowledgement has already been spoken while the answer was being processed. Do not add another stock acknowledgement; move naturally into the question with a short bridge only when it fits.
 - HUMAN MOMENT FOR THIS TURN: ${INTERVIEW_BEHAVIOR_MOMENTS[Math.floor(Math.random() * INTERVIEW_BEHAVIOR_MOMENTS.length)]}
 - Ask EXACTLY ONE fresh question. Make it sound like a real follow-up in the conversation, not a questionnaire or checklist. Use one short sentence of about 8–18 simple words, with one clear idea only. Never join questions with "and", "or", or multiple question marks.
- Do not summarise the whole answer, restate the prompt, announce the competency, or say "moving on to the next section."
- The interview must feel DIVERSIFIED across the whole scorecard — functional/role knowledge, problem-solving, adaptability, ownership & work ethic, collaboration and IT skills, plus their background — not a chain of similar questions. Do NOT keep asking only about functional/domain knowledge; keep moving across the different areas.
- LANGUAGE LEVEL: By default ask in SIMPLE, clear, everyday English — short sentences, common words — because many candidates are from average English-medium colleges. Judge ${firstName}'s own English from their answers so far: if they are clearly fluent and comfortable, you may use richer vocabulary and slightly more complex questions to match them; if they struggle, make your wording even simpler. Never make a question harder to follow than the candidate can handle.
- Use ${firstName}'s name sparingly.
- Plain spoken words ONLY: no markdown, no asterisks, no *actions*, no stage directions, no quotes around your reply.
- The Next line must be the question ONLY — no greeting, no preamble, no name.

Output format — exactly one line, nothing else:
Next: <the interview question only, may start with a short natural bridge>`,
          `You are ${displayCoachName}, ${coach.role}. ${coach.style} ${coach.promptStyle} You are the domain-specialist interviewer for ${interviewRoleLabel}. Treat ${interviewRoleLabel} as the authoritative target role and ask questions grounded in its real work, tools, decisions, risks and success measures. You conduct a professional but warm, personable interview that covers a BROAD range of areas and never fixates on one topic. Speak like a real person in a live interview: use contractions, natural rhythm, short spoken phrases, and simple everyday English. Use full spoken forms for acronyms and business terms where possible (say "R B I", "H R", or "A I", not compressed letter strings). Introduce yourself by name only; never call yourself Sir, Ma'am, or Madam. Keep the tone focused on the interview rather than casual conversation. Avoid scripted corporate phrases, repeated praise, and report-like wording. Use light humour only when it fits; never sarcasm, never at the candidate's expense. Never use markdown or action words.`,
          undefined,
           { maxTokens: 140 }
        ),
        streamDeadlinePromise,
      ]);
    } catch (err) {
      console.error("[Interview Ace] follow-up stream failed", err);
      // Stream threw — inject a fallback so the interview keeps moving (no silent drop).
      const fallback = nextUnusedInterviewQuestion(askedQuestions, area.key, interviewRoleLabel, typeMeta.value, experience);
      response = `Next: ${fallback}`;
    }

    // If the 3.8 s deadline fired OR stream returned empty, cancel the in-flight
    // stream and inject a fallback so the 4 s window is respected.
    if (streamTimedOut || !response.trim()) {
      resetStream();
      const fallback = nextUnusedInterviewQuestion(askedQuestions, area.key, interviewRoleLabel, typeMeta.value, experience);
      response = `Next: ${fallback}`;
    }

    // Keep a short human pause without delaying the next question. The hard
    // stream deadline plus this pause keeps normal replies under three seconds.
    await minWaitPromise;
    if (endingRef.current || phaseRef.current !== "interview") { setCoachThinking(false); return; }
    const remainingPause = Math.min(
      Math.max(0, naturalPauseMs - (performance.now() - turnStartedAt)),
      2200 - (performance.now() - turnStartedAt),
    );
    if (remainingPause > 0) await new Promise<void>((resolve) => setTimeout(resolve, remainingPause));
    if (endingRef.current || phaseRef.current !== "interview") { setCoachThinking(false); return; }

    // If the interview ended while the stream or pause was in flight, stop here.
    if (endingRef.current || phaseRef.current !== "interview") { setCoachThinking(false); return; }

    // Robust parsing — tolerates minor model format drift and missing labels.
    // The short acknowledgement was already spoken while the model streamed,
    // so only the new question should be spoken here.
    const nextMatch = response.match(/^Next:\s*([\s\S]+?)$/im);
    let nextQuestion = nextMatch?.[1]?.trim().replace(/\n+/g, " ");

    // Fallback: if structured parsing failed, split by paragraphs/lines so the
    // interview can continue rather than ending the session.
    if (!nextQuestion && response.trim()) {
      const lines = response.trim().split(/\n+/).map(l => l.replace(/^(Ack:|Next:)\s*/i, "").trim()).filter(Boolean);
      if (lines.length >= 2) {
        nextQuestion = lines[lines.length - 1];
      } else if (lines.length === 1 && lines[0]!.includes("?")) {
        nextQuestion = lines[0];
      }
    }

    // Strip any stray greeting prefix the model sneaks into the question.
    // Covers: "Hello, ..." / "Hi Priya, ..." / "Tell me, Hello — ..." / "Priya, Hello, ..."
    const stripGreeting = (q: string) => {
      let s = q;
      // "Tell me, Hello — ..." or "Tell me, Hi ..."
      s = s.replace(/^Tell\s+me[,\s]+(?:Hello|Hi|Hey)\b[\s,—–-]*/i, "");
      // "Name, Hello, ..." e.g. "Priya, Hello, ..."
      s = s.replace(/^[A-Z][a-z]+[,\s]+(?:Hello|Hi|Hey)\b[\s,—–-]*/i, "");
      // Plain "Hello, ..." / "Hi Priya, ..." / "Hey, ..."
      s = s.replace(/^(?:Hello|Hi|Hey)\b(?:\s+[A-Z][a-z]+)?[\s,—–-]+/i, "");
      // Strip any leftover leading punctuation/dashes after greeting removal
      s = s.replace(/^[\s—–\-:,]+/, "");
      return s.trim();
    };
    if (nextQuestion) nextQuestion = stripGreeting(nextQuestion);
    if (nextQuestion) nextQuestion = keepOneSimpleQuestion(nextQuestion);
    // Capitalise first letter if stripping lowercased it
    if (nextQuestion) nextQuestion = nextQuestion.charAt(0).toUpperCase() + nextQuestion.slice(1);

    // Safety: never let a parsing failure silently end the interview.
    if (!nextQuestion || nextQuestion.split(/\s+/).filter(Boolean).length > 24) {
      nextQuestion = nextUnusedInterviewQuestion(askedQuestions, area.key, interviewRoleLabel, typeMeta.value, experience);
    }

    if (
      isCannedInterviewQuestion(nextQuestion)
      || isRepeatedInterviewQuestion(nextQuestion, askedQuestions)
    ) {
      nextQuestion = nextUnusedInterviewQuestion(askedQuestions, area.key, interviewRoleLabel, typeMeta.value, experience);
    }

    // Speak immediately after the stream or fallback resolves.
    if (endingRef.current || phaseRef.current !== "interview") { setCoachThinking(false); return; }
    setCoachThinking(false);

    // Commit the beat advance + retry counter now that we have a valid question.
    beatIdxRef.current = targetBeatIdx;
    retryRef.current = nextRetry;
    setQuestions(prev => [...prev, { question: nextQuestion! }]);
    setCurrentIdx(prev => prev + 1);
    setAnswer("");
    setIsRecording(false);
    // speech.stop() is intentionally used at the start of a turn to cancel
    // stale capture. Explicitly clear any speaker block before the next
    // continuous listener starts; relying only on the state transition can
    // leave the mic visually active but not actually capturing.
    speech.blockFor(0);
    const pitchVariation = coach.gender === "male" ? 0.88 + Math.random() * 0.06 : 1.06 + Math.random() * 0.06;
    speakCoach(nextQuestion, { voiceGender: coach.gender, voiceStyle: coach.voiceStyle, pitch: pitchVariation });
  }, [currentQ, currentIdx, experience, duration, elapsedSeconds, coach, stream, resetStream, synth, typeMeta, interviewRoleLabel, domainExpertise, buildProfileSummary, buildTranscript, clearAutoSubmitTimer, speech, profile]);

  /**
   * submitCurrentAnswerRef — always points to the latest submitCurrentAnswer.
   * Used in the auto-listen startContinuous callback so the callback closure
   * doesn't need submitCurrentAnswer in deps. Without this, the elapsedSeconds
   * dep in submitCurrentAnswer causes a new reference every second, which makes
   * the auto-listen effect re-run every second and its cleanup clears the 800ms
   * auto-submit timer before it can fire — the user's answer is never submitted.
   */
  const submitCurrentAnswerRef = useRef<typeof submitCurrentAnswer>(submitCurrentAnswer);
  useEffect(() => { submitCurrentAnswerRef.current = submitCurrentAnswer; }, [submitCurrentAnswer]);

  const submitAnswer = useCallback(() => {
    if (!answer.trim() || turnInFlightRef.current) return;
    void submitCurrentAnswer(answer.trim());
  }, [answer, submitCurrentAnswer]);

  const nextQuestion = useCallback(() => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) { setPhase("report"); return; }
    setCurrentIdx(nextIdx);
    setAnswer("");
    setIsRecording(false);
    clearAutoSubmitTimer();
    resetStream();
    // Guard against the 300ms window before speakCoach fires
    setCoachSpeaking(true);
    setTimeout(() => speakCoach(questions[nextIdx]!.question, { voiceGender: coach.gender, voiceStyle: coach.voiceStyle }), 300);
  }, [currentIdx, questions, resetStream, speakCoach, clearAutoSubmitTimer]);

  const endEarly = useCallback(() => {
    endingRef.current = true;
    clearAutoSubmitTimer();
    speech.stop();
    synth.stop();
    stopWebcam();
    setIsRecording(false);
    setAutoListenEnabled(false);
    setPhase("report");
  }, [speech, synth, clearAutoSubmitTimer, stopWebcam]);

  // Keep a live ref to endEarly so the long-interval billing timer below is not
  // torn down every render. endEarly's deps (speech/synth) are fresh objects each
  // render and this page re-renders every second — without the ref the interval
  // would be cleared before a block ever elapses, so ticks would never fire.
  const endEarlyRef = useRef(endEarly);
  useEffect(() => { endEarlyRef.current = endEarly; }, [endEarly]);

  // Release the server-side interview meter when the interview ends (any path to
  // the report) or the user leaves mid-interview, so the "one interview per
  // account at a time" lock frees promptly and the next start isn't rejected.
  const activeUserRef = useRef(user);
  useEffect(() => { activeUserRef.current = user; }, [user]);
  useEffect(() => {
    if (phase === "report" && user) void endInterview(interviewIdRef.current ?? undefined);
  }, [phase, user]);
  useEffect(() => () => { if (activeUserRef.current) void endInterview(interviewIdRef.current ?? undefined); }, []);

  // Meter interview credits by ACTUAL usage: 1 credit per block entered, with the
  // first block already charged at start, so leaving early costs less and a full
  // session costs at most INTERVIEW_MAX_BLOCKS credits. If the balance runs out
  // mid-interview, end gracefully to the report. Guests use free trials, not credits.
  useEffect(() => {
    if (phase !== "interview" || !user) return;
    interviewBlocksChargedRef.current = 1; // block 1 was charged at start
    const blockMs = interviewBlockSeconds(duration) * 1000;
    const id = setInterval(async () => {
      if (phaseRef.current !== "interview" || endingRef.current) return;
      if (interviewBlocksChargedRef.current >= INTERVIEW_MAX_BLOCKS) { clearInterval(id); return; }
      const nextBlock = interviewBlocksChargedRef.current + 1;
      const r = await tickInterview(nextBlock, interviewIdRef.current ?? undefined);
      if (r.ok) {
        interviewBlocksChargedRef.current = nextBlock;
      } else if (r.status === 402 || r.status === 401 || r.status === 409) {
        clearInterval(id);
        if (endingRef.current) return;
        if (r.status === 402) {
          toast({ title: "Credits used up", description: "Wrapping up your interview now. Top up to practise longer next time.", variant: "destructive" });
        }
        endEarlyRef.current();
      }
    }, blockMs);
    return () => clearInterval(id);
  }, [phase, user, duration, toast]);

  useEffect(() => {
    // coachSpeaking guard: don't start mic while the AI coach is speaking — prevents
    // the mic from activating between when the stream ends and when TTS actually starts.
    if (phase !== "interview" || !autoListenEnabled || !speech.isSupported || !currentQ || isStreaming || synth.isSpeaking || isRecording || coachSpeaking) return;
    // Silence window before auto-submit: 5 s. Once the candidate starts
    // talking, this gives room for a natural mid-answer pause without cutting
    // off a sentence.
    // (Initial thinking before the FIRST word is still unlimited — the timer below
    // is only armed once the candidate starts talking.) The Submit button stays
    // enabled the whole time as a manual override to submit sooner.
    const silenceMs = 5000;
    setIsRecording(true);
    // Arm the no-reply watchdog: if the candidate never says a word for 33 s after
    // this question, conclude the interview and generate feedback. Cleared the
    // moment any speech arrives (clearAutoSubmitTimer in the chunk handler clears
    // it too). Clear any stale timer first so a mic restart can't stack two.
    if (noReplyRef.current) clearTimeout(noReplyRef.current);
    noReplyRef.current = setTimeout(() => { concludeNoReplyRef.current(); }, 33_000);
    const handleCandidatePhrase = (text: string) => {
      const chunk = text.trim();
      if (!chunk) return;
      setAnswer(prev => {
        const next = `${prev ? `${prev} ` : ""}${chunk}`.trim();
        answerRef.current = next;
        return next;
      });
      clearAutoSubmitTimer();
      // 5 s of quiet → auto-submit. The Submit button stays enabled as a manual
      // override.
      // Uses submitCurrentAnswerRef (not submitCurrentAnswer directly) so the
      // closure always calls the latest version without adding submitCurrentAnswer
      // to deps. Without this, elapsedSeconds (a dep of submitCurrentAnswer) gives
      // it a new reference every second → effect re-runs every second → cleanup
      // fires clearAutoSubmitTimer() before it elapses → answer never submitted.
      autoSubmitRef.current = setTimeout(() => {
        const latest = answerRef.current.trim();
        if (latest) void submitCurrentAnswerRef.current(latest);
      }, silenceMs);
    };
    resumeInterviewListeningRef.current = () => {
      if (phaseRef.current !== "interview" || !autoListenEnabled || endingRef.current) return;
      setIsRecording(true);
      speech.startContinuous(handleCandidatePhrase);
    };
    speech.startContinuous(handleCandidatePhrase);
    // No clearAutoSubmitTimer in cleanup: timer must survive normal dep changes.
    // Unmount cleanup is handled by the dedicated effect above. Clearing here
    // would cancel in-flight auto-submits whenever any dep ticks (e.g. speech.status).
  }, [phase, currentQ, autoListenEnabled, speech.isSupported, speech.startContinuous, isStreaming, synth.isSpeaking, isRecording, coachSpeaking, clearAutoSubmitTimer]);

  // Interim speech means the candidate is still talking, even before the
  // browser emits a final chunk. Cancel a pending submit immediately so a
  // long answer cannot be cut off mid-sentence.
  useEffect(() => {
    if (speech.interimTranscript.trim() && isRecording) clearAutoSubmitTimer();
  }, [speech.interimTranscript, isRecording, clearAutoSubmitTimer]);

  // Watchdog: if isRecording is true but the recognition has silently died
  // (speech status is "idle" for 4+ seconds while nothing else is blocking),
  // reset isRecording so the auto-listen effect above retries startContinuous.
  useEffect(() => {
    if (phase !== "interview" || !autoListenEnabled) return;
    const id = setInterval(() => {
      if (
        isRecording &&
        speech.status === "idle" &&
        !coachSpeaking &&
        !synth.isSpeaking &&
        !isStreaming
      ) {
        setIsRecording(false); // triggers auto-listen effect to restart mic
      }
    }, 4_000);
    return () => clearInterval(id);
  }, [phase, autoListenEnabled, isRecording, speech.status, coachSpeaking, synth.isSpeaking, isStreaming]);

  // Generate detailed report when entering report phase
  useEffect(() => {
    if (phase !== "report" || report || isGeneratingReport) return;
    const answered = questions.filter(q => q.answer);
    setIsGeneratingReport(true);

    const generate = async () => {
      const transcript = answered.length > 0
        ? answered
            .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer ?? ""}`)
            .join("\n\n")
        : "(The candidate did not provide any answer before the interview ended. Give honest, clearly labelled feedback about insufficient evidence and recommend practising a complete response.)";

      // Build the covered-competency list + JSON template for THIS interview
      // length so the model only scores what the format actually covers.
      const covered = coveredCompetencies(duration);
      const compLines = covered
        .map((c) => {
          const focus =
            c.key === "domainKnowledge"
              ? `${c.focus} — ${domainExpertise}`
              : c.focus;
          return `- "${c.key}" — ${c.label} (weight ${Math.round(c.weight * 100)}%): ${focus}`;
        })
        .join("\n");
      const compJsonKeys = covered
        .map((c) => `    "${c.key}": {"rating": 1-5, "comment": "one concise sentence citing specific evidence from the transcript"}`)
        .join(",\n");

      const reportText = await stream(
        `You are an expert interview panellist scoring a mock interview against a structured, weighted competency scorecard.

Role: ${interviewRoleLabel}
Candidate experience level: ${experience}
Interview length: ${duration} minutes (${formatTime(elapsedSeconds)} used)
Profile: ${buildProfileSummary()}

CALIBRATION — read carefully: ${calibrationFor(experience)}

Rate each competency on this 1-5 scale, calibrated to the experience level above:
1 = Considerable improvement, 2 = Moderate improvement, 3 = Meets expectations, 4 = Exceeds expectations, 5 = Outstanding.

Score ALL of these competencies for this candidate — every parameter must be rated:
${compLines}

Full interview transcript:
${transcript}

Return ONLY a valid JSON object with exactly these keys (no markdown, no commentary before or after):
{
  "competencies": {
${compJsonKeys}
  },
  "hiringSummary": "2-3 sentences for a recruiter: what the candidate demonstrated for this exact role, at this experience level, and the decision confidence",
  "evidenceQuality": "High | Medium | Low",
  "authenticitySignals": ["2-4 observable signals such as specific examples, ownership language, measurable detail, consistency, or thoughtful uncertainty — never call these proof of honesty"],
  "evidenceLimitations": ["1-4 important gaps, untested areas, vague claims, or transcript limitations that reduce decision confidence"],
  "followUpChecks": ["2-4 targeted questions or practical checks for a human next round"],
  "recommendedNextStep": "one practical next action for the candidate or recruiter",
  "roleFit": "one honest sentence about this candidate for the ${interviewRoleLabel} role they interviewed for",
  "bestFitRole": "name the ONE job role or job title that best fits this candidate based on their interests, motivation, strengths and answers — it may be the same as the role they interviewed for or a different one — with a short reason, one sentence",
  "strengths": ["2-3 specific strengths observed in the transcript"],
  "concerns": ["2-3 honest concerns or red flags — use an empty array [] ONLY if there are genuinely none"],
  "nextSteps": ["3 concrete, actionable steps to improve"],
  "verdictReason": "1-2 honest sentences summarising your hiring recommendation for THIS role at THIS experience level and why"
}

Rate EVERY competency above from evidence in the transcript, calibrated to the experience level — do not leave any unrated. Communication Skills and Personality & Disposition are judged from HOW the candidate expressed every answer (tone, energy, clarity), not from dedicated questions; you cannot see the candidate, so judge personality from vocal energy and content only and never invent visual details like body language, dress or eye contact. Educational Background comes from their introduction. If a competency was only lightly tested in this interview, infer conservatively from the overall conversation and say so in its comment rather than guessing high. Evaluate role-relevant clarity, reasoning, relevance, professionalism, problem-solving and knowledge — not accent, nationality, regional pronunciation, or minor grammar slips. A non-native or Indian accent must never reduce a score when the answer is understandable; grammar matters only when it materially obscures meaning. Be fair, specific and honest — never inflate a candidate who lacks the core functional knowledge for the role. When naming the best-fit role, weigh the candidate's stated interests, motivation and strengths (including the early getting-to-know-you answers), not only their functional depth. Use Indian and globally common hiring standards.

IMPORTANT REPORT GENUINENESS RULES: This is a transcript-based coaching simulation, not a lie detector, background check, or final hiring decision. Never claim that a candidate is honest, dishonest, genuine, deceptive, or culturally fit as a fact. "Authenticity signals" must describe observable answer behaviour only: specific examples, ownership, measurable outcomes, consistency, reflection, or appropriate uncertainty. "Evidence limitations" must name what was not demonstrated. Low evidence quality is appropriate when there are too few answers, vague answers, heavy transcription uncertainty, or a short interview. Do not convert confidence, fluency, accent, eye contact, personality style, or speaking speed into an honesty judgement. Keep hiring recommendations conditional and explain what a human panel should verify.

PROFILE AND TRANSCRIPT CONFLICTS: If the profile says Fresher but the candidate claims years of experience, report this neutrally as "profile/transcript inconsistency requiring verification." Do NOT call it misrepresentation, dishonesty, a credibility gap, or a red flag unless the transcript contains direct, repeated evidence of intentional deception — and even then recommend human verification rather than deciding guilt. Do not reduce integrity, personality, or ownership scores because of a profile-field mismatch. Score the demonstrated answer content separately from the accuracy of the stored profile.

TRANSCRIPT QUALITY AND FAIRNESS: Speech-to-text can omit words, merge phrases, or produce nonsense. Do not treat transcription artefacts, incomplete auto-captions, pauses, hesitation, accent, pronunciation, fluency, grammar, speaking speed, or nervousness as proof of poor character or lack of experience. Score communication only when the intended meaning is reasonably clear from the full answer. If meaning is uncertain, lower evidence quality and ask a follow-up question rather than inventing what the candidate meant. Do not recommend a low-skill role such as Data Entry solely because a voice transcript was unclear.

HIRING DECISION CALIBRATION: A ten-minute practice interview cannot establish that someone is "not fit at any experience level." Make the recommendation conditional on this interview and the selected role/experience benchmark. A No Hire recommendation must cite role-critical evidence and proposed verification steps, not a profile mismatch alone. Best-fit roles must be supported by stated experience or interests; if evidence is insufficient, say "not enough evidence to recommend an alternative role" instead of inventing one.`,
          `You are a senior hiring manager and ${interviewRoleLabel} domain panellist evaluating an Indian candidate against a weighted scorecard. Give human, realistic, honest feedback and rate strictly on the 1-5 scale. Judge role fit against ${interviewRoleLabel}, not against a generic job. Do not penalise Indian accents, non-native English, or minor grammar errors unless meaning is genuinely unclear. Use evidence-based hiring language suitable for India and overseas employers, and clearly separate demonstrated evidence from assumptions and follow-up checks.`,
        undefined,
        { maxTokens: 2000 }
      );

      const parsed = parseReportJson(reportText, duration) ?? neutralReport(duration);

      // Per-question feedback is ALWAYS fetched in a separate, focused call.
      // Keeping it out of the main report keeps that JSON small, so the overall
      // scores and competencies never get lost to truncation (the old cause of a
      // uniform-60 fallback when a long questionScores array overflowed the cap).
      {
        const fbText = await stream(
          `You are an interview coach. For each answer below, give a 2-3 sentence honest, natural, specific feedback.

${answered.map((q, i) => `Q${i + 1}: ${q.question}\nAnswer: ${q.answer ?? ""}`).join("\n\n")}

Judge the answer's relevance, reasoning, role knowledge, professionalism and clarity. Do not penalise an Indian or non-native accent, and do not lower grammar just for minor errors that do not obscure meaning. Return ONLY a valid JSON array (no markdown) with one object per question in order:
[{"score":1-10,"communication":1-10,"grammar":1-10,"confidence":1-10,"technical":1-10,"feedback":"2-3 sentences"}]`,
          `You are a concise interview evaluator. Be honest, specific, and encouraging.`,
          undefined,
          { maxTokens: 2000 }
        );
        let cleaned = fbText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const firstBracket = cleaned.indexOf("[");
        const lastBracket = cleaned.lastIndexOf("]");
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          cleaned = cleaned.slice(firstBracket, lastBracket + 1);
        }
        try {
          const arr = JSON.parse(cleaned) as Array<Record<string, unknown>>;
          if (Array.isArray(arr)) {
            parsed.questionScores = arr.map(qs => ({
              score: Math.min(10, Math.max(1, Number(qs["score"]) || 5)),
              communication: Math.min(10, Math.max(1, Number(qs["communication"]) || 5)),
              grammar: Math.min(10, Math.max(1, Number(qs["grammar"]) || 5)),
              confidence: Math.min(10, Math.max(1, Number(qs["confidence"]) || 5)),
              technical: Math.min(10, Math.max(1, Number(qs["technical"]) || 5)),
              feedback: String(qs["feedback"] || ""),
            }));
          }
        } catch { /* keep without per-question scores */ }
      }

      // Populate per-question feedback from report questionScores
      let updatedAnswered = answered;
      if (parsed.questionScores && parsed.questionScores.length > 0) {
        updatedAnswered = answered.map((q, i) => {
          const qs = parsed.questionScores![i];
          if (!qs) return q;
          return { ...q, feedback: qs.feedback, score: qs.score, communication: qs.communication, grammar: qs.grammar, confidence: qs.confidence, technical: qs.technical };
        });
        // Use index-based mapping so text-match failures don't drop feedback
        setQuestions(prev => {
          let feedbackIdx = 0;
          return prev.map(q => {
            if (!q.answer) return q;
            const updated = updatedAnswered[feedbackIdx++];
            return updated ?? q;
          });
        });
      }

      setReport(parsed);
      setIsGeneratingReport(false);
      await saveSession(parsed, updatedAnswered);
    };

    void generate();
  }, [phase, report, isGeneratingReport, questions, interviewRoleLabel, domainExpertise, typeMeta, experience, elapsedSeconds, duration, stream, buildProfileSummary]);

  const saveSession = useCallback(async (reportData: InterviewReport, answered: QA[]) => {
    if (saved) return;
    setIsSaving(true);
    const durationSeconds = elapsedSeconds;
    const payload = {
      role: interviewRoleLabel,
      experienceLevel: experience,
      interviewType: typeMeta.label,
      questionsData: JSON.stringify(answered),
      overallScore: reportData.overallScore,
      durationSeconds,
      feedbackJson: JSON.stringify(reportData),
      communicationScore: reportData.communicationScore,
      grammarScore: reportData.grammarScore,
      confidenceScore: reportData.confidenceScore,
      technicalScore: reportData.technicalScore,
    };

    // Save to localStorage as fallback / offline
    try {
      const key = "edubharat_interview_sessions";
      const existing = JSON.parse(localStorage.getItem(key) || "[]") as Array<Record<string, unknown>>;
      existing.unshift({ ...payload, savedAt: new Date().toISOString(), local: true });
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
    } catch { /* ignore */ }

    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    if (b2bToken) {
      // B2B: submit to the recruiter endpoint (works for both guests and logged-in users)
      try {
        const res = await fetch(`${base}/api/b2b/invite/${b2bToken}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...payload, candidateName: profile.name || undefined }),
        });
        if (!res.ok) throw new Error("B2B submit failed");
        toast({ title: "Interview submitted", description: "Your results have been shared with the company." });
      } catch {
        toast({ title: "Could not submit results", description: "Your report was saved locally.", variant: "destructive" });
      }
    } else if (user) {
      try {
        const res = await fetch(`${base}/api/sessions/interview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Server save failed");
        // Account sync is intentionally silent: the report page already shows
        // the saved state, and a toast obscures the report on mobile browsers.
      } catch {
        toast({ title: "Saved locally", description: "Report saved on this device. Sign in to sync across devices.", variant: "destructive" });
      }
    }
    setSaved(true);
    setIsSaving(false);
  }, [saved, elapsedSeconds, interviewRoleLabel, experience, user, toast]);

  const downloadReport = useCallback(() => {
    const label = typeMeta.label;
    const answered = questions.filter(q => q.answer);
    const durationMin = Math.round(elapsedSeconds / 60);
    const avgScore = avgOf(answered.map(q => q.score)) * 10;
    const lines = [
      `LEAD ONTO — INTERVIEW ACE REPORT`,
      `Coach: ${displayCoachName} (${coach.role})`,
      `Role: ${label} | Experience: ${experience} | Duration: ${durationMin} min`,
      `Date: ${new Date().toLocaleDateString("en-IN")}`,
      report ? `Total Weighted Score: ${report.weightedScore.toFixed(1)} / 5.0 (${report.overallScore}%) — ${report.recommendation}` : `Overall Score: ${avgScore}% — ${grade(avgScore).label}`,
      report ? `Result: ${verdictFor(report.overallScore).label}${report.verdictReason ? ` — ${report.verdictReason}` : ""}` : `Result: ${verdictFor(avgScore).label}`,
      report?.hiringSummary ? `Hiring Summary: ${report.hiringSummary}` : "",
      report?.evidenceQuality ? `Evidence Quality: ${report.evidenceQuality} (transcript-based; not a lie detector)` : "",
      report ? `Role Fit: ${report.roleFit}` : "",
      report && report.bestFitRole ? `Best-Fit Role: ${report.bestFitRole}` : "",
      ``,
      ...(report?.authenticitySignals?.length ? [
        `OBSERVABLE AUTHENTICITY SIGNALS (not proof of honesty)`,
        ...report.authenticitySignals,
        ``,
      ] : []),
      ...(report?.evidenceLimitations?.length ? [
        `EVIDENCE LIMITATIONS`,
        ...report.evidenceLimitations,
        ``,
      ] : []),
      ...(report?.followUpChecks?.length ? [
        `HUMAN FOLLOW-UP CHECKS`,
        ...report.followUpChecks,
        ``,
      ] : []),
      ...(report?.competencies ? [
        `COMPETENCY SCORECARD (rated 1-5)`,
        ...COMPETENCIES.filter(c => report.competencies![c.key]).map(c => {
          const cr = report.competencies![c.key]!;
          return `${c.label} (${Math.round(c.weight * 100)}%): ${cr.rating}/5 — ${ratingLabel(cr.rating)}${cr.comment ? ` — ${cr.comment}` : ""}`;
        }),
        ``,
      ] : []),
      `STRENGTHS`,
      ...(report ? report.strengths : []),
      ``,
      `CONCERNS / RED FLAGS`,
      ...(report ? (report.concerns.length ? report.concerns : ["None noted."]) : []),
      ``,
      `NEXT STEPS`,
      ...(report ? report.nextSteps : []),
      ``,
      `QUESTION-BY-QUESTION`,
      ...answered.map((q, i) => [
        `Q${i + 1}: ${q.question}`,
        `Your Answer: ${q.answer ?? ""}`,
        `Score: ${q.score ?? "N/A"}/10`,
        ...(q.communication !== undefined ? [`  Communication: ${q.communication}/10 | Grammar: ${q.grammar}/10 | Confidence: ${q.confidence}/10 | Technical: ${q.technical}/10`] : []),
        `Feedback:\n${q.feedback ?? ""}`,
        "",
      ].join("\n")),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-${label.toLowerCase().replace(/ /g, "-")}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [questions, type, experience, elapsedSeconds, typeMeta, coach, report]);

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <>
      <div className="container mx-auto w-full min-w-0 max-w-full px-4 max-w-4xl pt-3 pb-4 overflow-x-hidden">
        {/* Compact header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-display font-bold text-secondary leading-tight">Interview Ace</h1>
            <p className="text-xs text-muted-foreground">AI mock interviews · Voice-powered · India-focused</p>
          </div>
        </div>
        <MobilePrimaryCTA label="Start Free Mock Interview" onClick={() => void startSession()} />

        {/* Settings bar */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-sm font-semibold text-secondary truncate">
            {profile.name || user?.name || "Guest"}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v);
               // Role never infers seniority. Ask the candidate again whenever
               // they change the role so the benchmark is intentional.
               setExperience("");
              // Re-match the interviewer to the new type (unless a B2B invite locked it).
              if (!b2bParams.coach) setCoach(recommendedCoachFor(v));
            }}
          >
            <SelectTrigger className="h-7 text-xs w-[150px] rounded-full border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={experience}
            onValueChange={(v) => {
              setExperience(v);
            }}
          >
            <SelectTrigger className={`h-7 text-xs w-[130px] rounded-full border-dashed ${!experience ? "border-primary text-primary" : ""}`}>
              <SelectValue placeholder="Select experience" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          {!experience && (
            <span className="basis-full text-xs font-semibold text-primary">
              Select your experience level for this {INTERVIEW_TYPES.find(t => t.value === type)?.label ?? "role"} interview.
            </span>
          )}
          <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
            <SelectTrigger className="h-7 text-xs w-[110px] rounded-full border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Coach grid — compact. The selected role determines the domain specialist. */}
        <div className="flex items-baseline gap-2 mb-2 flex-wrap">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Interviewer</p>
          <span className="text-[10px] font-medium text-muted-foreground/70 normal-case">
            {coachLocked ? "Set by the recruiter for this invite" : `Domain specialist for ${interviewRoleLabel}`}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
          {INTERVIEW_COACHES.map(c => (
            <button
              key={c.id}
              onClick={() => { if (!coachLocked && c.id === recommendedCoachId) setCoach(c); }}
              disabled={coachLocked ? coach.id !== c.id : c.id !== recommendedCoachId}
              className={`text-left rounded-xl border-2 p-3 transition-all ${
                coach.id === c.id
                  ? "border-primary shadow-md bg-primary/5"
                    : (coachLocked || c.id !== recommendedCoachId)
                    ? "border-border bg-card opacity-40 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <AnimatedAvatar
                  name={c.name}
                  subtitle={c.role}
                  isSpeaking={false}
                  gender={c.gender}
                  size="sm"
                  imageSrc={c.imageSrc}
                />
                {coach.id === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
              </div>
              <p className="font-bold text-xs text-secondary truncate">{c.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs">{c.icon}</span>
                <span className="text-[10px] font-semibold text-muted-foreground truncate">{c.specialty}</span>
              </div>
              {c.id === recommendedCoachId && (
                <span className="mt-1 inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  Recommended
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Inline start bar */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-secondary truncate">
              {typeMeta.icon} {typeMeta.label} · {experience} · {duration} min · {displayCoachName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user ? (
                <>Up to <span className="font-semibold text-secondary">{interviewCost} credits</span> · billed by the minute · Balance: <span className="font-semibold">{balance ?? "…"}</span> · <Link href="/credits" className="text-primary font-semibold hover:underline">Top up</Link></>
              ) : guestInterviewsRemaining > 0 ? (
                <><span className="font-semibold text-green-700">{guestInterviewsRemaining} free {guestInterviewsRemaining === 1 ? "interview" : "interviews"}</span> left · <Link href="/login?returnTo=%2Finterview-ace" className="text-primary font-semibold hover:underline">Sign in</Link> for 20 free credits</>
              ) : (
                <>Free interviews used up · <Link href="/login?returnTo=%2Finterview-ace" className="text-primary font-semibold hover:underline">Sign in</Link> for 20 free credits</>
              )}
            </p>
          </div>
          <Button className="shrink-0 font-bold shadow-md shadow-primary/20" onClick={startSession} disabled={isStreaming || !experience}>
            {isStreaming
              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Preparing…</>
              : <><PlayCircle className="w-4 h-4 mr-1.5" />Begin</>}
          </Button>
        </div>
      </div>
      {showCreditGate && <CreditGate onClose={() => setShowCreditGate(false)} isLoggedIn={!!user} />}
      </>
    );
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  if (phase === "report") {
    const answered = questions.filter(q => q.answer);
    const avgScore = avgOf(answered.map(q => q.score)) * 10;
    const durationMin = Math.round(elapsedSeconds / 60);
    const g = grade(avgScore); // fallback styling used only when there is no AI report

    return (
      <div className="min-h-full container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl space-y-4 sm:space-y-6 overflow-x-hidden">
        <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-background/95 backdrop-blur-sm flex justify-start">
          <Button
            onClick={() => { endingRef.current = true; setPhase("setup"); setQuestions([]); setReport(null); setSaved(false); }}
            className="w-full sm:w-auto font-bold shadow-md"
          >
            <PlayCircle className="w-4 h-4 mr-2" />New Session
          </Button>
        </div>
        {/* Hero */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AnimatedAvatar name={displayCoachName} subtitle={coach.role} isSpeaking={false} gender={coach.gender} size="lg" imageSrc={coach.imageSrc} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-secondary mt-2 mb-3">Interview Complete!</h1>

          {report ? (
            <>
              {(() => {
                const style = RECOMMENDATION_STYLES[report.recommendation];
                return (
                  <div className={`w-full max-w-md justify-center inline-flex items-center gap-3 sm:gap-4 px-3 sm:px-6 py-4 rounded-2xl border-2 ${style.badge}`}>
                    <div className="text-left leading-none">
                      <span className={`text-4xl sm:text-5xl font-extrabold ${style.text}`}>{report.weightedScore.toFixed(1)}</span>
                      <span className={`text-lg sm:text-xl font-bold ${style.text}`}> / 5.0</span>
                    </div>
                    <div className="text-left border-l-2 pl-4">
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>Recommendation</div>
                      <div className={`text-base sm:text-lg font-extrabold break-words ${style.text}`}>{report.recommendation}</div>
                      <div className={`text-xs font-semibold ${style.text} opacity-80`}>{report.overallScore}% overall</div>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const v = verdictFor(report.overallScore);
                return (
                  <div className="mt-4">
                    <div className={`max-w-full inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full font-bold text-sm border-2 ${v.selected ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}`}>
                      {v.selected ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      Result: {v.label}
                    </div>
                    {report.verdictReason && (
                      <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">{report.verdictReason}</p>
                    )}
                    {report.roleFit && (
                      <p className="text-sm text-secondary mt-2 max-w-xl mx-auto italic">{report.roleFit}</p>
                    )}
                    {report.bestFitRole && (
                      <p className="text-sm text-secondary mt-2 max-w-xl mx-auto">
                        <span className="font-semibold">Best-fit role:</span> {report.bestFitRole}
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl border-2 ${g.bg}`}>
              <span className={`text-5xl font-extrabold ${g.color}`}>{avgScore}</span>
              <div className="text-left">
                <div className={`text-xs font-bold uppercase tracking-wider ${g.color}`}>Overall Score</div>
                <div className={`text-lg font-bold ${g.color}`}>{g.label}</div>
              </div>
            </div>
          )}

          <p className="text-muted-foreground mt-3 text-sm">
            {typeMeta.icon} {typeMeta.label} · {experience} · {answered.length} questions · {durationMin} min · with {displayCoachName}
          </p>
        </div>

        {isGeneratingReport && !report && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Generating your detailed interview report...</p>
          </div>
        )}

        {report && (
          <>
            <Card className="border-primary/20 bg-primary/[0.03] shadow-sm">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Hiring panel summary
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Evidence-based guidance for the selected {interviewRoleLabel} role at {experience} level
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <p className="text-sm leading-relaxed text-secondary">
                  {report.hiringSummary || report.verdictReason || "The report is based only on the answers captured in this practice interview."}
                </p>
                {report.recommendedNextStep && (
                  <div className="rounded-xl border border-primary/15 bg-background/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Recommended next step</p>
                    <p className="text-sm text-secondary">{report.recommendedNextStep}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Evidence & authenticity signals
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {report.evidenceQuality ?? "Medium"} evidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  <p className="text-xs text-muted-foreground mb-2">
                    Observable answer behaviour only — this is not a lie detector or background check.
                  </p>
                  <ul className="space-y-2">
                    {(report.authenticitySignals?.length ? report.authenticitySignals : ["Review specific examples and measurable outcomes in a human interview."]).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />{item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-4 h-4" />
                    Gaps & decision limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  <ul className="space-y-2">
                    {(report.evidenceLimitations?.length ? report.evidenceLimitations : ["A practice transcript cannot verify employment history, references, qualifications, or real-world performance."]).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                        <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />{item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {!!report.followUpChecks?.length && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    Human follow-up checks
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use these checks in the next round before making a hiring decision.
                  </p>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  <ol className="space-y-2 list-decimal list-inside text-sm text-secondary">
                    {report.followUpChecks.map((item, i) => <li key={i}>{item}</li>)}
                  </ol>
                </CardContent>
              </Card>
            )}

            {report.competencies && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Competency Scorecard
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rated 1–5 · weighted to a {report.weightedScore.toFixed(1)} / 5.0 total for this {durationMin}-min interview
                  </p>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  {COMPETENCIES.filter(c => report.competencies![c.key]).map(c => {
                    const cr = report.competencies![c.key]!;
                    return (
                      <div key={c.key}>
                        <div className="flex items-center justify-between mb-1.5 gap-3">
                          <span className="text-sm font-bold text-secondary">
                            {c.label}
                            <span className="text-xs font-medium text-muted-foreground ml-1.5">{Math.round(c.weight * 100)}%</span>
                          </span>
                          <span className="text-xs font-bold text-secondary whitespace-nowrap">{cr.rating}/5 · {ratingLabel(cr.rating)}</span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className={`h-2 flex-1 rounded-full ${n <= cr.rating ? "bg-primary" : "bg-muted"}`} />
                          ))}
                        </div>
                        {cr.comment && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{cr.comment}</p>}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 pt-4 sm:pt-5 px-4 sm:px-5">
                  <CardTitle className="text-base flex items-center gap-2 text-green-700">
                    <Star className="w-4 h-4" />Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  <ul className="space-y-2">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />{s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-2 pt-4 sm:pt-5 px-4 sm:px-5">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-4 h-4" />Concerns / Red Flags
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5">
                  {report.concerns.length > 0 ? (
                    <ul className="space-y-2">
                      {report.concerns.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                          <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />{s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No significant concerns noted — a clean interview.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2 pt-4 sm:pt-5 px-4 sm:px-5">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />Personalised Learning Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-5">
                <ol className="space-y-2 list-decimal list-inside text-sm text-secondary">
                  {report.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </CardContent>
            </Card>
          </>
        )}

        {!report && !isGeneratingReport && (
          <Card className="border shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">Could not generate a detailed report. Per-question feedback is still available below.</p>
            </CardContent>
          </Card>
        )}

        {/* Per-question review */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Question-by-Question</h2>
            {answered.map((q, i) => <QuestionReview key={i} q={q} idx={i} coachName={displayCoachName} hasReport={!!report} />)}
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3 justify-center flex-wrap pb-6">
          <Button className="w-full sm:w-auto" variant="outline" onClick={downloadReport}>
            <Download className="w-4 h-4 mr-2" />Download Report
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant={saved ? "secondary" : "default"}
            onClick={() => report && saveSession(report, answered)}
            disabled={isSaving || saved || !report}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saved ? "Saved" : isSaving ? "Saving..." : "Save Report"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Interview — Video Call Mode ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-50 text-slate-900 flex flex-col z-[9999]" style={{ top: 56 }}>

      {/* ── Top HUD ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-800 text-sm font-bold truncate">{displayCoachName}</span>
          <span className="text-slate-500 text-xs truncate">· {typeMeta.icon} {typeMeta.label} · {experience}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 text-sm font-bold shrink-0">
          <Timer className="w-4 h-4 text-orange-400" />
          <span className={elapsedSeconds >= duration * 60 - 30 ? "text-red-500" : ""}>
            {formatTime(elapsedSeconds)} / {duration}:00
          </span>
        </div>
      </div>

      {/* ── Progress bar under HUD ──────────────────────────────────────── */}
      <div className="shrink-0 h-0.5 bg-orange-100 z-10">
        <div
          className={`h-full transition-all ${elapsedSeconds >= duration * 60 - 30 ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${Math.min(100, (elapsedSeconds / (duration * 60)) * 100)}%` }}
        />
      </div>

      {/* ── Main video area — Meet-style stage: the candidate is the main
          video and the interviewer stays visible in a picture-in-picture tile. ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-3 sm:px-4 pt-3 gap-2">
        <div className="relative flex-1 min-h-[150px] rounded-2xl bg-gradient-to-br from-sky-50 via-white to-orange-50 border border-slate-200 shadow-md overflow-hidden">

          {/* Candidate display — anchored to the left, with the light
              background intentionally visible between both participants. */}
          <div className="absolute left-3 top-3 bottom-3 w-[46%] sm:w-[48%] rounded-xl bg-black border border-slate-300 shadow-sm overflow-hidden">
            {cameraOn ? (
              <video
                ref={webcamRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
                style={{ transform: "scaleX(-1)" }}
                onLoadedMetadata={e => { (e.target as HTMLVideoElement).play().catch(() => {}); }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                <VideoOff className="w-10 h-10 text-gray-500" />
                <span className="text-sm text-slate-400">{cameraError ? "No camera" : "Camera off"}</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 text-xs font-bold text-white bg-black/55 rounded-full px-2.5 py-1">
              {candidateDisplayName}
            </div>
            <button
              className="absolute top-3 right-3 z-10"
              onClick={cameraOn ? stopWebcam : () => void startWebcam()}
              title={cameraOn ? "Turn off camera" : "Enable camera (optional)"}
            >
              <span className="bg-black/55 text-white text-[10px] px-2 py-1 rounded-full hover:bg-black/75 transition-colors">
                {cameraOn ? "📷 Off" : "📷 Enable"}
              </span>
            </button>
          </div>

          {/* Interviewer picture-in-picture */}
          <div className="absolute right-3 top-3 bottom-3 z-10 w-[46%] sm:w-[48%] rounded-xl bg-white/95 border border-slate-200 shadow-xl flex flex-col items-center justify-center gap-1 p-2 overflow-hidden">
            <div
              className={`rounded-full transition-all duration-300 shrink-0 ${synth.isSpeaking ? "cursor-pointer" : ""}`}
              style={synth.isSpeaking ? { boxShadow: "0 0 0 10px rgba(249,115,22,0.12), 0 0 0 20px rgba(249,115,22,0.06)" } : {}}
              onClick={synth.isSpeaking ? interruptCoach : undefined}
              role={synth.isSpeaking ? "button" : undefined}
              aria-label={synth.isSpeaking ? "Tap to interrupt and respond" : undefined}
            >
              <AnimatedAvatar
                name={displayCoachName}
                subtitle={coach.role}
                isSpeaking={synth.isSpeaking}
                isThinking={isStreaming || coachThinking}
                gender={coach.gender}
                size="xl"
                imageSrc={coach.imageSrc}
                hideCaption
              />
            </div>

            {/* Voice visualiser bars — heights track the coach's ACTUAL live
                audio loudness (same signal driving lip-sync), not a fixed
                CSS pulse, so the bars genuinely move with what's being said. */}
            {synth.isSpeaking && (
              <>
                <div className="flex items-end gap-1 h-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                    // Stagger each bar slightly off the shared amplitude so the
                    // row reads as a waveform, not seven identical bars.
                    const wobble = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + mouth.width * 3));
                    const h = Math.max(2, Math.round(mouth.openness * 14 * wobble));
                    return (
                      <div
                        key={i}
                  className="w-1.5 rounded-full bg-orange-400"
                        style={{ height: h, transition: "height 60ms linear" }}
                      />
                    );
                  })}
                </div>
                  <button
                  type="button"
                  onClick={interruptCoach}
                   className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2"
                >
                  Tap to interrupt
                </button>
              </>
            )}
            {(isStreaming || coachThinking) && !synth.isSpeaking && (
              <p className="text-slate-500 text-[10px] animate-pulse">{displayCoachName} is thinking…</p>
            )}
            <p className="text-slate-800 text-[10px] font-semibold truncate max-w-full">{displayCoachName}</p>
          </div>
        </div>

        {/* Current question — light card, reduced text size, scrolls internally
            if a question is very long. */}
        {currentQ && (
          <div className="shrink-0 pb-1">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 max-w-2xl mx-auto text-center max-h-[18vh] overflow-y-auto shadow-sm">
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">
                Question {currentIdx + 1} · {answeredCount} answered
              </p>
              <p className="text-slate-800 text-xs sm:text-sm font-semibold leading-snug">{currentQ.question}</p>
              <button
                className="mt-1.5 text-primary/70 hover:text-primary text-[11px] flex items-center gap-1 mx-auto"
                onClick={() => speakCoach(currentQ.question, { voiceGender: coach.gender, voiceStyle: coach.voiceStyle, pitch: coach.gender === "male" ? 0.88 : 1.08 })}
              >
                <Volume2 className="w-3 h-3" /> Repeat question
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom answer + controls ─────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-slate-200 px-4 pt-2 pb-2 space-y-2 shadow-[0_-4px_16px_rgba(15,23,42,0.05)]">
        <Textarea
          ref={answerTextareaRef}
          placeholder="Speak naturally — mic starts automatically. You can also use your native language."
          className={`min-h-[28px] max-h-[8vh] text-sm resize-none bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus-visible:ring-primary ${
            isRecording ? "border-green-500/50" : ""
          }`}
          value={isRecording && speech.interimTranscript ? answer + " " + speech.interimTranscript : answer}
          onChange={e => !isRecording && setAnswer(e.target.value)}
        />

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mic status pill */}
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 transition-colors ${
            isRecording
              ? speech.status === "warming"
                ? "bg-amber-100 text-amber-700 border border-amber-300"
                : speech.status === "processing"
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-green-100 text-green-700 border border-green-300"
              : "bg-slate-100 text-slate-500"
          }`}>
            {isRecording ? <span className="h-2 w-2 rounded-full bg-current animate-pulse" /> : <MicOff className="w-3 h-3" />}
            {isRecording
              ? speech.error
                ? speech.error
                : speech.status === "processing"
                ? "Processing…"
                : "Listening…"
              : speech.isSupported
                ? "Mic paused"
                : "No mic"}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRecording}
            disabled={!speech.isSupported}
            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs shrink-0"
          >
            {autoListenEnabled ? "Pause mic" : "Resume mic"}
          </Button>

          {isRecording && speech.error && (
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-xs shrink-0"
              onClick={async () => {
                if (navigator.mediaDevices?.getUserMedia) {
                  try {
                    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    micStream.getTracks().forEach(track => track.stop());
                  } catch {
                    toast({
                      title: "Microphone still unavailable",
                      description: "Allow the microphone in browser site settings, then try again.",
                      variant: "destructive",
                    });
                    return;
                  }
                }
                // Reset the hook error and let the existing auto-listen effect
                // start one fresh recognizer. This avoids competing instances.
                speech.reset();
                setIsRecording(false);
                setTimeout(() => {
                  if (phaseRef.current === "interview" && autoListenEnabled) {
                    setIsRecording(true);
                  }
                }, 0);
              }}
            >
              Retry mic
            </Button>
          )}

          <div className="flex-1" />

          {/* Submit answer */}
          <Button
            size="sm"
            className="font-bold bg-primary hover:bg-primary/90 shrink-0"
            disabled={!answer.trim() || isStreaming || coachSpeaking || coachThinking}
            onClick={submitAnswer}
          >
            {isStreaming
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><ChevronRight className="w-4 h-4 mr-1" />Submit</>}
          </Button>

          {/* End call — red hang-up button */}
          <button
            onClick={endEarly}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center shadow-lg shadow-red-900/20 transition-all shrink-0"
            title="End Interview"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            {displayCoachName} is preparing the next question…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question review card ──────────────────────────────────────────────────────

function QuestionReview({ q, idx, coachName, hasReport }: { q: QA; idx: number; coachName: string; hasReport: boolean }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <Card className="border shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold text-muted-foreground shrink-0">Q{idx + 1}</span>
          <span className="text-sm font-semibold text-secondary line-clamp-1">{q.question}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {q.score !== undefined && <ScoreBadge score={q.score * 10} />}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3 bg-muted/20 animate-in slide-in-from-top-1">
          {q.communication !== undefined && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Communication", val: q.communication, icon: MessageCircle, color: "text-blue-600 bg-blue-50" },
                { label: "Grammar", val: q.grammar, icon: Pencil, color: "text-green-600 bg-green-50" },
                { label: "Confidence", val: q.confidence, icon: Flame, color: "text-orange-600 bg-orange-50" },
                { label: "Technical", val: q.technical, icon: Brain, color: "text-purple-600 bg-purple-50" },
              ].map(s => s.val !== undefined && (
                <div key={s.label} className={`rounded-xl p-2.5 ${s.color.split(" ")[1]}`}>
                  <div className={`text-[10px] font-bold ${s.color.split(" ")[0]} mb-0.5`}>{s.label}</div>
                  <div className={`text-lg font-display font-bold ${s.color.split(" ")[0]}`}>{s.val}/10</div>
                  <Progress value={s.val * 10} className="h-1 mt-1" />
                </div>
              ))}
            </div>
          )}
          <div className="rounded-xl bg-background border p-3">
            <p className="text-xs font-bold text-muted-foreground mb-1">Your Answer</p>
            <p className="text-sm text-secondary leading-relaxed">{q.answer}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-100 p-3">
            <p className="text-xs font-bold text-green-700 mb-1">{coachName}'s Feedback</p>
            <p className="text-sm text-green-950 whitespace-pre-wrap leading-relaxed">{formatGeneratedText(q.feedback ?? (hasReport ? "See overall analysis above for feedback on this answer." : "Generating your personalised feedback…"))}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
