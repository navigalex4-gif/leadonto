import { Link, useLocation } from "wouter";
import { useMemo } from "react";
import {
  MessageSquare, Book, ChartNoAxesColumn, Globe, Flame, Mic, Check, Lock, Store, Volume2,
  Sparkles, Headphones, PenTool, Puzzle, Users, ArrowRight, Play, Trophy, CheckCircle2,
} from "lucide-react";
import { useStudentProfile } from "@/lib/use-student-profile";
import { useProgress } from "@/lib/use-progress";
import { useGamification, DAILY_GOAL_XP } from "@/lib/use-gamification";
import { useCredits } from "@/lib/use-credits";
import { INDIAN_LANGUAGES } from "@/lib/constants";
import { GURU_FONT, GURU_COLORS as C } from "@/components/english/guru-theme";
import { GuruHomeButton } from "@/components/navigation/guru-home-button";

const nav = [
  { href: "/english-guru/app", label: "सीखें", short: "सीखें", sub: "Learn", Icon: Book },
  { href: "/english-guru/embed", label: "प्रिया से बात करें", short: "बात करें", sub: "Talk with Priya", Icon: MessageSquare },
  { href: "/english-guru/words", label: "मेरे शब्द", short: "शब्द", sub: "My words", Icon: Volume2 },
  { href: "/progress", label: "मेरी प्रगति", short: "प्रगति", sub: "Progress", Icon: ChartNoAxesColumn },
];

const steps = [
  { id: 1, hi: "नमस्ते", en: "Hello!", state: "done" as const, desc: "बुनियादी अभिवादन सीखें" },
  { id: 2, hi: "मेरा नाम…", en: "My name is…", state: "done" as const, desc: "अपना नाम बताना" },
  { id: 3, hi: "आप कहाँ से हैं?", en: "Where are you from?", state: "done" as const, desc: "शहर और घर की बात" },
  { id: 4, hi: "आप क्या करते हैं?", en: "What do you do?", state: "active" as const, desc: "काम और पढ़ाई की चर्चा" },
  { id: 5, hi: "गिनती और समय", en: "Numbers & Time", state: "locked" as const, desc: "संख्या और घड़ी का समय" },
  { id: 6, hi: "इनाम व प्रमाण पत्र", en: "Unit 1 Reward", state: "reward" as const, desc: "यूनिट 1 पूरा करने पर बोनस" },
];

const LESSON_HREF = "/english-guru/practice";
const RING_R = 36;
const RING_LEN = 2 * Math.PI * RING_R;

function GoalRing({ value, goal, size }: { value: number; goal: number; size: number }) {
  const pct = Math.min(1, goal > 0 ? value / goal : 0);
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" role="img" aria-label={`${value} of ${goal} XP today`}>
      <circle cx="44" cy="44" r={RING_R} fill="none" stroke={C.track} strokeWidth="10" />
      <circle
        cx="44" cy="44" r={RING_R} fill="none" stroke={C.accent} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={RING_LEN} strokeDashoffset={RING_LEN * (1 - pct)} transform="rotate(-90 44 44)"
      />
      <text x="44" y="51" textAnchor="middle" fontSize="20" fontWeight="800" fill={C.ink}>{value}</text>
    </svg>
  );
}

// 7 Activities matching Phase 2 core curriculum
const ACTIVITIES = [
  {
    id: "speaking",
    titleHi: "बोलने का अभ्यास",
    titleEn: "Speaking Practice",
    descHi: "माइक से बोलें और तुरंत अपना उच्चारण चेक करें",
    descEn: "Sentence drills with instant feedback",
    href: "/english-guru/practice",
    icon: Mic,
    badge: "Popular",
    color: "#C2410C",
    bg: "#FFF7ED",
  },
  {
    id: "daily",
    titleHi: "रोज़मर्रा की बातचीत",
    titleEn: "Daily Conversations",
    descHi: "चाय की दुकान, दफ़्तर और बाज़ार की असली बातें",
    descEn: "Live voice chat with Priya Ma'am",
    href: "/english-guru/embed?goal=daily",
    icon: MessageSquare,
    badge: "Live Voice",
    color: "#15803D",
    bg: "#F0FDF4",
  },
  {
    id: "words",
    titleHi: "नए शब्द और अर्थ",
    titleEn: "Vocabulary & Word Power",
    descHi: "रोज़ 3 नए शब्द, हिंदी अर्थ और सही उच्चारण",
    descEn: "Save and master key spoken words",
    href: "/english-guru/words",
    icon: Volume2,
    badge: "Daily Word",
    color: "#6D28D9",
    bg: "#F5F3FF",
  },
  {
    id: "grammar",
    titleHi: "व्याकरण आसान भाषा में",
    titleEn: "Grammar in Simple Hindi",
    descHi: "गलतियां समझें: Is/Am/Are, Was/Were, Has/Have",
    descEn: "Zero confusion grammar explanations",
    href: "/english-guru/embed?goal=grammar",
    icon: PenTool,
    badge: "Beginner",
    color: "#B45309",
    bg: "#FFFBEB",
  },
  {
    id: "sentence",
    titleHi: "वाक्य निर्माण",
    titleEn: "Sentence Building",
    descHi: "शब्दों को सही क्रम में जोड़कर बोलना सीखें",
    descEn: "Construct complete fluent sentences",
    href: "/english-guru/practice",
    icon: Puzzle,
    badge: "Interactive",
    color: "#0369A1",
    bg: "#F0F9FF",
  },
  {
    id: "listening",
    titleHi: "सुनना और उच्चारण",
    titleEn: "Listening & Pronunciation",
    descHi: "ध्यान से सुनें और वैसा ही दोहराएं",
    descEn: "Listen and repeat native audio",
    href: "/english-guru/embed?goal=listening",
    icon: Headphones,
    badge: "Audio Drill",
    color: "#0F766E",
    bg: "#F0FDFA",
  },
  {
    id: "scenarios",
    titleHi: "असली जीवन की स्थितियां",
    titleEn: "Real-Life Scenarios",
    descHi: "इंटरव्यू, डॉक्टर, यात्रा और ग्राहक सेवा",
    descEn: "Situational dialogues & roleplay",
    href: "/english-guru/embed?goal=office",
    icon: Users,
    badge: "Roleplay",
    color: "#BE123C",
    bg: "#FFF1F2",
  },
];

export default function EnglishGuruRedesign() {
  const [, navigate] = useLocation();
  const { profile, updateProfile } = useStudentProfile();
  const progress = useProgress();
  const gam = useGamification(progress.streak);
  const { balance, authenticated } = useCredits();
  const name = profile.name?.trim() || "दोस्त";
  const initial = (profile.name?.trim()?.[0] ?? "G").toUpperCase();
  const goal = DAILY_GOAL_XP;
  const left = Math.max(0, goal - gam.dailyXp);
  const isReturningUser = gam.xp > 0 || progress.streak > 0;

  const week = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString("hi-IN", { weekday: "short" });
    const state = i === 0 ? (gam.dailyXp > 0 || progress.streak > 0 ? "done" : "today") : i === 1 ? "next" : "future";
    return { label, state };
  }), [gam.dailyXp, progress.streak]);

  const goTo = (s: typeof steps[number]) =>
    navigate(s.state === "active" ? LESSON_HREF : s.state === "locked" ? "/learning-journey" : "/english-guru/embed?goal=intro");

  return (
    <div className="min-h-screen pb-[160px] lg:pb-16 bg-[#F7F5F2]" style={{ color: C.ink, fontFamily: GURU_FONT }}>
      {/* Top Header - Constrained to 1440px container for clean desktop alignment */}
      <header className="sticky top-0 z-40 min-h-[64px] border-b border-white/10 text-white shadow-sm" style={{ background: C.navy }}>
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <GuruHomeButton variant="header" className="bg-white/10 hover:bg-white/20 text-white border-0" />
            <Link href="/english-guru/app" className="flex items-center gap-2 text-lg sm:text-xl font-extrabold tracking-tight">
              <span>Lead Onto</span>
              <span className="font-semibold text-[#AEB3DD]">English Guru</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-sm font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs sm:text-sm">
              <Flame className="h-4 w-4" style={{ color: "#FDBA74", fill: "#FDBA74" }} aria-hidden />
              {progress.streak}<span className="hidden sm:inline"> दिन</span>
            </span>
            <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs sm:text-sm">{gam.xp} XP</span>
            {authenticated && (
              <Link href="/buy-credits" className="hidden rounded-full bg-white/12 px-3 py-1.5 font-semibold hover:bg-white/20 sm:inline text-xs sm:text-sm">
                {(balance ?? 0).toLocaleString("en-IN")} credits
              </Link>
            )}
            <Link
              href="/profile"
              aria-label="Account"
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/40 text-sm sm:text-base font-bold lg:h-10 lg:w-10 hover:opacity-90 transition-opacity"
              style={{ background: C.peach, color: "#7C2D12" }}
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>

      {/* Main 3-Column Desktop Grid Layout */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr_300px] xl:grid-cols-[260px_1fr_340px] gap-6 xl:gap-8 items-start">

          {/* Left Sidebar: Navigation & Controls */}
          <nav aria-label="Main" className="sticky top-[84px] hidden w-full flex-col gap-2.5 lg:flex">
            <GuruHomeButton
              variant="pill"
              className="w-full justify-start px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-sm shadow-xs"
            />
            {nav.map(({ href, label, sub, Icon }, i) => (
              <Link
                key={href}
                href={href}
                aria-current={i === 0 ? "page" : undefined}
                className="flex items-center gap-3.5 rounded-2xl border-2 px-4 py-3 font-semibold transition-all hover:bg-white min-h-[48px]"
                style={i === 0 ? { background: "#fff", borderColor: C.accent, color: C.accent, fontWeight: 700 } : { borderColor: "transparent", color: "#2A2D3A" }}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="leading-snug text-sm">
                  {label}
                  <span className="block text-xs font-medium text-slate-500">{sub}</span>
                </span>
              </Link>
            ))}

            {/* Language Selector */}
            <div className="mt-2 flex items-center gap-3 rounded-2xl p-4 border border-slate-200 bg-white shadow-xs">
              <Globe className="h-5 w-5 shrink-0 text-slate-700" aria-hidden />
              <label htmlFor="guru-language" className="min-w-0 flex-1 font-bold leading-snug text-xs sm:text-sm text-slate-800">
                सहायक भाषा · Helper
                <select
                  id="guru-language"
                  value={profile.preferredLanguage || "Hindi"}
                  onChange={e => updateProfile({ preferredLanguage: e.target.value })}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 min-h-[38px] focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {["Hindi", "English", ...INDIAN_LANGUAGES.filter(x => x !== "Hindi")].map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Quick Helper Badge */}
            <div className="rounded-2xl border border-orange-200/80 bg-orange-50/70 p-4 text-xs text-orange-950">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-orange-600" />
                <span>रोज़ सिर्फ़ 5 मिनट</span>
              </p>
              <p className="mt-1 text-[11px] text-orange-900/80 leading-relaxed">
                रोज़ 5 मिनट बोलकर अभ्यास करने से 30 दिनों में अंग्रेजी बोलने का झिझक पूरी तरह दूर हो जाता है।
              </p>
            </div>
          </nav>

          {/* Center Main Stage - Expands beautifully across all desktop screen sizes */}
          <main className="min-w-0 flex-1 space-y-6">

            {/* Hero / Continue Banner */}
            <section className="relative overflow-hidden rounded-3xl border border-[#e8e2d8] bg-white p-5 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0">
                  <div
                    className="flex h-full w-full items-center justify-center rounded-2xl text-3xl font-extrabold shadow-sm"
                    style={{ background: C.peach, color: "#9A3412" }}
                  >
                    P
                  </div>
                  <span className="absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-xs" style={{ background: C.navy }}>
                    AI COACH
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-100/80 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                    <span>प्रिया मैम · Priya Ma'am</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                    नमस्ते {name}! {isReturningUser
                      ? "जहाँ आपने छोड़ा था, वहीं से आगे बढ़ें। आज का अभ्यास तैयार है।"
                      : "अंग्रेज़ी सीखने का सफ़र शुरू करें। बिना किसी डर के 5 मिनट बोलिए।"}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {isReturningUser ? "यूनिट 1 · पाठ 4: आप क्या करते हैं? (What do you do?)" : "यूनिट 1 · पाठ 1: नमस्ते और अपना परिचय देना"}
                  </p>
                </div>
              </div>

              {/* Desktop Prominent CTA Button */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <Link
                  href={LESSON_HREF}
                  className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl px-6 text-center text-base sm:text-lg font-extrabold text-white shadow-[0_5px_0_rgba(0,0,0,0.22)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.22)] transition-all hover:brightness-105"
                  style={{ background: C.accent }}
                >
                  <Mic className="h-6 w-6" aria-hidden />
                  <span>
                    {isReturningUser
                      ? "जहाँ रुके थे वहीं से शुरू करें · Continue where you stopped"
                      : "पहला पाठ शुरू करें · Start Day 1 Lesson"}
                  </span>
                  <ArrowRight className="h-5 w-5 ml-1 hidden sm:inline" />
                </Link>
              </div>
            </section>

            {/* Current Unit Progress Card */}
            <section className="rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: C.navy }}>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10" style={{ color: "#AEB3DD" }}>
                    UNIT 1 · भाग 1
                  </span>
                  <span className="text-xs font-semibold text-[#AEB3DD]">
                    3 / 7 पूरे · 43%
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">अपना परिचय देना · Self Introduction</h2>
                <p className="text-xs sm:text-sm text-[#D6D9F0]">
                  किसी से मिलने पर अपना नाम, शहर और काम आत्मविश्वास से बताएं।
                </p>
              </div>

              <Link
                href={LESSON_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 transition-colors shrink-0 min-h-[44px]"
              >
                <Play className="h-4 w-4 fill-slate-900" />
                <span>पाठ जारी रखें</span>
              </Link>
            </section>

            {/* Unit 1 Lesson Progression Roadmap (Spacious Desktop Grid) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <span>यूनिट 1 के पाठ</span>
                    <span className="text-xs sm:text-sm font-medium text-slate-500">· Lesson Roadmap</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">क्रमवार अभ्यास पूरा करें और नए शब्द व वाक्य सीखें</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {steps.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(s)}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                      s.state === "active"
                        ? "border-orange-500 bg-white ring-2 ring-orange-200/80 shadow-md"
                        : s.state === "done"
                          ? "border-green-200 bg-white/90 hover:border-green-300 shadow-2xs"
                          : "border-slate-200 bg-slate-50/70 opacity-80 cursor-pointer"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                        s.state === "done"
                          ? "bg-green-100 text-green-700"
                          : s.state === "active"
                            ? "bg-orange-500 text-white shadow-xs animate-pulse"
                            : s.state === "reward"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {s.state === "done" ? (
                        <Check className="h-5 w-5 stroke-[2.5]" />
                      ) : s.state === "active" ? (
                        <Mic className="h-5 w-5" />
                      ) : s.state === "reward" ? (
                        <Store className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          पाठ {s.id}
                        </span>
                        {s.state === "active" && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-700">
                            शुरू करें
                          </span>
                        )}
                        {s.state === "done" && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                            पूरा हुआ
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 truncate mt-0.5">{s.hi}</p>
                      <p className="text-xs font-semibold text-slate-500 truncate">{s.en}</p>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* 7 Activities Hub (Responsive 2-3 Column Desktop Grid) */}
            <section className="space-y-3.5 pt-2">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>गतिविधियाँ और अभ्यास</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500">· 7 Learning Activities</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">बोलने, सुनने, व्याकरण और रोज़मर्रा की बातों का संपूर्ण अभ्यास</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {ACTIVITIES.map((act) => {
                  const IconComponent = act.icon;
                  return (
                    <Link
                      key={act.id}
                      href={act.href}
                      className="group flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.98] min-h-[110px]"
                      style={{ borderColor: C.line }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                          style={{ background: act.bg, color: act.color }}
                        >
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-extrabold text-slate-900 truncate">
                              {act.titleHi}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                              {act.badge}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                            {act.titleEn}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {act.descHi}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Quick Real-Life Situations */}
            <section className="space-y-3 pt-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>असली बातचीत करें</span>
                <span className="text-xs sm:text-sm font-medium text-slate-500">· Real-Life Scenarios</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  ["चाय की दुकान पर", "At the tea shop · 3 min", "daily", "☕"],
                  ["नौकरी का इंटरव्यू", "Job interview · 5 min", "office", "💼"],
                  ["बाज़ार में खरीदारी", "At the market · 3 min", "travel", "🛍️"],
                ] as const).map(([hi, en, g, emoji]) => (
                  <Link
                    key={g}
                    href={`/english-guru/embed?goal=${encodeURIComponent(g)}`}
                    className="flex flex-col gap-1.5 rounded-2xl border bg-white p-4 shadow-xs transition-all hover:border-orange-500 hover:shadow-md active:scale-[0.98]"
                    style={{ borderColor: C.line }}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-sm font-bold text-slate-900">{hi}</span>
                    <span className="text-xs text-slate-500">{en}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Mobile / Tablet Stats (shown only below lg where right sidebar is hidden) */}
            <div className="space-y-4 pt-4 lg:hidden">
              <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                <GoalRing value={gam.dailyXp} goal={goal} size={80} />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-slate-900">आज का लक्ष्य</p>
                  <p className="text-xs font-semibold text-slate-500">Daily goal · {gam.dailyXp} / {goal} XP</p>
                  <p className="mt-1 text-xs font-bold" style={{ color: left > 0 ? C.accent : C.green }}>
                    {left > 0 ? `बस ${left} XP और चाहिए!` : "लक्ष्य पूरा हुआ! 🎉"}
                  </p>
                </div>
              </div>

              <section className="flex flex-col gap-3.5 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span>आज के काम · Daily Quests</span>
                </h4>
                <Quest label="10 वाक्य बोलिए" value={gam.messages} max={10} />
                <Quest label="3 नए शब्द सीखिए" value={gam.wordsLearned.length} max={3} />
              </section>
            </div>
          </main>

          {/* Right Sidebar: Sticky Stats, Quests & Daily Word */}
          <aside className="sticky top-[84px] hidden w-full flex-col gap-4 lg:flex">
            {/* Daily Goal Card */}
            <section className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <GoalRing value={gam.dailyXp} goal={goal} size={88} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-slate-900">आज का लक्ष्य</p>
                <p className="text-xs font-semibold text-slate-500">Daily goal · {gam.dailyXp} / {goal} XP</p>
                <p className="mt-1 text-xs font-bold" style={{ color: left > 0 ? C.accent : C.green }}>
                  {left > 0 ? `बस ${left} XP और चाहिए!` : "लक्ष्य पूरा हुआ! 🎉"}
                </p>
              </div>
            </section>

            {/* This Week Streak Tracker */}
            <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span>इस हफ़्ते · This Week</span>
                </h4>
                <span className="text-xs font-bold text-orange-600">{progress.streak} दिन लगातार</span>
              </div>
              <div className="flex justify-between pt-1">
                {week.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 text-xs text-slate-500">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs shadow-2xs"
                      style={
                        d.state === "done"
                          ? { background: "#FDBA74", color: "#7C2D12" }
                          : d.state === "today" || d.state === "next"
                            ? { border: `2px dashed ${C.accent}`, color: C.accent, background: "#FFF7ED" }
                            : { background: C.track }
                      }
                    >
                      {d.state === "done" ? <Check className="h-4 w-4 stroke-[3]" /> : i === 0 ? "आज" : d.label}
                    </span>
                    <span className="text-[11px]">{d.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                कल भी आइए, अपना सीखने का सिलसिला (streak) बनाए रखिए।
              </p>
            </section>

            {/* Daily Quests */}
            <section className="flex flex-col gap-3.5 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>आज के काम · Daily Quests</span>
              </h4>
              <Quest label="10 वाक्य बोलिए" value={gam.messages} max={10} />
              <Quest label="3 नए शब्द सीखिए" value={gam.wordsLearned.length} max={3} />
            </section>

            {/* Word of the Day */}
            <Link
              href="/english-guru/words"
              className="flex items-center gap-3.5 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-orange-500 hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: "#EEF0FB", color: C.navy }}>
                <Volume2 className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">आज का शब्द · Word</span>
                <span className="block text-lg font-extrabold text-slate-900">Persevere</span>
                <span className="block text-xs font-semibold text-slate-600">पर्सिवीयर · लगे रहना</span>
              </div>
            </Link>
          </aside>
        </div>
      </div>

      {/* Phone: sticky Continue button above the bottom tab bar */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 px-4 py-2.5 lg:hidden" style={{ background: C.page }}>
        <Link
          href={LESSON_HREF}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-[16px] font-extrabold text-white shadow-[0_4px_0_rgba(0,0,0,0.22)] active:scale-95 transition-transform"
          style={{ background: C.accent }}
        >
          <Mic className="h-5 w-5" />
          {isReturningUser ? "जहाँ रुके थे वहीं से शुरू करें · Continue" : "यहाँ से शुरू करें · Start Day 1"}
        </Link>
      </div>

      {/* Mobile Bottom Navigation Bar with Home Button (5 items, min 44px) */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-white lg:hidden" style={{ borderColor: C.line }}>
        <GuruHomeButton variant="nav-item" className="min-h-[56px]" />
        {nav.map(({ href, short, Icon }, i) => (
          <Link
            key={href}
            href={href}
            aria-current={i === 0 ? "page" : undefined}
            className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] active:scale-95 transition-transform"
            style={{ color: i === 0 ? C.accent : "#4A4E5A", fontWeight: i === 0 ? 700 : 500 }}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{short}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Quest({ label, value, max }: { label: string; value: number; max: number }) {
  const v = Math.min(value, max);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs sm:text-sm font-semibold">
        <span className="text-slate-800">{label}</span>
        <span className="text-slate-500">{v} / {max}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: C.track }} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={v} aria-label={label}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(v / max) * 100}%`, background: C.green }} />
      </div>
    </div>
  );
}
