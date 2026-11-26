import { Link, useLocation } from "wouter";
import { useMemo } from "react";
import {
  MessageSquare, Book, ChartNoAxesColumn, Globe, Flame, Mic, Check, Lock, Store, Volume2,
  Sparkles, Headphones, PenTool, Puzzle, Users, ArrowRight,
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
  { hi: "नमस्ते", en: "Hello!", state: "done", x: 0 },
  { hi: "मेरा नाम…", en: "My name is…", state: "done", x: -70 },
  { hi: "आप कहाँ से हैं?", en: "Where are you from?", state: "done", x: -20 },
  { hi: "आप क्या करते हैं?", en: "What do you do?", state: "active", x: 60 },
  { hi: "गिनती", en: "Numbers", state: "locked", x: -10 },
  { hi: "इनाम", en: "Reward", state: "reward", x: -70 },
] as const;

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
    descEn: "Speak into mic with real-time feedback",
    href: "/english-guru/practice",
    icon: Mic,
    badge: "Most Popular",
    color: "#C2410C",
    bg: "#FFF7ED",
  },
  {
    id: "daily",
    titleHi: "रोज़मर्रा की बातचीत",
    titleEn: "Daily Conversations",
    descHi: "चाय की दुकान, दफ़्तर और बाज़ार की असली बातें",
    descEn: "Real life dialogue with Priya Ma'am",
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
    descEn: "Zero confusion grammar lessons",
    href: "/english-guru/embed?goal=grammar",
    icon: PenTool,
    badge: "Beginner Friendly",
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
    <div className="min-h-screen pb-[160px] lg:pb-12" style={{ background: C.page, color: C.ink, fontFamily: GURU_FONT }}>
      {/* Top Header with Global Home Button */}
      <header className="sticky top-0 z-40 flex min-h-[56px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 text-white lg:px-6" style={{ background: C.navy }}>
        <div className="flex items-center gap-3">
          <GuruHomeButton variant="header" className="bg-white/10 hover:bg-white/20 text-white border-0" />
          <Link href="/english-guru/app" className="text-[17px] font-extrabold tracking-tight lg:text-xl">
            <span className="hidden sm:inline">Lead Onto </span>
            <span className="font-extrabold lg:font-medium" style={{ color: "#AEB3DD" }}>
              <span>English Guru</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm font-bold">
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
          <Link href="/profile" aria-label="Account" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/40 text-base font-bold lg:h-10 lg:w-10" style={{ background: C.peach, color: "#7C2D12" }}>
            {initial}
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1320px] flex-wrap items-start gap-6 px-3 py-5 sm:px-4 lg:px-6">
        {/* Desktop Left Nav */}
        <nav aria-label="Main" className="sticky top-[88px] hidden w-[230px] shrink-0 flex-col gap-2 lg:flex">
          <GuruHomeButton variant="pill" className="w-full justify-start px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200" />
          {nav.map(({ href, label, sub, Icon }, i) => (
            <Link
              key={href}
              href={href}
              aria-current={i === 0 ? "page" : undefined}
              className="flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3 font-semibold transition-colors hover:bg-white min-h-[44px]"
              style={i === 0 ? { background: "#fff", borderColor: C.accent, color: C.accent, fontWeight: 700 } : { borderColor: "transparent", color: "#2A2D3A" }}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="leading-snug">
                {label}
                <span className="block text-xs font-medium" style={{ color: C.muted }}>{sub}</span>
              </span>
            </Link>
          ))}

          <div className="flex items-center gap-3 rounded-2xl px-3.5 py-3 border border-slate-200/80 bg-white/60">
            <Globe className="h-5 w-5 shrink-0" aria-hidden style={{ color: "#2A2D3A" }} />
            <label htmlFor="guru-language" className="min-w-0 flex-1 font-semibold leading-snug text-xs sm:text-sm">
              सहायक भाषा · Helper
              <select
                id="guru-language"
                value={profile.preferredLanguage || "Hindi"}
                onChange={e => updateProfile({ preferredLanguage: e.target.value })}
                className="mt-1 block w-full rounded-lg border bg-white px-2 py-1.5 text-xs font-medium min-h-[36px]"
                style={{ borderColor: C.line, color: C.ink }}
              >
                {["Hindi", "English", ...INDIAN_LANGUAGES.filter(x => x !== "Hindi")].map(x => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
        </nav>

        {/* Center Main Stage */}
        <main className="mx-auto flex min-w-0 max-w-[660px] flex-[999_1_460px] flex-col gap-5">
          {/* Primary Action Card: Clear Start for New Learners & "Continue where you stopped" */}
          <section className="flex flex-col gap-4 rounded-3xl border bg-white p-4 sm:p-5 shadow-xs" style={{ borderColor: C.line }}>
            <div className="flex items-center gap-3.5">
              <div className="relative h-14 w-14 shrink-0 lg:h-16 lg:w-16">
                <div className="flex h-full w-full items-center justify-center rounded-full text-2xl font-bold" style={{ background: C.peach, color: "#9A3412" }}>
                  P
                </div>
                <span className="absolute -bottom-0.5 -right-1 rounded-full px-2 text-[11px] font-bold text-white" style={{ background: C.navy }}>
                  AI
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="rounded-[6px_18px_18px_18px] px-4 py-3 text-[15px] sm:text-[17px] leading-[1.6]" style={{ background: "#F3F1ED" }}>
                  नमस्ते {name}! {isReturningUser
                    ? "जहाँ रुके थे वहीं से शुरू करें। आज सिर्फ़ 5 मिनट अभ्यास कीजिए।"
                    : "शुरुआत करें! बिना किसी डर के, आज सिर्फ़ 5 मिनट अंग्रेज़ी बोलिए।"}
                </p>
              </div>
            </div>

            {/* Desktop & Tablet Top CTA */}
            <Link
              href={LESSON_HREF}
              className="hidden min-h-[56px] items-center justify-center gap-2.5 rounded-2xl px-4 text-center text-base sm:text-lg font-extrabold text-white shadow-[0_5px_0_rgba(0,0,0,0.22)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.22)] lg:flex"
              style={{ background: C.accent }}
            >
              <Mic className="h-6 w-6" aria-hidden />
              {isReturningUser
                ? "जहाँ रुके थे वहीं से शुरू करें · Continue where you stopped"
                : "यहाँ से शुरू करें · Start Day 1 Lesson"}
            </Link>
          </section>

          {/* Unit Progress Banner */}
          <section className="flex items-center justify-between gap-3 rounded-[20px] px-4 py-3.5 sm:px-5 sm:py-[18px] text-white shadow-xs" style={{ background: C.navy }}>
            <div>
              <p className="text-xs font-bold tracking-[0.8px]" style={{ color: "#AEB3DD" }}>UNIT 1 · भाग 1</p>
              <h1 className="text-lg sm:text-xl font-bold">अपना परिचय देना</h1>
              <p className="text-xs sm:text-sm" style={{ color: "#D6D9F0" }}>Introducing yourself with confidence</p>
            </div>
            <span className="text-xs sm:text-[13px] font-bold rounded-full bg-white/10 px-3 py-1.5" style={{ color: "#D6D9F0" }}>
              3 / 7 पूरे
            </span>
          </section>

          {/* Zig-Zag Lesson Path */}
          <section aria-label="Lesson path" className="flex flex-col items-center gap-[22px] pb-3 pt-2 [--path-scale:0.8] sm:[--path-scale:1]">
            {steps.map(s => (
              <div key={s.en} className="flex flex-col items-center gap-1.5" style={{ transform: `translateX(calc(var(--path-scale) * ${s.x}px))` }}>
                {s.state === "active" && (
                  <span className="rounded-xl border-2 bg-white px-4 py-1 text-xs sm:text-sm font-extrabold animate-bounce" style={{ borderColor: C.accent, color: C.accent }}>
                    यहाँ से शुरू · START
                  </span>
                )}
                {s.state === "reward" ? (
                  <Link
                    href="/progress"
                    aria-label="इनाम · Reward"
                    className="flex h-[76px] w-[76px] items-center justify-center rounded-[22px] border-2 shadow-[0_6px_0_#D97706] hover:scale-105 transition-transform"
                    style={{ background: "#FEF3C7", borderColor: "#F59E0B", color: "#92400E" }}
                  >
                    <Store className="h-8 w-8" aria-hidden />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => goTo(s)}
                    aria-label={`${s.hi} · ${s.en}`}
                    className={`flex items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 ${s.state === "active" ? "h-24 w-24" : "h-[76px] w-[76px]"}`}
                    style={s.state === "done" ? { background: C.green, boxShadow: `0 6px 0 ${C.greenDeep}` }
                      : s.state === "active" ? { background: C.accent, boxShadow: `0 8px 0 rgba(0,0,0,0.25), 0 0 0 8px ${C.peach}` }
                      : { background: "#E3DFD8", boxShadow: "0 6px 0 #C9C3BA", color: C.muted }}
                  >
                    {s.state === "done" ? (
                      <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
                    ) : s.state === "locked" ? (
                      <Lock className="h-7 w-7" aria-hidden />
                    ) : (
                      <Mic className="h-10 w-10" aria-hidden />
                    )}
                  </button>
                )}
                <span
                  className={`text-center leading-snug text-xs sm:text-sm ${s.state === "active" ? "text-base font-extrabold" : s.state === "done" ? "font-bold" : "font-semibold"}`}
                  style={s.state === "locked" || s.state === "reward" ? { color: "#4A4E5A" } : undefined}
                >
                  {s.hi} · {s.en}
                </span>
              </div>
            ))}
          </section>

          {/* ── 7 ACTIVITIES HUB (Phase 2 Requirement) ── */}
          <section className="flex flex-col gap-3.5 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                  <span>गतिविधियाँ और अभ्यास</span>
                  <span className="text-xs sm:text-sm font-medium" style={{ color: C.muted }}>· Activities</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">बोलने, सुनने, व्याकरण और रोज़मर्रा की बातों का पूरा अभ्यास</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACTIVITIES.map((act) => {
                const IconComponent = act.icon;
                return (
                  <Link
                    key={act.id}
                    href={act.href}
                    className="group relative flex flex-col justify-between rounded-2xl border bg-white p-3.5 sm:p-4 shadow-xs transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.98] min-h-[92px]"
                    style={{ borderColor: C.line }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                        style={{ background: act.bg, color: act.color }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {act.titleHi}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                            {act.badge}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                          {act.titleEn}
                        </p>
                        <p className="text-[11px] text-slate-600 line-clamp-1 mt-1">
                          {act.descHi}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Quick Scenario Starters */}
          <section className="flex flex-col gap-3 pt-2">
            <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
              <span>असली बातचीत करें</span>
              <span className="text-xs sm:text-sm font-medium" style={{ color: C.muted }}>· Real-Life Scenarios</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                ["चाय की दुकान पर", "At the tea shop · 3 min", "daily"],
                ["नौकरी का इंटरव्यू", "Job interview · 5 min", "office"],
                ["बाज़ार में खरीदारी", "At the market · 3 min", "travel"],
              ] as const).map(([hi, en, g]) => (
                <Link
                  key={g}
                  href={`/english-guru/embed?goal=${encodeURIComponent(g)}`}
                  className="flex flex-col gap-1 rounded-2xl border bg-white p-3.5 transition-all hover:border-[color:var(--c)] hover:shadow-xs active:scale-[0.98]"
                  style={{ borderColor: C.line, ["--c" as string]: C.accent }}
                >
                  <span className="text-sm font-bold text-slate-900">{hi}</span>
                  <span className="text-xs" style={{ color: C.muted }}>{en}</span>
                </Link>
              ))}
            </div>
          </section>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden w-[320px] shrink-0 flex-col gap-4 lg:sticky lg:top-[88px] lg:flex xl:flex-1 xl:max-w-[320px]">
          <section className="flex items-center gap-4 rounded-[20px] border bg-white p-[18px] shadow-xs" style={{ borderColor: C.line }}>
            <GoalRing value={gam.dailyXp} goal={goal} size={88} />
            <div>
              <p className="text-base font-extrabold">आज का लक्ष्य</p>
              <p className="text-[13px]" style={{ color: C.muted }}>Daily goal · {gam.dailyXp} / {goal} XP</p>
              <p className="mt-1 text-sm font-bold" style={{ color: left > 0 ? C.accent : C.green }}>
                {left > 0 ? `बस ${left} XP और!` : "लक्ष्य पूरा हुआ! 🎉"}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-[20px] border bg-white p-[18px] shadow-xs" style={{ borderColor: C.line }}>
            <h3 className="font-extrabold">इस हफ़्ते <span className="text-[13px] font-medium" style={{ color: C.muted }}>· This week</span></h3>
            <div className="flex justify-between">
              {week.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 text-xs" style={{ color: C.muted }}>
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full font-bold"
                    style={d.state === "done" ? { background: "#FDBA74", color: "#7C2D12" } : d.state === "today" || d.state === "next" ? { border: `2px dashed ${C.accent}`, color: C.accent } : { background: C.track }}
                  >
                    {d.state === "done" ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : i === 0 ? "आज" : d.label}
                  </span>
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[13px] leading-[1.6]" style={{ color: "#4A4E5A" }}>
              कल भी आइए, अपना सिलसिला (streak) बनाए रखिए।
            </p>
          </section>

          <section className="flex flex-col gap-3.5 rounded-[20px] border bg-white p-[18px] shadow-xs" style={{ borderColor: C.line }}>
            <h3 className="font-extrabold">आज के काम <span className="text-[13px] font-medium" style={{ color: C.muted }}>· Daily quests</span></h3>
            <Quest label="10 वाक्य बोलिए" value={gam.messages} max={10} />
            <Quest label="3 नए शब्द सीखिए" value={gam.wordsLearned.length} max={3} />
          </section>

          <Link
            href="/english-guru/words"
            className="flex items-center gap-3 rounded-[20px] border bg-white p-[18px] shadow-xs transition-colors hover:border-[color:var(--c)]"
            style={{ borderColor: C.line, ["--c" as string]: C.accent }}
          >
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full" style={{ background: "#EEF0FB", color: C.navy }}>
              <Volume2 className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <span className="block text-xs font-bold tracking-[0.6px]" style={{ color: C.muted }}>आज का शब्द · Word of the Day</span>
              <span className="block text-xl font-extrabold">Persevere</span>
              <span className="block text-sm" style={{ color: "#3A3D48" }}>पर्सिवीयर · लगे रहना</span>
            </div>
          </Link>
        </aside>
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
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span style={{ color: C.muted }}>{v} / {max}</span>
      </div>
      <div className="h-2.5 rounded-full" style={{ background: C.track }} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={v} aria-label={label}>
        <div className="h-2.5 rounded-full transition-all duration-300" style={{ width: `${(v / max) * 100}%`, background: C.green }} />
      </div>
    </div>
  );
}
