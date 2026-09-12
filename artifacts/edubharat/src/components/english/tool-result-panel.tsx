import { useState } from "react";
import { ArrowRight, Bookmark, BookmarkCheck, Download, Image as ImageIcon, Lightbulb, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatGeneratedText, type Mode } from "@/lib/english-tools";

const HIGHLIGHT_STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "being", "below", "could", "daily",
  "first", "from", "have", "into", "just", "lesson", "more", "only", "other",
  "practice", "should", "that", "their", "there", "these", "this", "today",
  "using", "what", "when", "where", "which", "with", "would", "your",
]);

const MEMORY_VISUALS: Record<Mode, { emoji: string; label: string; caption: string }> = {
  grammar: { emoji: "✍️", label: "Say it clearly", caption: "See the correction, then say the improved sentence out loud." },
  write: { emoji: "💼", label: "Sound professional", caption: "Picture yourself using this polished phrase at work." },
  vocab: { emoji: "🧠", label: "Make it stick", caption: "Connect the new word to a vivid picture before you repeat it." },
  pronounce: { emoji: "🔊", label: "Hear the rhythm", caption: "Look at the word, listen once, then copy the rhythm." },
  lesson: { emoji: "🌱", label: "Grow one step", caption: "Keep one useful idea from today and use it in a real sentence." },
  interview_english: { emoji: "🎯", label: "Answer with confidence", caption: "Imagine saying this calmly in your next interview." },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLearningHighlights(content: string, mode: Mode): string[] {
  const explicit = mode === "vocab"
    ? content
      .split(/\n/)
      .map((line) => line.match(/^\s*(?:\d+[.)]\s*)?([A-Za-z][A-Za-z'-]{3,})\s*(?:—|-|:)/)?.[1])
      .filter((word): word is string => Boolean(word))
    : [];
  const words = content.match(/\b[A-Za-z][A-Za-z'-]{4,}\b/g) ?? [];
  return [...new Set([...explicit, ...words].filter((word) => !HIGHLIGHT_STOP_WORDS.has(word.toLowerCase())))]
    .slice(0, 4);
}

function getLearningSummary(content: string): string {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const candidate = lines
    .flatMap((line) => line.split(/[.!?]+\s+/u))
    .find((sentence) => sentence.length >= 42 && !/^(?:\d+[.)]|today's topic|why it matters|key words)/iu.test(sentence));
  const summary = candidate ?? lines.find((line) => line.length >= 25) ?? lines[0] ?? "A focused practice note is ready for you.";
  return summary.length > 170 ? `${summary.slice(0, 167).trimEnd()}…` : summary;
}

function HighlightedLearningText({ content, highlights }: { content: string; highlights: string[] }) {
  const pattern = highlights.length
    ? new RegExp(`\\b(${highlights.map(escapeRegExp).join("|")})\\b`, "gi")
    : null;

  return (
    <div className="space-y-1.5 whitespace-pre-wrap">
      {content.split("\n").map((line, index) => (
        <span key={`${index}-${line.slice(0, 12)}`} className="block">
          {pattern
            ? line.split(pattern).map((part, partIndex) => {
              const highlighted = highlights.some((word) => word.toLowerCase() === part.toLowerCase());
              return highlighted
                ? <mark key={`${index}-${partIndex}`} className="rounded bg-orange-300/25 px-1 font-bold text-orange-100">{part}</mark>
                : <span key={`${index}-${partIndex}`}>{part}</span>;
            })
            : line}
        </span>
      ))}
    </div>
  );
}

export function ToolResultPanel({
  title,
  content,
  isSpeaking,
  onSpeak,
  onStop,
  onSave,
  saved,
  onDownload,
  mode,
  coachName,
  coachImage,
  coachAccent,
}: {
  title: string;
  content: string;
  isSpeaking: boolean;
  onSpeak: () => void;
  onStop: () => void;
  onSave: () => void;
  saved: boolean;
  onDownload?: () => void;
  mode: Mode;
  coachName: string;
  coachImage?: string;
  coachAccent?: string;
}) {
  const [memoryOpen, setMemoryOpen] = useState(false);
  const cleanContent = formatGeneratedText(content);
  const highlights = getLearningHighlights(cleanContent, mode);
  const summary = getLearningSummary(cleanContent);
  const visual = MEMORY_VISUALS[mode];
  const memoryWord = highlights[0] ?? visual.label;

  return (
    <>
      <section className="relative mt-4 overflow-hidden rounded-[1.35rem] border border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-indigo-50 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <div className="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full bg-orange-200/30 blur-2xl" />
        <div className="relative flex items-center justify-between gap-3 border-b border-orange-100/80 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {coachImage ? (
              <img
                src={coachImage}
                alt=""
                width={38}
                height={38}
                className="h-9 w-9 shrink-0 rounded-xl object-cover object-top ring-2 ring-white shadow-sm"
                style={{ borderColor: coachAccent ?? "#f97316" }}
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#11184b] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-orange-600">AI coach note</p>
              <p className="truncate text-xs font-semibold text-slate-700">{coachName} prepared this for you</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Ready to practise
          </span>
        </div>

        <div className="relative space-y-3 p-3 sm:p-4">
          <div className="max-w-[96%] rounded-2xl rounded-tl-md bg-[#11184b] px-4 py-3 text-sm leading-relaxed text-white shadow-md sm:max-w-[92%]">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-orange-200">
              <Sparkles className="h-3 w-3" />
              {title}
            </div>
            <div className="max-h-[25rem] overflow-y-auto pr-1">
              <HighlightedLearningText content={cleanContent} highlights={highlights} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_0.82fr]">
            <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-700">
                <Lightbulb className="h-3.5 w-3.5" />
                Quick summary
              </div>
              <p className="text-xs leading-relaxed text-slate-700">{summary}</p>
              {highlights.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {highlights.map((word) => (
                    <span key={word} className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700">
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMemoryOpen(true)}
              className="group flex min-h-[118px] items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50"
            >
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 text-white shadow-md">
                <span className="text-3xl leading-none" aria-hidden="true">{visual.emoji}</span>
                <span className="mt-1 text-[8px] font-extrabold uppercase tracking-wide">Picture cue</span>
              </div>
              <span className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-600">Remember it</span>
                <span className="mt-1 block text-sm font-extrabold text-slate-800">{memoryWord}</span>
                <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                  Open memory card <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-1.5 border-t border-orange-100/80 pt-2">
            <Button variant="ghost" size="sm" onClick={isSpeaking ? onStop : onSpeak} className="h-8 text-xs font-semibold text-slate-700">
              {isSpeaking ? <><VolumeX className="mr-1 h-3.5 w-3.5" />Stop</> : <><Volume2 className="mr-1 h-3.5 w-3.5" />Speak</>}
            </Button>
            <Button variant="outline" size="sm" onClick={onSave} disabled={saved} className="h-8 bg-white/70 text-xs font-semibold">
              {saved ? <><BookmarkCheck className="mr-1 h-3.5 w-3.5 text-primary" />Saved</> : <><Bookmark className="mr-1 h-3.5 w-3.5" />Save</>}
            </Button>
            {onDownload && (
              <Button variant="ghost" size="sm" onClick={onDownload} className="h-8 text-xs font-semibold text-slate-700">
                <Download className="mr-1 h-3.5 w-3.5" />Download
              </Button>
            )}
          </div>
        </div>
      </section>

      {memoryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close memory card"
            onClick={() => setMemoryOpen(false)}
          />
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-white/20 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Memory card for ${memoryWord}`}
          >
            <div className="relative flex min-h-64 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#11184b] via-indigo-700 to-orange-500 px-6 py-8 text-center text-white">
              <button type="button" onClick={() => setMemoryOpen(false)} className="absolute right-3 top-3 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25" aria-label="Close memory card">
                <X className="h-4 w-4" />
              </button>
              <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/15 text-6xl shadow-inner ring-1 ring-white/30" aria-hidden="true">{visual.emoji}</div>
              <p className="relative mt-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-100">{visual.label}</p>
              <h3 className="relative mt-1 text-2xl font-display font-extrabold">{memoryWord}</h3>
            </div>
            <div className="space-y-3 p-5">
              <div className="rounded-2xl bg-orange-50 p-3 text-sm leading-relaxed text-slate-700">
                <ImageIcon className="mb-1 h-4 w-4 text-orange-500" />
                {visual.caption}
              </div>
              <Button type="button" className="w-full font-bold" onClick={() => setMemoryOpen(false)}>Back to practice</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}