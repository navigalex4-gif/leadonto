import { Link, useLocation } from "wouter";
import { useMemo, useState } from "react";
import {
  MessageSquare, Book, ChartNoAxesColumn, Globe, Flame, Mic, Check, Lock, Store, Volume2,
  Sparkles, Headphones, PenTool, Puzzle, Users, ArrowRight, Play, Trophy, UserCheck,
} from "lucide-react";
import { useStudentProfile } from "@/lib/use-student-profile";
import { useProgress } from "@/lib/use-progress";
import { useGamification, DAILY_GOAL_XP } from "@/lib/use-gamification";
import { useCredits } from "@/lib/use-credits";
import { INDIAN_LANGUAGES } from "@/lib/constants";
import { GURU_FONT, GURU_COLORS as C } from "@/components/english/guru-theme";
import { GuruHomeButton } from "@/components/navigation/guru-home-button";
import { getGuruTranslations } from "@/lib/guru-i18n";
import { TUTORS, getTutorById } from "@/lib/tutors";

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
      <text x="44" y="52" textAnchor="middle" fontSize="24" fontWeight="800" fill={C.ink}>{value}</text>
    </svg>
  );
}

const ACTIVITY_CONFIG: Record<string, { href: string; icon: typeof Mic; color: string; bg: string }> = {
  speaking: { href: "/english-guru/practice", icon: Mic, color: "#C2410C", bg: "#FFF7ED" },
  daily: { href: "/english-guru/embed?goal=daily", icon: MessageSquare, color: "#15803D", bg: "#F0FDF4" },
  vocab: { href: "/english-guru/words", icon: Volume2, color: "#6D28D9", bg: "#F5F3FF" },
  grammar: { href: "/english-guru/embed?goal=grammar", icon: PenTool, color: "#B45309", bg: "#FFFBEB" },
  sentence: { href: "/english-guru/practice", icon: Puzzle, color: "#0369A1", bg: "#F0F9FF" },
  listening: { href: "/english-guru/embed?goal=listening", icon: Headphones, color: "#0F766E", bg: "#F0FDFA" },
  scenarios: { href: "/english-guru/embed?goal=office", icon: Users, color: "#BE123C", bg: "#FFF1F2" },
};

export default function EnglishGuruRedesign() {
  const [, navigate] = useLocation();
  const { profile, updateProfile } = useStudentProfile();
  const progress = useProgress();
  const gam = useGamification(progress.streak);
  const { balance, authenticated } = useCredits();
  const [showTutorModal, setShowTutorModal] = useState(false);

  const currentTutor = useMemo(() => {
    return getTutorById(profile.preferredTutor || "priya") || TUTORS[0]!;
  }, [profile.preferredTutor]);

  // Load translations based on user's preferred helper language
  const t = useMemo(() => getGuruTranslations(profile.preferredLanguage), [profile.preferredLanguage]);

  const name = profile.name?.trim() || (profile.preferredLanguage === "English" ? "Friend" : "दोस्त");
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

  const tutorFirstName = currentTutor.name.split(" ")[0] || "Priya";
  const navItems = useMemo(() => [
    { href: "/english-guru/app", label: t.nav.learn.label, sub: t.nav.learn.sub, Icon: Book },
    { href: "/english-guru/embed", label: `${tutorFirstName} से बात करें`, sub: `Talk with ${tutorFirstName}`, Icon: MessageSquare },
    { href: "/english-guru/words", label: t.nav.words.label, sub: t.nav.words.sub, Icon: Volume2 },
    { href: "/progress", label: t.nav.progress.label, sub: t.nav.progress.sub, Icon: ChartNoAxesColumn },
  ], [t, tutorFirstName]);

  const goTo = (state: string) => {
    if (state === "active") navigate(LESSON_HREF);
    else if (state === "locked") navigate("/learning-journey");
    else navigate("/english-guru/embed?goal=intro");
  };

  return (
    <div className="min-h-screen pb-[120px] lg:pb-12 bg-[#F7F5F2]" style={{ color: C.ink, fontFamily: GURU_FONT }}>
      {/* Sleek, Compact Top Header */}
      <header className="sticky top-0 z-40 min-h-[46px] border-b border-white/10 text-white shadow-xs" style={{ background: C.navy }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-3 sm:px-4 py-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <GuruHomeButton variant="header" className="bg-white/10 hover:bg-white/20 text-white border-0 py-1 px-2.5 text-xs min-h-[34px]" />
            <Link href="/english-guru/app" className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold tracking-tight">
              <span>Lead Onto</span>
              <span className="font-semibold text-[#AEB3DD]">English Guru</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-xs">
              <Flame className="h-3.5 w-3.5" style={{ color: "#FDBA74", fill: "#FDBA74" }} aria-hidden />
              {progress.streak}<span className="hidden sm:inline"> दिन</span>
            </span>
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-xs">{gam.xp} XP</span>
            {authenticated && (
              <Link href="/buy-credits" className="hidden rounded-full bg-white/12 px-2.5 py-1 font-semibold hover:bg-white/20 sm:inline text-xs">
                {(balance ?? 0).toLocaleString("en-IN")} credits
              </Link>
            )}
            <Link
              href="/profile"
              aria-label="Account"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/40 text-xs font-bold hover:opacity-90 transition-opacity"
              style={{ background: C.peach, color: "#7C2D12" }}
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Responsive 3-Column Grid (Compact Proportions for 100% Desktop View) */}
      <div className="mx-auto max-w-[1120px] px-3 sm:px-4 py-3 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_240px] xl:grid-cols-[190px_1fr_250px] gap-3 sm:gap-3.5 items-start">

          {/* Left Sidebar: Compact Navigation & Language Picker */}
          <nav aria-label="Main" className="sticky top-[60px] hidden w-full flex-col gap-1.5 lg:flex">
            <GuruHomeButton
              variant="pill"
              className="w-full justify-start px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs shadow-2xs min-h-[38px]"
            />
            {navItems.map(({ href, label, sub, Icon }, i) => (
              <Link
                key={href}
                href={href}
                aria-current={i === 0 ? "page" : undefined}
                className="flex items-center gap-2.5 rounded-xl border px-3 py-2 font-semibold transition-all hover:bg-white min-h-[38px] text-xs"
                style={i === 0 ? { background: "#fff", borderColor: C.accent, color: C.accent, fontWeight: 700 } : { borderColor: "transparent", color: "#2A2D3A" }}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="leading-snug truncate">
                  {label}
                  <span className="block text-[10px] font-normal text-slate-500">{sub}</span>
                </span>
              </Link>
            ))}

            {/* Helper Language Selector */}
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              <Globe className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
              <label htmlFor="guru-language" className="min-w-0 flex-1 font-bold text-xs text-slate-800">
                <span>{t.helperLang}</span>
                <select
                  id="guru-language"
                  value={profile.preferredLanguage || "Hindi"}
                  onChange={e => updateProfile({ preferredLanguage: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  {["Hindi", "Marathi", "Punjabi", "Bengali", "Gujarati", "English", ...INDIAN_LANGUAGES.filter(x => !["Hindi", "Marathi", "Punjabi", "Bengali", "Gujarati"].includes(x))].map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Teacher Selector in Nav */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              <div className="relative h-6 w-6 shrink-0 rounded-full overflow-hidden border border-slate-300">
                <img src={currentTutor.imageSrc} alt="" className="h-full w-full object-cover" />
              </div>
              <label htmlFor="guru-tutor" className="min-w-0 flex-1 font-bold text-xs text-slate-800">
                <div className="flex items-center justify-between">
                  <span>शिक्षक · Teacher</span>
                  <button
                    type="button"
                    onClick={() => setShowTutorModal(true)}
                    className="text-[10px] text-orange-600 font-semibold hover:underline"
                  >
                    बदलें
                  </button>
                </div>
                <select
                  id="guru-tutor"
                  value={currentTutor.id}
                  onChange={e => {
                    const selected = TUTORS.find(tut => tut.id === e.target.value);
                    if (selected) {
                      updateProfile({
                        preferredTutor: selected.id,
                        voiceStyle: selected.voiceStyle as any,
                        voiceGender: selected.voiceGender,
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  {TUTORS.map(tut => (
                    <option key={tut.id} value={tut.id}>
                      {tut.name} ({tut.gender === "female" ? "मैम" : "सर"})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Motivational Tip Box */}
            <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-2.5 text-[11px] text-orange-950">
              <p className="font-bold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                <span>{t.motivation.title}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-orange-900/80 leading-snug">
                {t.motivation.desc}
              </p>
            </div>
          </nav>

          {/* Center Main Stage (Sleek, Compact Cards) */}
          <main className="min-w-0 flex-1 space-y-3">

            {/* Hero / Continue Banner with Selected Teacher */}
            <section className="relative overflow-hidden rounded-2xl border border-[#e8e2d8] bg-white p-3 sm:p-3.5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 rounded-2xl overflow-hidden border-2 border-orange-400 shadow-2xs">
                  <img
                    src={currentTutor.imageSrc}
                    alt={currentTutor.name}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 rounded-tl-md px-1 py-0.2 text-[8px] font-black text-white bg-slate-900">
                    AI
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100/90 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                      {currentTutor.name} · {currentTutor.gender === "female" ? "आपकी शिक्षिका" : "आपके शिक्षक"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTutorModal(true)}
                      className="text-[10px] font-bold text-orange-600 hover:text-orange-700 underline underline-offset-2 ml-auto shrink-0"
                    >
                      शिक्षक बदलें · Change
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug truncate mt-0.5">
                    नमस्ते {name}! {currentTutor.name} आपके साथ हैं।
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {currentTutor.role} · {currentTutor.specialization}
                  </p>
                </div>
              </div>

              {/* Continue Action Button */}
              <div className="mt-2.5 pt-2 border-t border-slate-100">
                <Link
                  href={LESSON_HREF}
                  className="flex h-9 sm:h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-center text-xs sm:text-sm font-bold text-white shadow-xs active:translate-y-[1px] transition-all hover:brightness-105"
                  style={{ background: C.accent }}
                >
                  <Mic className="h-4 w-4" aria-hidden />
                  <span className="truncate">{isReturningUser ? t.hero.ctaReturning : t.hero.ctaNew}</span>
                  <ArrowRight className="h-4 w-4 ml-0.5 hidden sm:inline shrink-0" />
                </Link>
              </div>
            </section>

            {/* Current Unit Progress Card */}
            <section className="rounded-xl p-3 text-white shadow-xs flex items-center justify-between gap-3" style={{ background: C.navy }}>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10" style={{ color: "#AEB3DD" }}>
                    {t.unit.tag}
                  </span>
                  <span className="text-[10px] font-semibold text-[#AEB3DD]">
                    {t.unit.progress}
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-bold truncate">{t.unit.title}</h2>
                <p className="text-[11px] text-[#D6D9F0] line-clamp-1">{t.unit.desc}</p>
              </div>

              <Link
                href={LESSON_HREF}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors shrink-0 h-8"
              >
                <Play className="h-3.5 w-3.5 fill-slate-900" />
                <span className="hidden sm:inline">{t.unit.resumeBtn}</span>
              </Link>
            </section>

            {/* Unit 1 Lesson Progression Roadmap (Compact 3-Column Grid) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>{t.roadmap.title}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">{t.roadmap.sub}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {t.roadmap.steps.map((s, idx) => {
                  const state = idx < 3 ? "done" : idx === 3 ? "active" : idx === 5 ? "reward" : "locked";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goTo(state)}
                      className={`flex items-start gap-2 rounded-xl border p-2 text-left transition-all ${
                        state === "active"
                          ? "border-orange-500 bg-white ring-1 ring-orange-200 shadow-xs"
                          : state === "done"
                            ? "border-green-200 bg-white hover:border-green-300"
                            : "border-slate-200 bg-slate-50/70 opacity-80"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                          state === "done"
                            ? "bg-green-100 text-green-700"
                            : state === "active"
                              ? "bg-orange-500 text-white shadow-2xs animate-pulse"
                              : state === "reward"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {state === "done" ? (
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        ) : state === "active" ? (
                          <Mic className="h-4 w-4" />
                        ) : state === "reward" ? (
                          <Store className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            {t.roadmap.stepBadge} {s.id}
                          </span>
                          {state === "active" && (
                            <span className="rounded-full bg-orange-100 px-1.5 py-0.2 text-[9px] font-bold text-orange-700">
                              {t.roadmap.startBadge}
                            </span>
                          )}
                          {state === "done" && (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.2 text-[9px] font-bold text-green-700">
                              {t.roadmap.doneBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate">{s.native}</p>
                        <p className="text-[10px] font-medium text-slate-500 truncate">{s.en}</p>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 7 Activities Hub (Compact 3-Column Grid) */}
            <section className="space-y-2 pt-1">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>{t.activities.title}</span>
                </h3>
                <p className="text-[10px] text-slate-500">{t.activities.sub}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {t.activities.items.map((act) => {
                  const config = ACTIVITY_CONFIG[act.id] ?? ACTIVITY_CONFIG["speaking"]!;
                  const IconComponent = config.icon;
                  return (
                    <Link
                      key={act.id}
                      href={config.href}
                      className="group flex flex-col justify-between rounded-xl border bg-white p-2.5 shadow-2xs transition-all hover:shadow-xs hover:border-slate-300"
                      style={{ borderColor: C.line }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                          style={{ background: config.bg, color: config.color }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {act.titleNative}
                            </span>
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                              {act.badge}
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-500 truncate">
                            {act.titleEn}
                          </p>
                          <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                            {act.descNative}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Real-Life Scenarios (Compact 3-Column Row) */}
            <section className="space-y-2 pt-1">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                <span>{t.scenarios.title}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Link
                  href="/english-guru/embed?goal=daily"
                  className="flex items-center gap-2 rounded-xl border bg-white p-2 shadow-2xs hover:border-orange-500 transition-colors"
                  style={{ borderColor: C.line }}
                >
                  <span className="text-lg">☕</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{t.scenarios.tea.title}</p>
                    <p className="text-[10px] text-slate-500">{t.scenarios.tea.sub}</p>
                  </div>
                </Link>
                <Link
                  href="/english-guru/embed?goal=office"
                  className="flex items-center gap-2 rounded-xl border bg-white p-2 shadow-2xs hover:border-orange-500 transition-colors"
                  style={{ borderColor: C.line }}
                >
                  <span className="text-lg">💼</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{t.scenarios.job.title}</p>
                    <p className="text-[10px] text-slate-500">{t.scenarios.job.sub}</p>
                  </div>
                </Link>
                <Link
                  href="/english-guru/embed?goal=travel"
                  className="flex items-center gap-2 rounded-xl border bg-white p-2 shadow-2xs hover:border-orange-500 transition-colors"
                  style={{ borderColor: C.line }}
                >
                  <span className="text-lg">🛍️</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{t.scenarios.market.title}</p>
                    <p className="text-[10px] text-slate-500">{t.scenarios.market.sub}</p>
                  </div>
                </Link>
              </div>
            </section>

            {/* Mobile / Tablet Stats (shown only below lg where right sidebar is hidden) */}
            <div className="space-y-2.5 pt-2 lg:hidden">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                <GoalRing value={gam.dailyXp} goal={goal} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">{t.sidebar.dailyGoal}</p>
                  <p className="text-[10px] text-slate-500">{gam.dailyXp} / {goal} XP</p>
                  <p className="text-[10px] font-bold" style={{ color: left > 0 ? C.accent : C.green }}>
                    {left > 0 ? t.sidebar.goalLeft(left) : t.sidebar.goalDone}
                  </p>
                </div>
              </div>

              <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span>{t.sidebar.quests}</span>
                </h4>
                <Quest label={t.sidebar.quest1} value={gam.messages} max={10} />
                <Quest label={t.sidebar.quest2} value={gam.wordsLearned.length} max={3} />
              </section>
            </div>
          </main>

          {/* Right Sidebar: Compact & Sticky Stats, Quests & Daily Word */}
          <aside className="sticky top-[60px] hidden w-full flex-col gap-2.5 lg:flex">
            {/* Daily Goal Card */}
            <section className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs">
              <GoalRing value={gam.dailyXp} goal={goal} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900">{t.sidebar.dailyGoal}</p>
                <p className="text-[10px] text-slate-500">{gam.dailyXp} / {goal} XP</p>
                <p className="text-[10px] font-bold" style={{ color: left > 0 ? C.accent : C.green }}>
                  {left > 0 ? t.sidebar.goalLeft(left) : t.sidebar.goalDone}
                </p>
              </div>
            </section>

            {/* This Week Streak Tracker */}
            <section className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span>{t.sidebar.thisWeek}</span>
                </h4>
                <span className="text-[10px] font-bold text-orange-600">{t.sidebar.streakDays(progress.streak)}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                {week.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 text-[9px] text-slate-500">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full font-bold text-[9px]"
                      style={
                        d.state === "done"
                          ? { background: "#FDBA74", color: "#7C2D12" }
                          : d.state === "today" || d.state === "next"
                            ? { border: `1.5px dashed ${C.accent}`, color: C.accent, background: "#FFF7ED" }
                            : { background: C.track }
                      }
                    >
                      {d.state === "done" ? <Check className="h-3 w-3 stroke-[3]" /> : i === 0 ? "आज" : d.label}
                    </span>
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-slate-500 leading-tight pt-0.5">
                {t.sidebar.streakTip}
              </p>
            </section>

            {/* Daily Quests */}
            <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>{t.sidebar.quests}</span>
              </h4>
              <Quest label={t.sidebar.quest1} value={gam.messages} max={10} />
              <Quest label={t.sidebar.quest2} value={gam.wordsLearned.length} max={3} />
            </section>

            {/* Word of the Day */}
            <Link
              href="/english-guru/words"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs transition-all hover:border-orange-500"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: "#EEF0FB", color: C.navy }}>
                <Volume2 className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{t.sidebar.wordTitle}</span>
                <span className="block text-xs font-bold text-slate-900">Persevere</span>
                <span className="block text-[10px] text-slate-600 truncate">{t.sidebar.wordPronounce} · {t.sidebar.wordMeaning}</span>
              </div>
            </Link>
          </aside>
        </div>
      </div>

      {/* Phone: sticky Continue button above the bottom tab bar */}
      <div className="fixed inset-x-0 bottom-[56px] z-30 px-3 py-2 lg:hidden" style={{ background: C.page }}>
        <Link
          href={LESSON_HREF}
          className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-xs active:scale-95 transition-transform"
          style={{ background: C.accent }}
        >
          <Mic className="h-4 w-4" />
          <span className="truncate">{isReturningUser ? t.hero.ctaReturning : t.hero.ctaNew}</span>
        </Link>
      </div>

      {/* Mobile Bottom Navigation Bar with Home Button (5 items, min 44px) */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-white lg:hidden" style={{ borderColor: C.line }}>
        <GuruHomeButton variant="nav-item" className="min-h-[50px]" />
        {navItems.map(({ href, label, Icon }, i) => (
          <Link
            key={href}
            href={href}
            aria-current={i === 0 ? "page" : undefined}
            className="flex min-h-[50px] flex-col items-center justify-center gap-0.5 text-[10px] active:scale-95 transition-transform"
            style={{ color: i === 0 ? C.accent : "#4A4E5A", fontWeight: i === 0 ? 700 : 500 }}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="truncate max-w-[56px] text-center">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Teacher Selection Modal */}
      {showTutorModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setShowTutorModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">अपना AI शिक्षक चुनें · Choose Your Teacher</h3>
                <p className="text-xs text-slate-500">जिस शिक्षक से आप सबसे सहज महसूस करें, उन्हें चुनें</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTutorModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TUTORS.map(tut => {
                const isSelected = tut.id === currentTutor.id;
                return (
                  <button
                    key={tut.id}
                    type="button"
                    onClick={() => {
                      updateProfile({
                        preferredTutor: tut.id,
                        voiceStyle: tut.voiceStyle as any,
                        voiceGender: tut.voiceGender,
                      });
                      setShowTutorModal(false);
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/70 shadow-xs ring-2 ring-orange-400/30"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <img src={tut.imageSrc} alt={tut.name} className="h-full w-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                          <Check className="h-5 w-5 text-orange-600 font-extrabold" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 leading-tight">{tut.name}</p>
                        {isSelected && (
                          <span className="rounded-full bg-orange-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
                            सक्रिय
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-orange-700 leading-snug">{tut.role}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500 line-clamp-2 leading-tight">{tut.specialization}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTutorModal(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                हो गया · Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Quest({ label, value, max }: { label: string; value: number; max: number }) {
  const v = Math.min(value, max);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] font-semibold">
        <span className="text-slate-800 truncate mr-2">{label}</span>
        <span className="text-slate-500 shrink-0">{v} / {max}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.track }} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={v} aria-label={label}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(v / max) * 100}%`, background: C.green }} />
      </div>
    </div>
  );
}
