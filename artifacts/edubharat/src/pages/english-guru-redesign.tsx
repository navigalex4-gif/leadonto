import { Link, useLocation } from "wouter";
import { useMemo } from "react";
import {
  Home, MessageSquare, Book, ChartNoAxesColumn, Globe, Flame, UserRound,
  Mic, Check, Lock, Store, Volume2, ChevronRight, Target,
} from "lucide-react";
import { useStudentProfile } from "@/lib/use-student-profile";
import { useProgress } from "@/lib/use-progress";
import { useGamification } from "@/lib/use-gamification";
import { INDIAN_LANGUAGES } from "@/lib/constants";

const nav = [
  { href: "/english-guru/app", label: "सीखें", sub: "Learn", Icon: Home },
  { href: "/english-guru/embed", label: "प्रिय से बात करें", sub: "Talk with Priya", Icon: MessageSquare },
  { href: "/english-guru/words", label: "मेरे शब्द", sub: "My words", Icon: Book },
  { href: "/progress", label: "मेरी प्रगति", sub: "Progress", Icon: ChartNoAxesColumn },
];

const steps = [
  { hi: "नमस्ते", en: "Hello!", done: true },
  { hi: "मेरा नाम…", en: "My name is…", done: true },
  { hi: "आप कहाँ से हैं?", en: "Where are you from?", done: true },
  { hi: "आप क्या काम करते हैं?", en: "What do you do?", active: true },
  { hi: "गिनती", en: "Numbers", locked: true },
  { hi: "इनाम", en: "Reward", reward: true },
];

export default function EnglishGuruRedesign() {
  const [, navigate] = useLocation();
  const { profile, updateProfile } = useStudentProfile();
  const progress = useProgress();
  const gam = useGamification(progress.streak);
  const name = profile.name?.trim() || "मोहल";
  const xp = gam.xp;
  const goal = 60;
  const pct = Math.min(100, Math.round((gam.dailyXp / goal) * 100));
  const week = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { label: d.toLocaleDateString("hi-IN", { weekday: "short" }), active: i === 0 || (i === 1 && progress.streak > 1) };
  }), [progress.streak]);

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-[#191a2f] pb-24 lg:pb-0">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-[#151735] px-4 text-white lg:px-6">
        <Link href="/english-guru/app" className="font-extrabold tracking-tight">Lead Onto <span className="font-medium text-indigo-200">English Guru</span></Link>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-white/10 px-3 py-2"><Flame className="mr-1 inline h-4 w-4 text-orange-300" />{progress.streak} दिन</span>
          <span className="rounded-full bg-white/10 px-3 py-2">{xp} XP</span>
          <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffe2d3] text-[#96350e]"><UserRound className="h-5 w-5" /></Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-3 py-4 lg:grid-cols-[210px_minmax(420px,1fr)_280px] lg:px-6">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-2">
            {nav.map(({ href, label, sub, Icon }, i) => (
              <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${i === 0 ? "border-[#c9410b] bg-white text-[#bd3e0a]" : "border-transparent hover:border-[#e8ddd5] hover:bg-white"}`}>
                <Icon className="h-5 w-5 shrink-0" />
                <span><span className="block text-sm font-bold">{label}</span><span className="text-xs text-slate-500">{sub}</span></span>
              </Link>
            ))}
            <div className="rounded-xl border border-[#e9e3dd] bg-white p-3">
              <label htmlFor="guru-language" className="mb-2 flex items-center gap-2 text-sm font-bold"><Globe className="h-4 w-4" />भाषा बदलें</label>
              <select id="guru-language" value={profile.preferredLanguage || "Hindi"} onChange={e => updateProfile({ preferredLanguage: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm">
                {["Hindi", "English", ...INDIAN_LANGUAGES.filter(x => x !== "Hindi")].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-[#e9e2dc] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffe2d3] text-2xl font-bold text-[#a43a13]">P</div>
              <div className="rounded-2xl bg-[#f3f1ee] px-4 py-3 text-base">नमस्ते {name}! आज सिर्फ़ 5 मिनट अंग्रेज़ी बोलिए। मैं आपके साथ हूँ।</div>
            </div>
            <Link href="/english-guru/embed" className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#c9410b] px-3 text-center text-sm font-extrabold text-white shadow-[0_4px_0_#b5aaa2] hover:bg-[#b93808]">
              <Mic className="h-5 w-5" />आज का पाठ शुरू करें · Start today's lesson
            </Link>
          </section>

          <section className="rounded-2xl bg-[#151735] p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">UNIT 1 · भाग 1</p><h1 className="mt-1 text-lg font-extrabold">अपना परिचय देना</h1><p className="text-sm text-indigo-100">Introducing yourself</p></div>
              <span className="text-xs text-indigo-100">3 / 7 पूरे</span>
            </div>
          </section>

          <section className="flex flex-col items-center gap-2 py-2">
            {steps.map((step, i) => (
              <div key={step.en} className="flex w-full flex-col items-center">
                {step.reward ? (
                  <Link href="/progress" className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-500 bg-amber-100 text-amber-800 shadow-[0_5px_0_#d97706]"><Store className="h-7 w-7" /></Link>
                ) : (
                  <button type="button" onClick={() => step.locked ? navigate("/learning-journey") : navigate(step.active ? "/english-guru/embed?goal=introduction" : "/learning-journey")} className={`flex h-16 w-16 items-center justify-center rounded-full shadow-[0_6px_0_rgba(0,0,0,.18)] transition hover:scale-105 ${step.done ? "bg-[#168342] text-white" : step.active ? "bg-[#c9410b] text-white ring-8 ring-[#ffe2d3]" : "bg-[#e6e2dc] text-slate-500"}`}>
                    {step.done ? <Check className="h-8 w-8" /> : step.locked ? <Lock className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
                  </button>
                )}
                <button type="button" onClick={() => navigate(step.locked ? "/learning-journey" : step.active ? "/english-guru/embed?goal=introduction" : "/learning-journey")} className="mt-1 text-center text-sm font-bold hover:text-[#bd3e0a]">{step.hi} · {step.en}</button>
                {step.active && <span className="mt-2 rounded-full border border-[#c9410b] bg-white px-4 py-1 text-xs font-extrabold text-[#bd3e0a]">यहाँ से शुरू · START</span>}
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="font-extrabold">असली बातचीत करें <span className="text-sm font-medium text-slate-500">· Real-life practice</span></h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["चाय की दुकान पर", "At the tea shop · 3 min", "tea shop"],
                ["नौकरी का इंटरव्यू", "Job interview · 5 min", "job interview"],
                ["बाज़ार में", "At the market · 3 min", "market"],
              ].map(([hi, en, goal]) => <Link key={goal} href={`/english-guru/embed?goal=${encodeURIComponent(goal)}`} className="rounded-2xl border border-[#e9e2dc] bg-white p-4 hover:border-[#c9410b]"><span className="block text-sm font-bold">{hi}</span><span className="text-xs text-slate-500">{en}</span></Link>)}
            </div>
          </section>
        </main>

        <aside className="hidden space-y-3 lg:block">
          <section className="flex items-center gap-4 rounded-2xl border border-[#e9e2dc] bg-white p-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[7px] border-[#c9410b] text-xl font-extrabold">{gam.dailyXp}<span className="absolute -bottom-1 -right-1 text-[9px] text-slate-500">XP</span></div>
            <div><p className="text-sm font-extrabold">आज का लक्ष्य</p><p className="text-xs text-slate-500">Daily goal · {gam.dailyXp} / {goal} XP</p><p className="mt-1 text-xs">बस {Math.max(0, goal - gam.dailyXp)} XP और!</p></div>
          </section>
          <section className="rounded-2xl border border-[#e9e2dc] bg-white p-4">
            <h3 className="text-sm font-extrabold">इस हफ़्ते <span className="font-normal text-slate-500">· This week</span></h3>
            <div className="mt-3 flex justify-between">{week.map((d, i) => <div key={i} className="text-center"><div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${d.active ? "bg-orange-300 text-orange-900" : "bg-[#f0eeeb] text-slate-400"}`}>{d.active ? "✓" : "·"}</div><span className="text-[10px] text-slate-500">{d.label}</span></div>)}</div>
            <p className="mt-3 text-xs text-slate-500">कल भी आइए, अपना सिलसिला (streak) बनाए रखिए।</p>
          </section>
          <section className="rounded-2xl border border-[#e9e2dc] bg-white p-4">
            <h3 className="text-sm font-extrabold">आज के काम <span className="font-normal text-slate-500">· Daily quests</span></h3>
            <div className="mt-3 flex justify-between text-xs"><span>10 वाक्य बोलिए</span><span>{Math.min(gam.messages, 10)} / 10</span></div><div className="mt-1 h-2 rounded-full bg-[#f0eeeb]"><div className="h-2 rounded-full bg-green-600" style={{ width: `${Math.min(100, gam.messages * 10)}%` }} /></div>
            <div className="mt-3 flex justify-between text-xs"><span>3 नए शब्द सीखिए</span><span>{Math.min(gam.wordsLearned.length, 3)} / 3</span></div><div className="mt-1 h-2 rounded-full bg-[#f0eeeb]"><div className="h-2 rounded-full bg-green-600" style={{ width: `${Math.min(100, gam.wordsLearned.length / 3 * 100)}%` }} /></div>
          </section>
          <Link href="/english-guru/words" className="flex items-center gap-3 rounded-2xl border border-[#e9e2dc] bg-white p-4 hover:border-[#c9410b]"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-900"><Volume2 className="h-5 w-5" /></span><span><span className="block text-xs font-bold text-slate-500">आज का शब्द</span><span className="font-extrabold">Persevere</span><span className="block text-xs text-slate-500">दृढ़ रहना · बने रहना</span></span></Link>
          <Link href="/progress" className="flex items-center justify-between rounded-xl border border-[#e9e2dc] bg-white p-3 text-sm font-bold hover:border-[#c9410b]"><span><Target className="mr-2 inline h-4 w-4" />Progress overview</span><ChevronRight className="h-4 w-4" /></Link>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#e7e1dc] bg-white px-1 py-2 lg:hidden">
        {nav.map(({ href, label, Icon }, i) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-1 text-[11px] font-semibold ${i === 0 ? "text-[#c9410b]" : "text-slate-600"}`}><Icon className="h-5 w-5" />{label}</Link>)}
      </nav>
    </div>
  );
}
