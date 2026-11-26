import { Link } from "wouter";
import { ArrowLeft, BookMarked, Volume2 } from "lucide-react";
import { useGamification } from "@/lib/use-gamification";
import { useProgress } from "@/lib/use-progress";
import { PageMeta } from "@/components/page-meta";
import { GuruHomeButton } from "@/components/navigation/guru-home-button";

export default function EnglishGuruWords() {
  const { streak } = useProgress();
  const gam = useGamification(streak);

  return (
    <main className="min-h-screen bg-[#f7f5f2] px-4 py-6 text-[#171a3d]">
      <PageMeta title="मेरे शब्द · My Words — English Guru" description="Your saved English vocabulary." />
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-5">
          <GuruHomeButton variant="pill" />
          <Link
            href="/english-guru/app"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#bd3e0a] hover:underline min-h-[44px] px-3 py-2 rounded-xl bg-orange-50 border border-orange-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>सीखें पर वापस · Back to Guru</span>
          </Link>
        </div>

        <section className="rounded-2xl border border-[#e9e3dd] bg-white p-5 shadow-xs sm:p-7">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0e7] text-[#bd3e0a]">
              <BookMarked className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold">मेरे शब्द · My Words</h1>
              <p className="text-xs sm:text-sm text-slate-500">{gam.wordsLearned.length} शब्द सीखे गए (words saved)</p>
            </div>
          </div>

          {gam.wordsLearned.length ? (
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {gam.wordsLearned.map((word) => (
                <li
                  key={word}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
                >
                  <span className="text-base font-bold">{word}</span>
                  <span className="text-xs text-slate-500">सीखा हुआ · Learned</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#e4d7ce] bg-[#fffaf6] px-5 py-8 text-center">
              <p className="font-bold text-slate-800">आपकी शब्द सूची अभी ख़ाली है।</p>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                During English practice, tap any highlighted word to hear its pronunciation and meaning, and save it here.
              </p>
              <Link
                href="/english-guru/app"
                className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[#c9410b] px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#a93609] active:scale-95 transition-transform"
              >
                अभ्यास शुरू करें · Start Practising
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
