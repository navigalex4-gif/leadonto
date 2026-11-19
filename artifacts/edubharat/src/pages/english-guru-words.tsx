import { Link } from "wouter";
import { ArrowLeft, BookMarked } from "lucide-react";
import { useGamification } from "@/lib/use-gamification";
import { useProgress } from "@/lib/use-progress";
import { PageMeta } from "@/components/page-meta";

export default function EnglishGuruWords() {
  const { streak } = useProgress();
  const gam = useGamification(streak);
  return (
    <main className="min-h-screen bg-[#f7f5f2] px-4 py-8 text-[#171a3d]">
      <PageMeta title="My Words — English Guru" description="Your saved English vocabulary." />
      <div className="mx-auto max-w-3xl">
        <Link href="/english-guru/app" className="inline-flex items-center gap-2 text-sm font-semibold text-[#bd3e0a] hover:underline"><ArrowLeft className="h-4 w-4" /> Back to English Guru</Link>
        <section className="mt-5 rounded-2xl border border-[#e9e3dd] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0e7] text-[#bd3e0a]"><BookMarked className="h-5 w-5" /></div>
            <div><h1 className="text-2xl font-extrabold">मेरे शब्द · My Words</h1><p className="text-sm text-slate-500">{gam.wordsLearned.length} words saved</p></div>
          </div>
          {gam.wordsLearned.length ? (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {gam.wordsLearned.map((word) => <li key={word} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold">{word}</li>)}
            </ul>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[#e4d7ce] bg-[#fffaf6] px-5 py-8 text-center">
              <p className="font-bold">Your word collection is empty.</p>
              <p className="mt-1 text-sm text-slate-500">During English practice, tap a highlighted word and mark it as learned to save it here.</p>
              <Link href="/english-guru/app" className="mt-4 inline-flex rounded-xl bg-[#c9410b] px-5 py-3 text-sm font-bold text-white hover:bg-[#a93609]">Start practising</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
