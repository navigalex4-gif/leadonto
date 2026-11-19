import { Link } from "wouter";
import { BookOpen, MessageCircle, BookMarked, ChartNoAxesColumn, Globe2, Flame, UserCircle } from "lucide-react";
import EnglishGuru from "@/pages/english-guru";
import { INDIAN_LANGUAGES } from "@/lib/constants";
import { useStudentProfile } from "@/lib/use-student-profile";

const NAV = [
  { href: "/learning-journey", label: "सीखें", sub: "Learn", icon: BookOpen },
  { href: "#english-guru-live", label: "बात करें", sub: "Live conversation", icon: MessageCircle, anchor: true },
  { href: "/english-guru/words", label: "मेरे शब्द", sub: "My words", icon: BookMarked },
  { href: "/progress", label: "मेरी प्रगति", sub: "Progress", icon: ChartNoAxesColumn },
] as const;

export default function EnglishGuruRedesign() {
  const { profile, updateProfile } = useStudentProfile();
  const language = profile.preferredLanguage || "Hindi";

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-[#171a3d]">
      <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-3 bg-[#151838] px-4 py-2 text-white shadow-sm sm:px-6">
        <Link href="/english-guru" className="text-lg font-extrabold tracking-tight sm:text-xl">
          Lead Onto <span className="font-medium text-indigo-200">English Guru</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-bold sm:gap-3">
          <Link href="/progress" className="rounded-full bg-white/10 px-3 py-2 hover:bg-white/20" aria-label="View progress">
            <Flame className="mr-1 inline h-4 w-4 text-orange-300" /> Practice
          </Link>
          <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffe2d3] text-base font-bold text-[#96350e]" aria-label="Open profile">
            <UserCircle className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-3 pb-24 pt-4 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:pb-6">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              return item.anchor ? (
                <a key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-[#c9410b] hover:bg-white">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span><span className="block font-bold">{item.label}</span><span className="text-xs text-slate-500">{item.sub}</span></span>
                </a>
              ) : (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-[#c9410b] hover:bg-white">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span><span className="block font-bold">{item.label}</span><span className="text-xs text-slate-500">{item.sub}</span></span>
                </Link>
              );
            })}
            <div className="rounded-xl border border-[#e9e3dd] bg-white p-3">
              <label htmlFor="guru-language" className="mb-2 flex items-center gap-2 text-sm font-bold"><Globe2 className="h-4 w-4" /> भाषा बदलें</label>
              <select id="guru-language" value={language} onChange={(e) => updateProfile({ preferredLanguage: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm">
                {["English", "Hindi", ...INDIAN_LANGUAGES.filter((l) => l !== "Hindi")].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#eee6df] bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-bold text-[#171a3d]">नमस्ते! आज थोड़ी अंग्रेज़ी बोलें।</p>
              <p className="text-xs text-slate-500">Your English practice space</p>
            </div>
            <Link href="/progress" className="shrink-0 rounded-full bg-[#fff0e7] px-3 py-2 text-xs font-bold text-[#bd3e0a] hover:bg-[#ffe2d3]">My progress</Link>
          </div>
          <EnglishGuru embedded />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#e7e1dc] bg-white/95 px-1 py-2 backdrop-blur lg:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const content = <><Icon className="h-5 w-5" /><span className="text-[11px] font-semibold">{item.label}</span></>;
          return item.anchor ? (
            <a key={item.href} href={item.href} className="flex flex-col items-center gap-1 py-1 text-[#c9410b]">{content}</a>
          ) : (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 py-1 text-slate-600 hover:text-[#c9410b]">{content}</Link>
          );
        })}
      </nav>
    </div>
  );
}
