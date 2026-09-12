import { useMemo } from "react";
import { Volume2, MessageSquarePlus, X, BookOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORD_MAP, CATEGORY_THEME, type WordPowerEntry } from "@/lib/word-power";

export function WordPowerText({
  text,
  onWordClick,
  learnedWords,
}: {
  text: string;
  onWordClick: (entry: WordPowerEntry) => void;
  learnedWords?: string[];
}) {
  const parts = useMemo(() => {
    const nodes: Array<{ kind: "text" | "word"; value: string; entry?: WordPowerEntry }> = [];
    const re = /[A-Za-z][a-z'-]{2,}/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let used = 0;
    while ((match = re.exec(text)) !== null && used < 6) {
      const token = match[0].toLowerCase().replace(/['-]/g, "");
      const entry = WORD_MAP.get(token) ?? WORD_MAP.get(token.replace(/(ing|ed|es|s)$/, ""));
      if (!entry) continue;
      if (match.index > last) nodes.push({ kind: "text", value: text.slice(last, match.index) });
      nodes.push({ kind: "word", value: match[0], entry });
      last = match.index + match[0].length;
      used += 1;
    }
    nodes.push({ kind: "text", value: text.slice(last) });
    return nodes;
  }, [text]);

  return (
    <>
      {parts.map((part, i) =>
        part.kind === "word" && part.entry ? (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); onWordClick(part.entry!); }}
            className={`inline cursor-pointer rounded-sm px-0.5 font-semibold underline decoration-dotted decoration-2 underline-offset-4 transition-colors ${
              learnedWords?.includes(part.entry.word)
                ? "text-emerald-700 decoration-emerald-500 hover:bg-emerald-100"
                : "text-orange-700 decoration-orange-400 hover:bg-orange-100"
            }`}
            title={`Tap to learn "${part.entry.word}" with a picture card`}
          >
            {part.value}
          </button>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </>
  );
}

function WordArt({ entry }: { entry: WordPowerEntry }) {
  const theme = CATEGORY_THEME[entry.category];
  const gid = `wg-${entry.category}`;
  return (
    <svg viewBox="0 0 320 140" className="h-full w-full" role="img" aria-label={`${theme.label}: ${entry.word}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={theme.from} />
          <stop offset="100%" stopColor={theme.to} />
        </linearGradient>
      </defs>
      <rect width="320" height="140" fill={`url(#${gid})`} />
      <circle cx="272" cy="26" r="34" fill="rgba(255,255,255,0.16)" />
      <circle cx="36" cy="118" r="26" fill="rgba(255,255,255,0.12)" />
      {entry.category === "success" && (
        <g fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 108 L110 60 L160 84 L250 30" />
          <path d="M222 30 h28 v28" fill="none" />
          <path d="M60 118 l6 6 12-14" strokeWidth="4" />
        </g>
      )}
      {entry.category === "work" && (
        <g fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round">
          <rect x="96" y="46" width="128" height="72" rx="10" />
          <path d="M132 46 v-8 a12 12 0 0 1 12-12 h32 a12 12 0 0 1 12 12 v8" />
          <path d="M96 74 h128" />
          <circle cx="160" cy="74" r="7" fill="rgba(255,255,255,0.9)" stroke="none" />
        </g>
      )}
      {entry.category === "emotion" && (
        <g fill="rgba(255,255,255,0.92)">
          <path d="M160 112 C120 88 96 68 96 48 a26 26 0 0 1 46-16 l18 16 18-16 a26 26 0 0 1 46 16 c0 20-24 40-64 64z" />
        </g>
      )}
      {entry.category === "mind" && (
        <g fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round">
          <path d="M160 26 a34 34 0 0 1 34 34 c0 14-8 22-14 30-4 6-6 10-6 16 h-28 c0-6-2-10-6-16-6-8-14-16-14-30 a34 34 0 0 1 34-34z" />
          <path d="M146 118 h28" /><path d="M150 128 h20" />
        </g>
      )}
      {entry.category === "social" && (
        <g fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M70 40 h120 a14 14 0 0 1 14 14 v36 a14 14 0 0 1-14 14 h-70 l-26 20 v-20 h-24 a14 14 0 0 1-14-14 v-36 a14 14 0 0 1 14-14z" />
          <path d="M120 62 h60 M120 80 h38" />
        </g>
      )}
      {entry.category === "travel" && (
        <g fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="160" cy="70" r="44" />
          <path d="M116 70 h88 M160 26 c14 12 14 76 0 88 c-14-12-14-76-0-88z" />
          <path d="M126 44 c20 10 48 10 68 0 M126 96 c20-10 48-10 68 0" strokeWidth="3.5" />
        </g>
      )}
      {entry.category === "time" && (
        <g fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round">
          <circle cx="160" cy="72" r="42" />
          <path d="M160 46 v26 l18 12" />
          <path d="M138 22 h44" strokeWidth="4" />
        </g>
      )}
      {entry.category === "quality" && (
        <g fill="rgba(255,255,255,0.92)">
          <path d="M160 22 l14 30 33 4-24 22 6 33-29-16-29 16 6-33-24-22 33-4z" />
        </g>
      )}
      <text x="160" y="132" textAnchor="middle" fontSize="13" fontWeight="700" fill="rgba(255,255,255,0.95)" style={{ textTransform: "uppercase", letterSpacing: 2 }}>
        {theme.label}
      </text>
    </svg>
  );
}

export function WordPowerPopup({
  entry,
  learned,
  onHear,
  onPractice,
  onLearned,
  onClose,
}: {
  entry: WordPowerEntry;
  learned: boolean;
  onHear: (text: string) => void;
  onPractice: (entry: WordPowerEntry) => void;
  onLearned: (entry: WordPowerEntry) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Word Power card for ${entry.word}`}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border bg-white shadow-2xl">
        <div className="relative h-36">
          <WordArt entry={entry} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close word card"
            className="absolute right-3 top-3 rounded-full bg-black/30 p-1.5 text-white transition-colors hover:bg-black/50"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute -bottom-5 left-5 flex items-end gap-2">
            <span className="rounded-2xl bg-white px-4 py-2 text-2xl font-extrabold text-slate-800 shadow-lg">{entry.word}</span>
            <span className="mb-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow">{entry.pos}</span>
          </div>
        </div>
        <div className="space-y-3 px-5 pb-5 pt-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Meaning</p>
            <p className="text-[15px] font-medium leading-snug text-slate-800">{entry.meaning}</p>
            <p className="mt-0.5 text-[15px] font-semibold text-orange-700">{entry.hindi}</p>
          </div>
          <div className="rounded-xl bg-orange-50 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">Example</p>
            <p className="text-sm italic leading-snug text-slate-700">"{entry.example}"</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs font-bold" onClick={() => onHear(`${entry.word}. ${entry.example}`)}>
              <Volume2 className="h-3.5 w-3.5" />Hear it
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs font-bold" onClick={() => onPractice(entry)}>
              <MessageSquarePlus className="h-3.5 w-3.5" />Use it in a sentence
            </Button>
            <Button
              size="sm"
              className={`ml-auto h-9 gap-1.5 text-xs font-bold ${learned ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-500 hover:bg-orange-600"}`}
              onClick={() => onLearned(entry)}
              disabled={learned}
            >
              {learned ? <><Check className="h-3.5 w-3.5" />Learned</> : <><BookOpen className="h-3.5 w-3.5" />+8 XP · Got it</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CelebrationOverlay({
  title,
  subtitle,
  onDismiss,
}: {
  title: string;
  subtitle: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[10002] flex items-center justify-center bg-slate-950/40 px-4"
      onClick={onDismiss}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") onDismiss(); }}
      role="button"
      tabIndex={0}
      aria-label="Dismiss celebration"
      aria-live="polite"
    >
      <div className="animate-[celebration-pop_0.45s_ease-out] rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-orange-100 px-8 py-6 text-center shadow-2xl">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-black text-white shadow-lg">★</div>
        <p className="text-xl font-extrabold text-orange-800">{title}</p>
        <p className="mt-1 max-w-xs text-sm font-medium text-orange-700/80">{subtitle}</p>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-orange-500">tap anywhere to continue</p>
      </div>
      <style>{`@keyframes celebration-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}