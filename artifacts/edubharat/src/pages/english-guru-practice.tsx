import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  X, Flame, Volume2, Mic, Clock, HelpCircle, Check, ChevronRight, Sparkles,
} from "lucide-react";
import { useProgress } from "@/lib/use-progress";
import { useGamification } from "@/lib/use-gamification";
import { useGoogleTTS } from "@/lib/use-edge-tts";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { useStudentProfile } from "@/lib/use-student-profile";
import { PageMeta } from "@/components/page-meta";
import { GURU_FONT } from "@/components/english/guru-theme";
import { GuruHomeButton } from "@/components/navigation/guru-home-button";

/**
 * English Guru — “Say this sentence” speaking drill.
 *
 * One sentence at a time: the learner taps any word for its meaning and
 * pronunciation, listens to a slow model reading, then speaks the sentence and
 * gets per-word feedback. Mirrors the supplied mobile mockup: progress bar,
 * streak pill, tappable underlined words, mic with live waveform, and a green
 * result panel that pays XP.
 */

type WordMeaning = { hi: string; translit: string };

type Drill = {
  en: string;
  translit: string;
  hi: string;
  words: Record<string, WordMeaning>;
};

const DRILLS: Drill[] = [
  {
    en: "What do you do?",
    translit: "व्हॉट डू यू डू?",
    hi: "आप क्या काम करते हैं?",
    words: {
      what: { hi: "क्या", translit: "व्हॉट" },
      do: { hi: "करना", translit: "डू" },
      you: { hi: "आप", translit: "यू" },
    },
  },
  {
    en: "My name is Mohan.",
    translit: "माय नेम इज़ मोहन",
    hi: "मेरा नाम मोहन है।",
    words: {
      my: { hi: "मेरा", translit: "माय" },
      name: { hi: "नाम", translit: "नेम" },
      is: { hi: "है", translit: "इज़" },
      mohan: { hi: "मोहन (नाम)", translit: "मोहन" },
    },
  },
  {
    en: "I am from Delhi.",
    translit: "आई एम फ्रॉम दिल्ली",
    hi: "मैं दिल्ली से हूँ।",
    words: {
      i: { hi: "मैं", translit: "आई" },
      am: { hi: "हूँ", translit: "एम" },
      from: { hi: "से", translit: "फ्रॉम" },
      delhi: { hi: "दिल्ली (शहर)", translit: "दिल्ली" },
    },
  },
  {
    en: "I work in an office.",
    translit: "आई वर्क इन एन ऑफ़िस",
    hi: "मैं दफ़्तर में काम करता हूँ।",
    words: {
      i: { hi: "मैं", translit: "आई" },
      work: { hi: "काम करना", translit: "वर्क" },
      in: { hi: "में", translit: "इन" },
      an: { hi: "एक", translit: "एन" },
      office: { hi: "दफ़्तर", translit: "ऑफ़िस" },
    },
  },
  {
    en: "How are you today?",
    translit: "हाउ आर यू टुडे?",
    hi: "आज आप कैसे हैं?",
    words: {
      how: { hi: "कैसे", translit: "हाउ" },
      are: { hi: "हैं", translit: "आर" },
      you: { hi: "आप", translit: "यू" },
      today: { hi: "आज", translit: "टुडे" },
    },
  },
  {
    en: "I would like some tea.",
    translit: "आई वुड लाइक सम टी",
    hi: "मुझे थोड़ी चाय चाहिए।",
    words: {
      i: { hi: "मैं", translit: "आई" },
      would: { hi: "चाहूँगा", translit: "वुड" },
      like: { hi: "पसंद/चाहना", translit: "लाइक" },
      some: { hi: "थोड़ा", translit: "सम" },
      tea: { hi: "चाय", translit: "टी" },
    },
  },
  {
    en: "Where is the market?",
    translit: "व्हेयर इज़ द मार्केट?",
    hi: "बाज़ार कहाँ है?",
    words: {
      where: { hi: "कहाँ", translit: "व्हेयर" },
      is: { hi: "है", translit: "इज़" },
      the: { hi: "(निश्चित)", translit: "द" },
      market: { hi: "बाज़ार", translit: "मार्केट" },
    },
  },
  {
    en: "Thank you very much.",
    translit: "थैंक यू वेरी मच",
    hi: "बहुत-बहुत धन्यवाद।",
    words: {
      thank: { hi: "धन्यवाद", translit: "थैंक" },
      you: { hi: "आप", translit: "यू" },
      very: { hi: "बहुत", translit: "वेरी" },
      much: { hi: "अधिक", translit: "मच" },
    },
  },
];

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[b.length]!;
}

/** A spoken word counts as correct when it is at least 75% similar. */
function wordMatches(target: string, spoken: string): boolean {
  if (!target || !spoken) return false;
  if (target === spoken) return true;
  const distance = levenshtein(target, spoken);
  return 1 - distance / Math.max(target.length, spoken.length) >= 0.75;
}

type WordResult = { word: string; correct: boolean };

export default function EnglishGuruPractice() {
  const { streak } = useProgress();
  const gam = useGamification(streak);
  const { profile } = useStudentProfile();
  const tts = useGoogleTTS();
  const [index, setIndex] = useState(0);
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [result, setResult] = useState<WordResult[] | null>(null);
  const [heard, setHeard] = useState("");
  const [awarded, setAwarded] = useState(false);

  const drill = DRILLS[index]!;
  const total = DRILLS.length;
  const targetWords = useMemo(
    () => drill.en.split(/\s+/).map(normalizeWord).filter(Boolean),
    [drill.en],
  );

  const recognizedRef = useRef(false);

  const mic = useSpeechRecognition("English", { silenceMs: 1_400 });

  const scoreAttempt = useCallback((spoken: string) => {
    const spokenWords = spoken.split(/\s+/).map(normalizeWord).filter(Boolean);
    let cursor = 0;
    const scored: WordResult[] = targetWords.map((target) => {
      // Match each target word against the remaining spoken words in order so a
      // repeated word (“do … do”) is scored twice rather than once.
      for (let i = cursor; i < spokenWords.length; i++) {
        if (wordMatches(target, spokenWords[i]!)) {
          cursor = i + 1;
          return { word: target, correct: true };
        }
      }
      return { word: target, correct: false };
    });
    const correct = scored.filter((w) => w.correct).length;
    setResult(scored);
    setHeard(spoken);
    if (correct > 0 && !awarded) {
      gam.award("message");
      setAwarded(true);
    }
  }, [targetWords, awarded, gam]);

  const startListening = useCallback(() => {
    setResult(null);
    setHeard("");
    recognizedRef.current = false;
    mic.start((text) => {
      if (recognizedRef.current) return;
      recognizedRef.current = true;
      if (!text.trim()) {
        setResult(targetWords.map((word) => ({ word, correct: false })));
        return;
      }
      scoreAttempt(text);
    });
  }, [mic, scoreAttempt, targetWords]);

  const stopListening = useCallback(() => mic.stop(), [mic]);

  useEffect(() => () => { mic.stop(); tts.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const speakSentence = useCallback((rate: number) => {
    setOpenWord(null);
    void tts.speak(drill.en, "English", undefined, { rate, voiceStyle: "priya" });
  }, [tts, drill.en]);

  const speakWord = useCallback((word: string) => {
    setOpenWord((current) => (current === word ? null : word));
    void tts.speak(word, "English", undefined, { rate: 0.75, voiceStyle: "priya" });
  }, [tts]);

  const next = useCallback(() => {
    mic.stop();
    tts.stop();
    setResult(null);
    setHeard("");
    setOpenWord(null);
    setAwarded(false);
    setIndex((i) => (i + 1) % total);
  }, [mic, tts, total]);

  const correctCount = result?.filter((w) => w.correct).length ?? 0;
  const allCorrect = result !== null && correctCount === targetWords.length;
  const progress = Math.round(((index + (result ? 1 : 0)) / total) * 100);
  const name = profile.name?.trim();
  const listening = mic.isListening;

  // Waveform bars driven by live microphone level while listening, idle otherwise.
  const bars = useMemo(() => {
    const level = listening ? Math.min(1, mic.audioLevel * 9) : 0.12;
    return Array.from({ length: 9 }, (_, i) => {
      const shape = [0.45, 0.8, 1, 0.65, 0.95, 0.55, 0.85, 0.4, 0.7][i]!;
      return Math.max(0.12, level * shape);
    });
  }, [listening, mic.audioLevel]);

  return (
    <div className="min-h-screen bg-[#f7f5f2] pb-28 text-[#191a2f]" style={{ fontFamily: GURU_FONT }}>
      <PageMeta title="Say this sentence — English Guru" description="Practise speaking English sentences with instant feedback." />

      <header className="sticky top-0 z-40 bg-[#f7f5f2]/95 backdrop-blur border-b border-slate-200/60">
        <div className="mx-auto flex max-w-2xl items-center gap-2 sm:gap-3 px-3 py-2.5">
          <GuruHomeButton
            isDirty={index > 0 || result !== null || listening}
            onLeave={() => { mic.stop(); tts.stop(); }}
            variant="pill"
          />
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e4e0da]">
            <div className="h-full rounded-full bg-[#168342] transition-[width] duration-300" style={{ width: `${Math.max(6, progress)}%` }} />
          </div>
          <span className="flex items-center gap-1 text-sm font-extrabold text-[#d8400c] shrink-0">
            <Flame className="h-4 w-4" />{streak}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        <div className="mt-2">
          <h1 className="text-xl font-extrabold">इस वाक्य को बोलिए</h1>
          <p className="text-sm font-semibold text-slate-500">Say this sentence · {index + 1} / {total}</p>
        </div>

        <section className="mt-4 rounded-3xl border border-[#e6e1da] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffe2d3] font-extrabold text-[#a43a13]">P</div>
            <button
              type="button"
              onClick={() => speakSentence(1)}
              aria-label="Play the sentence"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#efedfb] text-[#4b3fae] hover:bg-[#e4e0fa]"
            >
              <Volume2 className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-extrabold leading-snug">
                {drill.en.split(/\s+/).map((raw, i) => {
                  const key = normalizeWord(raw);
                  return (
                    <button
                      key={`${raw}-${i}`}
                      type="button"
                      onClick={() => speakWord(key)}
                      className={`mr-1 border-b-2 border-dashed pb-0.5 ${openWord === key ? "border-[#4b3fae] text-[#4b3fae]" : "border-[#9db7e8]"}`}
                    >
                      {raw}
                    </button>
                  );
                })}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{drill.translit}</p>
              <p className="mt-1 text-base font-semibold text-slate-700">{drill.hi}</p>
            </div>
          </div>

          {openWord && drill.words[openWord] && (
            <div className="mt-4 rounded-2xl border border-[#e6e1da] bg-[#faf8f5] px-4 py-3">
              <p className="text-sm font-extrabold capitalize">{openWord}</p>
              <p className="text-sm text-slate-600">{drill.words[openWord]!.hi} · {drill.words[openWord]!.translit}</p>
            </div>
          )}
        </section>

        <p className="mt-4 text-center text-xs font-semibold text-slate-500">
          किसी भी शब्द पर टैप करें, उसका मतलब और आवाज़ मिलेगी
        </p>

        <div className="mt-4 flex justify-center gap-3">
          <button type="button" onClick={() => speakSentence(0.6)} className="inline-flex items-center gap-2 rounded-full border border-[#d9d3ca] bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-[#b9b1a6]">
            <Clock className="h-4 w-4" /> धीरे सुनें
          </button>
          <button type="button" onClick={() => setOpenWord(Object.keys(drill.words)[0] ?? null)} className="inline-flex items-center gap-2 rounded-full border border-[#d9d3ca] bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-[#b9b1a6]">
            <HelpCircle className="h-4 w-4" /> मदद चाहिए
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="flex items-end gap-1" aria-hidden="true">
            {bars.slice(0, 4).map((h, i) => (
              <span key={`l${i}`} className="w-1.5 rounded-full bg-[#e8825c] transition-all duration-100" style={{ height: `${8 + h * 34}px` }} />
            ))}
          </div>
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            aria-label={listening ? "Stop recording" : "Start speaking"}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[0_8px_0_rgba(0,0,0,0.14)] transition active:translate-y-0.5 ${listening ? "bg-[#b8370a] ring-8 ring-[#ffd9c6]" : "bg-[#c9410b] hover:bg-[#b8370a]"}`}
          >
            <Mic className="h-9 w-9" />
          </button>
          <div className="flex items-end gap-1" aria-hidden="true">
            {bars.slice(5).map((h, i) => (
              <span key={`r${i}`} className="w-1.5 rounded-full bg-[#e8825c] transition-all duration-100" style={{ height: `${8 + h * 34}px` }} />
            ))}
          </div>
        </div>

        <p className="mt-3 text-center text-xs font-bold text-slate-500">
          {listening ? "सुन रहे हैं… बोलिए" : mic.status === "processing" ? "समझ रहे हैं…" : "माइक दबाकर वाक्य बोलिए"}
        </p>

        {mic.error && (
          <p className="mt-2 text-center text-xs font-semibold text-red-600">{mic.error}</p>
        )}

        {result && (
          <section className={`mt-6 rounded-3xl border p-4 ${allCorrect ? "border-[#bfe3c9] bg-[#e9f7ed]" : "border-[#f0dcc4] bg-[#fdf4e7]"}`}>
            <div className="flex items-center justify-between">
              <p className={`flex items-center gap-2 text-lg font-extrabold ${allCorrect ? "text-[#15763d]" : "text-[#a8580b]"}`}>
                <Sparkles className="h-5 w-5" />
                {allCorrect ? "बहुत बढ़िया!" : correctCount > 0 ? "अच्छी कोशिश!" : "फिर से कोशिश करें"}
              </p>
              {correctCount > 0 && (
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold text-white ${allCorrect ? "bg-[#15763d]" : "bg-[#a8580b]"}`}>
                  +10 XP
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {result.map((w, i) => (
                <span
                  key={`${w.word}-${i}`}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${w.correct ? "bg-white text-[#15763d]" : "bg-[#fdf0b8] text-[#8a6a08]"}`}
                >
                  {w.word}
                  {w.correct ? <Check className="h-3.5 w-3.5" /> : <span className="text-xs font-semibold">· थोड़ा साफ़ बोलिए</span>}
                </span>
              ))}
            </div>

            {heard && (
              <p className="mt-3 text-xs text-slate-600">हमने सुना: “{heard}”</p>
            )}

            <button
              type="button"
              onClick={next}
              className="mt-4 flex h-12 w-full items-center justify-center gap-1 rounded-2xl bg-[#15763d] text-sm font-extrabold text-white hover:bg-[#116030]"
            >
              आगे बढ़ें · Next <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        )}

        {!result && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#e6e1da] bg-white px-4 py-3">
            <p className="text-sm font-bold">
              {name ? `${name}, ` : ""}आज का XP: <span className="text-[#c9410b]">{gam.dailyXp}</span> / {gam.dailyGoal}
            </p>
            <Link href="/english-guru/words" className="text-xs font-extrabold text-[#4b3fae] hover:underline">मेरे शब्द</Link>
          </div>
        )}
      </main>
    </div>
  );
}
