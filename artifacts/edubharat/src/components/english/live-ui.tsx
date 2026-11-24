import { useMemo } from "react";
import { Volume2, Play, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { WordPowerText } from "@/components/english/word-power";
import type { WordPowerEntry } from "@/lib/word-power";

/**
 * English Guru live-conversation UI pieces.
 *
 * Everything here is presentational: the page owns conversation state, speech
 * recognition, and TTS. These components only render and call back.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Native-script helpers
// ─────────────────────────────────────────────────────────────────────────────

const NATIVE_SCRIPT_RANGES: Record<string, RegExp> = {
  Hindi: /[ऀ-ॿ]/u,
  Marathi: /[ऀ-ॿ]/u,
  Bengali: /[ঀ-৿]/u,
  Assamese: /[ঀ-৿]/u,
  Punjabi: /[਀-੿]/u,
  Gujarati: /[઀-૿]/u,
  Odia: /[଀-୿]/u,
  Tamil: /[஀-௿]/u,
  Telugu: /[ఀ-౿]/u,
  Kannada: /[ಀ-೿]/u,
  Malayalam: /[ഀ-ൿ]/u,
  Urdu: /[؀-ۿ]/u,
};

/** True when `text` already contains characters from the language's own script. */
export function hasNativeScript(text: string, language: string): boolean {
  const range = NATIVE_SCRIPT_RANGES[language];
  return range ? range.test(text) : false;
}

/** Strip stray Latin words so a string is purely the given native script. */
export function keepOnlyNativeScript(text: string, language: string): string {
  const range = NATIVE_SCRIPT_RANGES[language];
  if (!range) return text;
  return text
    .split(/\s+/)
    .filter((word) => range.test(word) || !/[\p{L}\p{N}]/u.test(word))
    .join(" ")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilingual voice control bar
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceState = "off" | "listening" | "thinking" | "speaking" | "paused";

const VOICE_COPY: Record<VoiceState, { hi: string; en: string; hint: string }> = {
  off: { hi: "बोलने के लिए दबाएँ", en: "Tap to Speak", hint: "Tap Live to start a voice conversation" },
  listening: { hi: "सुन रहे हैं… बोलिए", en: "Listening", hint: "Speak in English or your language" },
  thinking: { hi: "सोच रही हैं…", en: "Thinking", hint: "Priya is putting her reply together" },
  speaking: { hi: "प्रिया मैम बोल रही हैं…", en: "Priya Ma'am Speaking", hint: "Listen, then answer when she finishes" },
  paused: { hi: "रुका हुआ", en: "Paused", hint: "Tap Resume to continue" },
};

export function VoiceControlBar({
  state,
  audioLevel,
  nativeLanguage,
  onToggleLive,
  onPauseResume,
}: {
  state: VoiceState;
  audioLevel: number;
  nativeLanguage: string;
  onToggleLive: () => void;
  onPauseResume: () => void;
}) {
  const copy = VOICE_COPY[state];
  const active = state !== "off";
  const showBars = state === "listening" || state === "speaking";

  const bars = useMemo(() => {
    const base = state === "listening" ? Math.min(1, audioLevel * 9) : state === "speaking" ? 0.55 : 0;
    return [0.45, 0.8, 1, 0.65, 0.95, 0.55, 0.85, 0.4, 0.7].map((shape) => Math.max(0.1, base * shape));
  }, [state, audioLevel]);

  return (
    <div
      className={`sticky bottom-0 z-30 -mx-1 rounded-t-2xl border-t px-3 pb-3 pt-2 transition-colors ${
        state === "listening"
          ? "border-green-300 bg-green-50"
          : state === "speaking"
            ? "border-blue-300 bg-blue-50"
            : state === "thinking"
              ? "border-amber-300 bg-amber-50"
              : "border-border bg-background"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={active ? onPauseResume : onToggleLive}
          aria-label={active ? `Live voice, ${copy.en}` : "Start live voice conversation"}
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-md transition active:translate-y-0.5 ${
            state === "listening"
              ? "bg-green-600 ring-4 ring-green-200"
              : state === "speaking"
                ? "bg-blue-600 ring-4 ring-blue-200 animate-pulse"
                : state === "thinking"
                  ? "bg-amber-600 ring-4 ring-amber-200"
                  : "bg-primary"
          }`}
        >
          {state === "thinking" ? <Loader2 className="h-6 w-6 animate-spin" /> : <MicGlyph />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold leading-tight">
            {copy.hi}
            <span className="ml-1 font-semibold text-muted-foreground">/ {copy.en}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground" lang={nativeLanguage !== "English" ? undefined : "en"}>
            {copy.hint}
          </p>
        </div>

        {showBars && (
          <div className="flex h-8 items-center gap-0.5" aria-hidden="true">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${state === "listening" ? "bg-green-600" : "bg-blue-600"}`}
                style={{ height: `${6 + h * 26}px` }}
              />
            ))}
          </div>
        )}

        {active && (
          <button
            type="button"
            onClick={onToggleLive}
            className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            End
          </button>
        )}
      </div>
      {state === "off" && (
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Uses 1 credit per completed 12 minutes · no upfront charge
        </p>
      )}
    </div>
  );
}

function MicGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggested replies
// ─────────────────────────────────────────────────────────────────────────────

export type SuggestedReply = {
  en: string;
  phonetic: string;
  native: string;
};

export function SuggestedReplyChips({
  replies,
  nativeLanguage,
  onPick,
  onListen,
}: {
  replies: SuggestedReply[];
  nativeLanguage: string;
  onPick: (text: string) => void;
  onListen: (text: string) => void;
}) {
  if (!replies.length) return null;
  return (
    <div className="rounded-2xl border border-dashed border-green-300 bg-green-50/60 p-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-green-900">
        <Sparkles className="h-3.5 w-3.5" />
        क्या बोलें? <span className="font-semibold text-green-800/80">/ What to say</span>
      </p>
      <div className="flex flex-col gap-1.5">
        {replies.map((r, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-2.5 py-2">
            <button
              type="button"
              onClick={() => onPick(r.en)}
              className="min-w-0 flex-1 text-left"
              aria-label={`Say: ${r.en}`}
            >
              <span className="block truncate text-sm font-bold text-secondary">{r.en}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {r.phonetic}
                {r.native && <span className="mx-1">·</span>}
                {r.native}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onListen(r.en)}
              aria-label={`Listen to ${r.en}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 hover:bg-green-200"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-message tutor controls
// ─────────────────────────────────────────────────────────────────────────────

export function TutorBubble({
  text,
  nativeLanguage,
  showNative,
  onToggleNative,
  onPlay,
  onSlow,
  onWordClick,
  learnedWords,
}: {
  text: string;
  nativeLanguage: string;
  showNative: boolean;
  onToggleNative: () => void;
  onPlay: () => void;
  onSlow: () => void;
  onWordClick: (entry: WordPowerEntry) => void;
  learnedWords: string[];
}) {
  return (
    <div className="min-w-0 max-w-[90%]">
      <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed text-secondary whitespace-pre-wrap break-words">
        <WordPowerText
          text={showNative ? text : keepOnlyNativeScript(text, nativeLanguage) || text}
          onWordClick={onWordClick}
          learnedWords={learnedWords}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <MiniAction icon={<Play className="h-3 w-3" />} label="Play" onClick={onPlay} />
        <MiniAction icon={<Play className="h-3 w-3" />} label="Slow" onClick={onSlow} />
        {nativeLanguage !== "English" && (
          <MiniAction
            icon={<ArrowRight className="h-3 w-3" />}
            label={showNative ? "Hide translation" : "Show translation"}
            onClick={onToggleNative}
            active={showNative}
          />
        )}
      </div>
    </div>
  );
}

function MiniAction({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
        active ? "bg-secondary text-white" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gentle coach strip
// ─────────────────────────────────────────────────────────────────────────────

export type CoachNote = { better: string; why: string };

export function GentleCoachStrip({
  note,
  nativeLanguage,
  onTry,
  onListen,
}: {
  note: CoachNote;
  nativeLanguage: string;
  onTry: (text: string) => void;
  onListen: (text: string) => void;
}) {
  return (
    <div className="mt-1 max-w-[90%] self-end rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-800">
        <Sparkles className="h-3 w-3" /> सही तरीका <span className="font-semibold normal-case tracking-normal text-amber-700/80">/ Gentle coach</span>
      </p>
      <p className="mt-1 text-sm font-bold text-amber-950">{note.better}</p>
      <p className="mt-0.5 text-xs text-amber-800" lang={nativeLanguage !== "English" ? undefined : "en"}>{note.why}</p>
      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={() => onTry(note.better)}
          className="rounded-full bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
        >
          Try saying this
        </button>
        <button
          type="button"
          onClick={() => onListen(note.better)}
          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
        >
          <Volume2 className="h-3 w-3" /> Listen
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario starters
// ─────────────────────────────────────────────────────────────────────────────

export type Scenario = { id: string; hi: string; en: string; firstLine: string; replies: SuggestedReply[] };

export const SCENARIOS: Scenario[] = [
  {
    id: "intro",
    hi: "अपना परिचय",
    en: "Self Introduction",
    firstLine: "Hi! Let's start with your introduction. Tell me your name and what you do.",
    replies: [
      { en: "My name is Mohan.", phonetic: "माय नेम इज़ मोहन", native: "मेरा नाम मोहन है।" },
      { en: "I am a student.", phonetic: "आई एम अ स्टूडेंट", native: "मैं एक विद्यार्थी हूँ।" },
      { en: "I live in Delhi.", phonetic: "आई लिव इन दिल्ली", native: "मैं दिल्ली में रहता हूँ।" },
    ],
  },
  {
    id: "daily",
    hi: "रोज़मर्रा की बातें",
    en: "Daily Life",
    firstLine: "Let's talk about your day. What did you do this morning?",
    replies: [
      { en: "I woke up early.", phonetic: "आई वोक अप अर्ली", native: "मैं जल्दी उठा।" },
      { en: "I had tea and breakfast.", phonetic: "आई हैड टी एंड ब्रेकफ़स्ट", native: "मैंने चाय और नाश्ता किया।" },
      { en: "Then I went to work.", phonetic: "देन आई वेंट टू वर्क", native: "फिर मैं काम पर गया।" },
    ],
  },
  {
    id: "office",
    hi: "नौकरी और दफ़्तर",
    en: "Job & Office",
    firstLine: "Let's practise a workplace conversation. Tell me about your job.",
    replies: [
      { en: "I work in an office.", phonetic: "आई वर्क इन एन ऑफ़िस", native: "मैं दफ़्तर में काम करता हूँ।" },
      { en: "I have a meeting at ten.", phonetic: "आई हैव अ मीटिंग एट टेन", native: "मेरी दस बजे मीटिंग है।" },
      { en: "Could you please repeat that?", phonetic: "कुड यू प्लीज़ रिपीट दैट", native: "क्या आप इसे दोहरा सकते हैं?" },
    ],
  },
  {
    id: "travel",
    hi: "यात्रा और बाज़ार",
    en: "Travel & Shopping",
    firstLine: "You're at a market. Ask me for something you want to buy.",
    replies: [
      { en: "How much is this?", phonetic: "हाउ मच इज़ दिस", native: "यह कितने का है?" },
      { en: "Do you have this in another size?", phonetic: "डू यू हैव दिस इन अनदर साइज़", native: "क्या यह दूसरे साइज़ में है?" },
      { en: "Can you give me a discount?", phonetic: "कैन यू गिव मी अ डिस्काउंट", native: "क्या आप कुछ छूट दे सकते हैं?" },
    ],
  },
];

export function ScenarioChips({
  onPick,
  onListen,
}: {
  onPick: (scenario: Scenario) => void;
  onListen: (text: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SCENARIOS.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-1 rounded-xl border border-green-200 bg-white px-3 py-2.5 hover:border-green-400"
        >
          <button type="button" onClick={() => onPick(s)} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-bold text-secondary">{s.hi}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{s.en}</span>
          </button>
          <button
            type="button"
            onClick={() => onListen(s.firstLine)}
            aria-label={`Listen to ${s.en} introduction`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 hover:bg-green-200"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact session status pill (replaces the large banner during live sessions)
// ─────────────────────────────────────────────────────────────────────────────

export function SessionStatusPill({
  elapsedLabel,
  state,
  creditNote,
  onExpand,
}: {
  elapsedLabel: string;
  state: VoiceState;
  creditNote?: string;
  onExpand: () => void;
}) {
  const dot =
    state === "listening" ? "bg-green-500" : state === "speaking" ? "bg-blue-500" : state === "thinking" ? "bg-amber-500" : "bg-muted-foreground";
  return (
    <button
      type="button"
      onClick={onExpand}
      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:bg-muted"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${state !== "off" ? "animate-pulse" : ""}`} />
      <span className="font-mono">{elapsedLabel}</span>
      {creditNote && <span className="hidden font-semibold sm:inline">· {creditNote}</span>}
    </button>
  );
}
