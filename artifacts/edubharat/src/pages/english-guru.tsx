import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INDIAN_LANGUAGES } from "@/lib/constants";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useCredits, startLiveBlock, tickLiveBlock, LIVE_BLOCK_SECONDS } from "@/lib/use-credits";
import { useGuestTrial, guestLiveSecondsLeft, addGuestLiveSeconds } from "@/lib/guest-trial";
import { useProgress } from "@/lib/use-progress";
import { useGeminiStream } from "@/lib/use-gemini-stream";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { useGoogleTTS, unlockAudio } from "@/lib/use-edge-tts";
import { useStudentProfile } from "@/lib/use-student-profile";
import { AnimatedAvatar } from "@/components/avatar";
import { TUTORS, getTutorById } from "@/lib/tutors";
import { PageMeta } from "@/components/page-meta";
import { MobilePrimaryCTA } from "@/components/mobile-primary-cta";
import { exportConversationPdf, exportConversationWord } from "@/lib/export-conversation";
import {
  Mic, MessageCircle, Loader2, StopCircle, ChevronRight,
  Users, FileText, FileDown, XCircle,
} from "lucide-react";
import { stripMarkdownForSpeech, formatGeneratedText, mapEnglishLevel } from "@/lib/english-tools";
import { MicButton, TutorSelector } from "@/components/english/shared-ui";

const TUTOR_SPEAKING_STYLES: Record<string, string> = {
  priya: 'Speak like a warm Mumbai schoolteacher. Use simple words, lots of encouragement, and occasional natural words like "haan", "bilkul", or "thoda practice karo". Never use jargon.',
  rohit: 'Speak like a no-nonsense Delhi corporate trainer. Be direct and structured. Use phrases like "listen carefully" and "this is what HR expects". Keep it efficient and avoid fluff.',
  maya: "Speak like a senior Bengaluru business consultant. Be precise and polished, with examples from Indian MNC culture, client calls, and boardroom communication.",
  arjun: 'Speak like an energetic Hyderabad interview coach. Be fast-paced and positive. Use phrases like "absolutely nail it", "practice this 10 times", and "you\'ve got this yaar".',
  neha: 'Speak like a patient Kolkata pronunciation teacher. Slow down for demonstrations, break words into syllables, and say "now repeat after me" or "stress the second syllable".',
  rahul: 'Speak like a methodical Pune grammar teacher. Explain rules step by step with Indian examples about chai, cricket, and festivals. Say "the rule here is" and "a common mistake Indians make is".',
};
// Calm, teacher-like delivery. Keep the live turn timing unchanged; only the
// audio itself is slower and easier to follow.
const ENGLISH_GURU_SPEECH_RATE = 0.94;
const LIVE_OPENINGS = [
  (name: string) => `Hi ${name}! I’m happy you’re here. How are you feeling today?`,
  (name: string) => `Hey ${name}! Let’s make this easy and useful. What are you working on today?`,
  (name: string) => `Welcome, ${name}! I’m listening. What is one thing you enjoy doing?`,
  (name: string) => `Hi ${name}! No perfect answer is needed. What would you like to practise today?`,
  (name: string) => `Hi ${name}! We’ll take it one step at a time. What are you learning these days?`,
  (name: string) => `Hi ${name}! What would you like to talk about or practise today?`,
  (name: string) => `Good to see you, ${name}! What would make this practice useful for you today?`,
];
const ENERGETIC_TUTOR_DIRECTION =
  "Be energetic, engaging and encouraging without sounding fake. Keep the learner curious with warm reactions, clear momentum, varied short questions and practical examples. Make the conversation feel rewarding so they want to continue.";

function normalizeHelperLanguage(language: string): string {
  return /^(?:gb|uk|us|indian)\s+english$/i.test(language.trim()) ? "English" : language;
}

function alignTutorGender(text: string, voiceGender: "male" | "female"): string {
  if (voiceGender === "female") {
    return text
      .replace(/\bsamajh\s+j(a|ā)unga\b/gi, "samajh jaungi")
      .replace(/\bkarunga\b/gi, "karungi")
      .replace(/\bkahunga\b/gi, "kahungi")
      .replace(/\bbataunga\b/gi, "bataungi")
      .replace(/\bdunga\b/gi, "dungi")
      .replace(/समझ जाऊँगा/g, "समझ जाऊँगी")
      .replace(/करूँगा/g, "करूँगी")
      .replace(/कहूँगा/g, "कहूँगी")
      .replace(/बताऊँगा/g, "बताऊँगी");
  }
  return text
    .replace(/\bsamajh\s+jaungi\b/gi, "samajh jaunga")
    .replace(/\bkarungi\b/gi, "karunga")
    .replace(/\bkahungi\b/gi, "kahunga")
    .replace(/\bbataungi\b/gi, "bataunga")
    .replace(/\bdungi\b/gi, "dunga")
    .replace(/समझ जाऊँगी/g, "समझ जाऊँगा")
    .replace(/करूँगी/g, "करूँगा")
    .replace(/कहूँगी/g, "कहूँगा")
    .replace(/बताऊँगी/g, "बताऊँगा");
}

function LanguageHighlight() {
  return (
    <div
      className="inline-flex max-w-full items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-medium leading-tight text-orange-800"
      aria-label="Learn in your language: Hindi, Tamil, Telugu, and more"
    >
      <span>🗣️ Apni Bhasha Mein Seekhiye — </span>
      <span className="ml-1 font-semibold">हिंदी, தமிழ், తెలుగు</span>
      <span className="ml-1">+10 more</span>
    </div>
  );
}

export default function EnglishGuru() {
  return (
    <>
      <PageMeta
        title="English Guru"
        description="Practise spoken English with English coaches in Hindi, Tamil, Telugu, and 10 more Indian languages."
        ogUrl="https://leadonto.com/english-guru"
        canonicalUrl="https://leadonto.com/english-guru"
      />
      <EnglishGuruContent />
    </>
  );
}

function EnglishGuruContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { balance } = useCredits();
  const { liveSecondsLeft: guestLiveLeft } = useGuestTrial();
  const { track } = useProgress();
  const { text: aiText, isStreaming, error: aiError, stream, reset: resetAI } = useGeminiStream();
  const synth = useGoogleTTS();
  const { profile, updateProfile } = useStudentProfile();

  const [uiLang, setUiLang] = useState(() => normalizeHelperLanguage(profile.preferredLanguage));

  const [level, setLevel] = useState(() => mapEnglishLevel(profile.englishLevel));
  const [tutorId, setTutorId] = useState(() => {
    // Priya was the old implicit default. Treat that untouched legacy profile
    // as the new Maya landing default, while preserving an explicitly chosen
    // tutor once the learner has a name/profile selection.
    const legacyDefault = profile.preferredTutor === "priya" && profile.voiceStyle === "priya";
    if (legacyDefault) return "maya";
    // Prefer preferredTutor field; fallback to voiceStyle match
    const byId = TUTORS.find(t => t.id === profile.preferredTutor);
    if (byId) return byId.id;
    const match = TUTORS.find(t => t.voiceStyle === profile.voiceStyle);
    return match?.id ?? "maya";
  });
  const [showTutorPicker, setShowTutorPicker] = useState(false);

  const tutor = getTutorById(tutorId) ?? TUTORS[0]!;

  const [convHistory, setConvHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [convInput, setConvInput] = useState("");
  const [liveChat, setLiveChat] = useState(false);
  const [showCreditGate, setShowCreditGate] = useState(false);
  const [livePaused, setLivePaused] = useState(false);
  const [convFlowState, setConvFlowState] = useState<"idle" | "user-speaking" | "ai-thinking" | "ai-speaking">("idle");
  const convInputRef = useRef<HTMLTextAreaElement>(null);
  const convScrollRef = useRef<HTMLDivElement>(null);

  // Recognition follows the language the AI last SPOKE — not the helper-language
  // setting. The AI speaks mostly English, so the mic listens in English by
  // default and switches to the native language only right after the AI gives a
  // native-language explanation (when the student is most likely to answer in
  // it). This keeps the student's English recognised well AND makes any speaker
  // echo come back in the SAME script the AI just spoke, so the content
  // echo-guard can match and drop it — a native recognizer transcribing the AI's
  // English into native script defeated that guard and caused the "teacher
  // replies to its own voice" bug (worst in Malayalam and other native modes).
  const [recognitionLang, setRecognitionLang] = useState("English");
  const speech = useSpeechRecognition(recognitionLang);
  /**
   * speechRef — always-current speech handle so handleConvPhrase doesn't need
   * `speech` in its deps (speech changes every render because it's an object
   * literal, causing unnecessary handleConvPhrase re-creation).
   */
  const speechRef = useRef(speech);
  useEffect(() => { speechRef.current = speech; }, [speech]);
  const convHistoryRef = useRef(convHistory);
  const liveChatRef = useRef(liveChat);
  const livePausedRef = useRef(false);
  useEffect(() => { liveChatRef.current = liveChat; }, [liveChat]);
  const handleConvPhraseRef = useRef<((p: string) => void) | null>(null);
  // Every live turn captures this generation. Pause/end invalidates the
  // generation before aborting the fetch, so a late promise resolution cannot
  // append or speak an answer from the cancelled turn.
  const liveTurnGenerationRef = useRef(0);
  /**
   * aiBusyRef — true from the moment a phrase is accepted until the AI finishes
   * thinking AND speaking. Guards against a late/echoed recognition result
   * re-triggering handleConvPhrase mid-reply, which would call globalStop() and
   * cut the AI off abruptly. isStreaming alone doesn't cover the TTS window.
   */
  const aiBusyRef = useRef(false);
  /** Mirrors the global TTS hook synchronously enough to reject delayed mic
   * results while the coach is still speaking. This is a second line of
   * defence behind speech.pause(), for browsers that deliver a buffered final
   * result after recognition.stop(). */
  const ttsSpeakingRef = useRef(false);
  /** Safety timer: if TTS onEnd never fires, force-clear aiBusyRef so the mic comes back. */
  const speakSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Tracks last user speech activity (interim transcript / phrase) for silence detection. */
  const lastUserSpeechRef = useRef(Date.now());
  /** Prevents re-entrant silence probes if one is already in-flight. */
  const silenceProbeActiveRef = useRef(false);
  /** Counts consecutive silence probes since the user last spoke; max 2 nudges then stop. */
  const silenceProbeCountRef = useRef(0);
  const lastLiveFallbackRef = useRef("");
  const liveFallbackTurnRef = useRef(0);

  useEffect(() => {
    if (user?.name && !profile.name) updateProfile({ name: user.name });
  }, [user?.name, profile.name, updateProfile]);

  useEffect(() => {
    const normalized = normalizeHelperLanguage(profile.preferredLanguage);
    setUiLang(normalized);
    // Older profile records used values such as "GB English", which are not
    // valid helper-language keys and made the AI prompt unnecessarily
    // confusing. Normalize them once when the page loads.
    if (normalized !== profile.preferredLanguage) {
      updateProfile({ preferredLanguage: normalized });
    }
  }, [profile.preferredLanguage, updateProfile]);

  useEffect(() => {
    const el = convInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [convInput]);

  useEffect(() => { convHistoryRef.current = convHistory; }, [convHistory]);

  useEffect(() => {
    const el = convScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [convHistory, aiText, isStreaming]);

  // Sync level to profile englishLevel when profile changes externally
  useEffect(() => {
    setLevel(mapEnglishLevel(profile.englishLevel));
  }, [profile.englishLevel]);

  // Update lastUserSpeechRef whenever recognition produces interim text
  useEffect(() => {
    if (speech.interimTranscript && liveChat) {
      lastUserSpeechRef.current = Date.now();
      silenceProbeActiveRef.current = false; // user is actively speaking — cancel any pending re-engage
      silenceProbeCountRef.current = 0; // user spoke — reset nudge counter
    }
  }, [speech.interimTranscript, liveChat]);

  // Silence re-engagement: if user hasn't spoken for 10 s during live chat,
  // the AI gently re-engages — but only up to 2 consecutive nudges.
  useEffect(() => {
    if (!liveChat || convFlowState !== "user-speaking") {
      silenceProbeActiveRef.current = false;
      return;
    }
    // Reset the clock whenever we enter user-speaking state
    lastUserSpeechRef.current = Date.now();
    silenceProbeActiveRef.current = false;
    const id = setInterval(() => {
      if (aiBusyRef.current || !liveChatRef.current || silenceProbeActiveRef.current) return;
      if (silenceProbeCountRef.current >= 2) return; // already nudged twice — don't nag
      const silentMs = Date.now() - lastUserSpeechRef.current;
      if (silentMs > 10_000) {
        silenceProbeActiveRef.current = true;
        silenceProbeCountRef.current += 1;
        lastUserSpeechRef.current = Date.now();
        // Trigger re-engagement via the phrase handler using a sentinel value
        handleConvPhraseRef.current?.("__silence__");
      }
    }, 2_500);
    return () => clearInterval(id);
  }, [liveChat, convFlowState]);

  // Sync tutor to profile when profile changes externally
  useEffect(() => {
    const byId = TUTORS.find(t => t.id === profile.preferredTutor);
    const byStyle = TUTORS.find(t => t.voiceStyle === profile.voiceStyle);
    const preferred = byId ?? byStyle;
    if (preferred && preferred.id !== tutorId) setTutorId(preferred.id);
  }, [profile.preferredTutor, profile.voiceStyle, tutorId]);

  const speak = useCallback((text: string, language = uiLang, onEnd?: () => void, opts: { rate?: number; nativeLanguage?: string; queueSpeech?: boolean } = {}) => {
    const t = stripMarkdownForSpeech(text)
      .replace(/^(?:Teacher|AI|Assistant|System):\s*/i, "")
      .replace(/\b(?:Student|User):\s*/gi, "")
      .trim();
    // Send the complete cleaned reply to the shared sentence queue. The queue
    // owns sentence splitting and mixed-script voice selection; trimming this
    // to the first line made the UI show a full reply while the teacher spoke
    // only its opening fragment and released the mic too early.
    synth.speak(t, language, onEnd, {
      ...opts,
      voiceGender: tutor.voiceGender,
      voiceStyle: tutor.voiceStyle,
      rate: Math.min(opts.rate ?? ENGLISH_GURU_SPEECH_RATE, ENGLISH_GURU_SPEECH_RATE),
    });
  }, [synth, uiLang, tutor.voiceGender, tutor.voiceStyle]);

  /**
   * speakRef — always-current speak function so handleConvPhrase doesn't need
   * `speak` in its deps (speak changes whenever synth.isSpeaking toggles).
   */
  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { ttsSpeakingRef.current = synth.isSpeaking; }, [synth.isSpeaking]);
  // Echo-rejection state: the AI's most recent spoken text and when it finished.
  // handleConvPhrase uses these to drop mic captures that are really the AI's
  // own voice coming back through the speaker.
  const lastAiSpeechRef = useRef("");
  const lastAiSpeechEndRef = useRef(0);

  const cancelActiveTurn = useCallback(() => {
    liveTurnGenerationRef.current += 1;
    resetAI();
    synth.stop();
    speechRef.current.stop();
    aiBusyRef.current = false;
    if (speakSafetyTimerRef.current) {
      clearTimeout(speakSafetyTimerRef.current);
      speakSafetyTimerRef.current = null;
    }
    silenceProbeActiveRef.current = false;
  }, [resetAI, synth]);

  const handleSelectTutor = useCallback((id: string) => {
    const t = getTutorById(id);
    if (!t) return;
    cancelActiveTurn();
    setConvHistory([]);
    setConvFlowState("idle");
    // Cancel any pending release/safety timer from an in-flight turn so it can't
    // later fire and unblock the mic in the middle of the handoff greeting.
    if (speakSafetyTimerRef.current) { clearTimeout(speakSafetyTimerRef.current); speakSafetyTimerRef.current = null; }
    // Unlock the busy flag — cancelActiveTurn also invalidates any late AI reply
    // from the previous tutor, so it cannot speak with the wrong identity.
    aiBusyRef.current = false;
    setTutorId(id);
    updateProfile({ voiceStyle: t.voiceStyle as typeof profile.voiceStyle, voiceGender: t.voiceGender, preferredTutor: id });
    // If live conversation is running, resume it with the new tutor's voice.
    // Use a natural transition — not a scripted introduction — so the handoff
    // feels like a real person stepping in mid-conversation.
    if (liveChatRef.current) {
      const shortName = t.name.replace(/\s+(Ma'am|Sir)$/i, "");
      const transitions = [
        `I've got it from here! I'm ${shortName}. Please go ahead — I'm listening!`,
        `Taking over now! ${shortName} here. Continue whenever you're ready.`,
        `${shortName} stepping in! Right, so where were we? Go ahead!`,
        `Here's ${shortName}! I'm all ears — carry on.`,
      ];
      const greeting = transitions[Math.floor(Math.random() * transitions.length)]!;
      setConvHistory(h => [...h, { role: "ai", text: greeting }]);
      setConvFlowState("ai-speaking");
      // Lock the busy flag AND kill the mic BEFORE speaking so the greeting
      // can't be picked up as user input (same pattern as handleConvPhrase).
      aiBusyRef.current = true;
      speechRef.current.pause();
      lastAiSpeechRef.current = greeting;
      // Greeting is always English → recognise the student's reply in English.
      setRecognitionLang("English");
      // Release the mic when the greeting finishes. Guarded by a safety timer so
      // that if TTS onEnd never fires (autoplay block, audio glitch, eviction)
      // the mic and busy flag can't stay stuck — otherwise the conversation would
      // freeze right after a teacher switch.
      const releaseGreeting = () => {
        if (!liveChatRef.current || livePausedRef.current) return;
        if (speakSafetyTimerRef.current) { clearTimeout(speakSafetyTimerRef.current); speakSafetyTimerRef.current = null; }
        aiBusyRef.current = false;
        if (!liveChatRef.current) return;
        setConvFlowState("user-speaking");
        // Pre-warm approach: spawn the recognizer after a short 500ms tail-drain
        // delay so the mic is hot and calibrated before the user speaks, but
        // suppress any recognised result for 2s so room echo of the greeting
        // (which lingers on laptop/phone speakers) is never processed.
        lastAiSpeechEndRef.current = Date.now();
             speechRef.current.suppressUntil(Date.now() + 900);
             // Wake recognition immediately after the audio tail; the short
             // suppression window still protects against speaker echo.
             speechRef.current.blockFor(0);
      };
      speakSafetyTimerRef.current = setTimeout(releaseGreeting, Math.max(greeting.length * 60 + 4000, 8000));
      // Greetings are always English — voice them with the English tutor voice so
      // a native neural voice never reads English text with the wrong accent.
      synth.speak(stripMarkdownForSpeech(greeting), "English", releaseGreeting, {
        voiceGender: t.voiceGender,
        voiceStyle: t.voiceStyle,
        rate: ENGLISH_GURU_SPEECH_RATE,
      });
    }
  }, [cancelActiveTurn, synth, updateProfile, speech, uiLang]);

  const teacherShort = tutor.name.replace(/\s+(Ma'am|Sir)$/i, "");

  // Sentinel value for silence-probe turns (no visible user message added)
  const SILENCE_MARKER = "__silence__";
  const silenceFallbacks = [
    "Take your time. What is one small thing you would like to talk about today?",
    "No rush. Tell me about something that has been on your mind recently.",
    "I’m still here. Would you like to talk about work, learning, or your plans?",
    "Let’s restart gently. What was one moment from today that stood out to you?",
  ];
  const normalizeReply = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const collapseRepeatedSpeech = (text: string) => {
    const words = text.trim().split(/\s+/);
    // Android/server transcription can append the same short phrase twice:
    // "I want to know some I want to know some words." Keep one copy.
    for (let size = Math.min(8, Math.floor(words.length / 2)); size >= 2; size--) {
      for (let start = 0; start + size * 2 <= words.length; start++) {
        const first = words.slice(start, start + size).map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
        const second = words.slice(start + size, start + size * 2).map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
        if (first.every((word, index) => word && word === second[index])) {
          words.splice(start + size, size);
          return collapseRepeatedSpeech(words.join(" "));
        }
      }
    }
    return words.join(" ");
  };
  const variedFallback = (userMsg: string, isSilenceProbe: boolean) => {
    const turn = liveFallbackTurnRef.current++;
    const lower = userMsg.toLowerCase();
    const transliteratedWordMeanings: Record<string, { word: string; meaning: string; example: string }> = {
      paryavaran: { word: "environment", meaning: "the natural world around us", example: "I care about protecting the environment." },
      vatavaran: { word: "environment", meaning: "the surroundings or atmosphere around us", example: "The office has a friendly environment." },
      swachh: { word: "clean", meaning: "not dirty", example: "We should keep our streets clean." },
      jal: { word: "water", meaning: "the clear liquid that people, animals and plants need", example: "We must save water." },
      prakriti: { word: "nature", meaning: "the world of plants, animals and the outdoors", example: "I enjoy spending time in nature." },
    };
    const transliteratedMatch = Object.entries(transliteratedWordMeanings)
      .find(([source]) => new RegExp(`\\b${source}\\b`, "i").test(lower));
    const hasHowAreYou = /\bhow\s+are\s+you\b|\bhow're\s+you\b/.test(lower);
    const definitionMatch = lower.match(/\b(?:what is|what does|meaning of|define)\s+([a-z][a-z-]*)/i);
    const definitionWord = definitionMatch?.[1]?.toLowerCase() ?? "";
    const contentWords = userMsg
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !/^(want|like|would|about|that|this|with|from|have|they|what|when|where|tell|know|learn|used|daily)$/i.test(word))
      .slice(0, 4)
      .join(" ");
    let pool: string[];
    if (isSilenceProbe) {
      pool = silenceFallbacks;
    } else if (transliteratedMatch) {
      const [, translation] = transliteratedMatch;
      pool = [
        `${hasHowAreYou ? "I’m doing well, thank you. " : ""}"${translation.word}" is the English word for ${translation.meaning}. For example, “${translation.example}” Can you make your own sentence?`,
      ];
    } else if (hasHowAreYou) {
      pool = [
        "I’m doing well, thank you. I’m ready to practise with you. How has your day been?",
        "I’m good, thank you. Let’s keep this conversation natural. What have you been working on today?",
      ];
    } else if (definitionWord) {
      const definitions: Record<string, string> = {
        social: "Social means connected with spending time or communicating with other people. For example, “I enjoy social conversations with my friends.” Can you make your own sentence with “social”?",
        family: "Family means the people who are related to you, such as your parents, siblings, cousins, or children. For example, “My family supports me.” Can you make a sentence with “family”?",
        vocabulary: "Vocabulary means the words that a person knows and uses. For example, “I’m building my English vocabulary.” Tell me one new word you want to learn.",
        confident: "Confident means feeling sure about your ability. For example, “I feel confident when I practise.” When do you feel confident speaking English?",
      };
      pool = [
        definitions[definitionWord] ?? `“${definitionWord}” means the idea or thing described by that word. For example, “I use ${definitionWord} in a sentence.” Would you like another example?`,
      ];
    } else if (
      (lower.includes("family") && (lower.includes("vocabulary") || lower.includes("word") || lower.includes("words")))
      || lower.includes("teach me some english")
      || lower.includes("teach me english")
      || lower.includes("learn some english")
    ) {
      pool = [
        "Let’s learn useful family vocabulary. A parent is your mother or father, a sibling is your brother or sister, and a cousin is your aunt or uncle’s child. Make one sentence with “sibling.”",
        "Here are three family words for today: relative, cousin, and sibling. A relative is anyone in your family. Which word would you like to practise in a sentence?",
        "Let’s practise English with family. You can say, “I live with my parents,” or “I often visit my cousins.” Now tell me one sentence about your family.",
      ];
    } else if (lower.includes("word") || lower.includes("learn") || lower.includes("english") || lower.includes("speak")) {
      pool = [
        "Let’s learn one useful word at a time. “Helpful” means useful or kind; for example, “Your advice was helpful.” Can you make a sentence with “helpful”?",
        `I like that goal${contentWords ? ` — ${contentWords} can make everyday conversations much easier` : ""}. What situation should we practise first?`,
        "Let’s make it practical. Imagine you are meeting someone new; what would you like to say naturally?",
        "That’s useful learning. Which feels harder for you right now: finding the words, making sentences, or speaking confidently?",
      ];
    } else if (lower.includes("work") || lower.includes("job") || lower.includes("project")) {
      pool = [
        "That connects to your goals. What was your personal responsibility in that work?",
        "Tell me about the result. What changed because of your effort?",
        "What part felt difficult, and what did you try first?",
        "If you could do that project again, what would you change?",
      ];
    } else if (lower.includes("family") || lower.includes("friend") || lower.includes("home")) {
      pool = [
        "That sounds meaningful. What is one small detail that makes it special?",
        "I can picture that. How did the other person respond?",
        "That kind of experience stays with us. What did it teach you?",
        "Would you describe that moment as funny, difficult, or comforting — and why?",
      ];
    } else if (lower.includes("feel") || lower.includes("happy") || lower.includes("difficult") || lower.includes("problem")) {
      pool = [
        "That sounds honest. What helped you handle the moment?",
        "I hear the feeling in that. What happened just before things changed?",
        "That was a real experience. What would you tell a friend facing something similar?",
        "What did you learn about yourself from that situation?",
      ];
    } else {
      pool = [
        "That’s interesting. What happened next?",
        "I can follow the main idea. Which detail stands out most to you?",
        "That gives us something to explore. How did it affect your day?",
        "Nice, let’s take it one step further. What made you choose that?",
        "I’m curious about your point of view. What would someone close to you say about it?",
        "That’s a good thread to follow. Can you give me a quick real-life example?",
      ];
    }
    const previous = normalizeReply(lastLiveFallbackRef.current);
    const available = pool.filter((reply) => normalizeReply(reply) !== previous);
    const source = available.length ? available : pool;
    const reply = source[turn % source.length]!;
    lastLiveFallbackRef.current = reply;
    return reply;
  };

  // Live chat phrase handler
  const handleConvPhrase = useCallback((phrase: string) => {
    const isSilenceProbe = phrase === SILENCE_MARKER;
    // Guard: normal phrases need content; silence probes just need the channel to be free.
    if (!isSilenceProbe && (
      !phrase.trim()
      || (!liveChatRef.current && isStreaming)
      || aiBusyRef.current
      || ttsSpeakingRef.current
      || livePausedRef.current
    )) return;
    if (isSilenceProbe && (aiBusyRef.current || !liveChatRef.current)) return;
    // A stopped Web Speech instance can still deliver one buffered final result
    // after the AI audio ends. Do not let that result become a new turn while
    // room echo is decaying, even when it was transcribed into native script
    // and therefore cannot match the English-text echo guard below.
    if (
      !isSilenceProbe
      && liveChatRef.current
      && Date.now() - lastAiSpeechEndRef.current < 2800
    ) return;
    // Echo guard: a phrase arriving within ~3.5s of the AI finishing, that closely
    // matches what the AI just said, is the mic hearing the speaker — not the user.
    // Drop it so the teacher never "replies to its own voice".
    if (!isSilenceProbe && Date.now() - lastAiSpeechEndRef.current < 6000) {
      const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
      const p = norm(phrase);
      const ai = norm(lastAiSpeechRef.current);
      if (p.length >= 6 && ai) {
        const words = p.split(" ");
        const aiWords = new Set(ai.split(" "));
        const overlap = words.filter(w => aiWords.has(w)).length / words.length;
        // Substring match for longer fragments; overlap match needs several words
        // at a high ratio so short legit replies ("yes", "okay, tell me more")
        // are never mistaken for the AI's own echo. No upper word-count cap —
        // longer echoed phrases (15+ words) must be caught too.
        if ((p.length >= 10 && ai.includes(p)) || (words.length >= 4 && overlap >= 0.85)) return;
      }
    }
    // Real user phrase resets the silence-nudge counter
    if (!isSilenceProbe) { silenceProbeCountRef.current = 0; silenceProbeActiveRef.current = false; }
    aiBusyRef.current = true;
    const turnGeneration = liveTurnGenerationRef.current;
    if (liveChatRef.current) {
      // Live voice mode: hard-stop the mic and block it for the whole
      // think+speak cycle so it can never capture the AI's own voice from the
      // speaker (echo / self-repeat). The block is released in the speak onEnd.
      speechRef.current.pause();
    } else {
      // Typed mode: just stop any active recognition — never apply the long
      // pause block, or the mic button would stay dead afterwards.
      speechRef.current.stop();
    }
    setConvFlowState("ai-thinking");
    void (async () => {
      try {
        const userMsg = isSilenceProbe ? "" : collapseRepeatedSpeech(phrase);
        // Only add normal phrases to visible conversation history
        if (!isSilenceProbe) {
          setConvHistory(h => [...h, { role: "user", text: userMsg }]);
        }
        // Build AI context: for silence probes, inject a re-engage instruction
        const historySlice = [...convHistoryRef.current.slice(-6)];
        if (!isSilenceProbe) historySlice.push({ role: "user" as const, text: userMsg });
        const recentHistory = historySlice
          .map(m => `${m.role === "user" ? "Student" : teacherShort}: ${m.text}`).join("\n");
        const silenceInstruction = isSilenceProbe
          ? `\n[The student has been quiet for a moment. Gently re-engage — ask a warm natural follow-up question or check in based on the conversation so far. 1–2 sentences max.]\n`
          : "";
        resetAI();

        // ── News / current-events enrichment ─────────────────────────────
        // When the student clearly asks about real-world news or info, fetch
        // a quick web snippet so the AI can answer confidently rather than
        // saying "I cannot access the internet."
        // Kept intentionally specific to avoid false-positives on common words
        // (e.g. "result" of a grammar exercise vs. "match result").
        const NEWS_RE = /\b(news|latest news|cricket (score|match|result|news)|ipl (score|match|result)|election (result|winner|news)|prime minister|petrol price|diesel price|gold price|dollar rate|stock market|sensex|nifty|box office|film release|weather forecast|covid|inflation rate|gdp|budget 2024|budget 2025)\b/i;
        let webContext = "";
        if (!isSilenceProbe && NEWS_RE.test(userMsg)) {
          try {
            const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
            const ctxRes = await fetch(
              `${base}/api/ai/web-context?q=${encodeURIComponent(userMsg.slice(0, 200))}`,
              { credentials: "include", signal: AbortSignal.timeout(1500) }
            );
            if (ctxRes.ok) {
              const ctxData = await ctxRes.json() as { context: string };
              webContext = (ctxData.context ?? "").trim();
            }
          } catch { /* web context is enrichment only — never block conversation */ }
        }
        if (
          turnGeneration !== liveTurnGenerationRef.current ||
          (liveChatRef.current && livePausedRef.current)
        ) {
          if (turnGeneration === liveTurnGenerationRef.current) aiBusyRef.current = false;
          return;
        }

        const isEnglishNative = uiLang === "English";
         const languageGuidance = isEnglishNative
           ? `Speak in clear, simple, natural English throughout. Start with the substance of your reply rather than a repeated acknowledgement or filler. Use one light, natural Gen-Z phrase such as "that's legit", "honestly", "nice", "totally", or "you've got this" only when it genuinely fits — never force slang or sound like a meme.`
          : `The student's ONLY helper language is ${uiLang} — do NOT use any other Indian language (not Hindi, not Kannada, not Tamil, not any other — ONLY ${uiLang} when needed). English is the goal, so speak MOSTLY in simple, clear English and keep them practicing. But use ${uiLang} as a warm helping hand whenever they need it: if the student replies in ${uiLang}, tells you (in any language) that they didn't understand, or clearly seems confused, briefly explain the tricky word or idea in ${uiLang}, then continue in English. You may drop a short ${uiLang} gloss in brackets right after a hard English word. When the student explicitly asks what an English word or sentence MEANS in ${uiLang} (or asks you to translate or explain it in ${uiLang}), immediately give that meaning written MOSTLY in ${uiLang} — keep English down to just the word being explained — so it is spoken aloud in a natural ${uiLang} accent; keep that reply short and focused on the meaning, then switch straight back to English in your very next reply. Never leave them stuck or embarrassed — slow down, simplify, and lean on ${uiLang} to unblock them, then gently guide them back to English. When they're managing fine in English, keep your whole reply in English.`;

        const webContextNote = webContext
          ? `\n\nLive web context (use naturally if relevant): "${webContext}"`
          : "";

        let response = await stream(
          `${recentHistory}${silenceInstruction}\n${teacherShort}:`,
         `You are ${teacherShort}, a warm, experienced Indian English coach on a live voice call with ${profile.name || "a student"} (${level} English level). ${tutor.teachingStyle}. ${ENERGETIC_TUTOR_DIRECTION} ${TUTOR_SPEAKING_STYLES[tutor.id] ?? ""} ${languageGuidance}

This is an ONGOING conversation. NEVER introduce yourself or say "Hello, I'm ${teacherShort}" — just continue naturally as a human teacher would mid-conversation. This should feel like a relaxed live chat with a thoughtful teacher, not a scripted lesson.
When using Hindi or another gendered Indian-language phrase, keep the teacher's grammar aligned with your own voice gender: ${tutor.voiceGender === "female" ? "use feminine forms such as samajh jaungi, karungi, and bataungi — never masculine -unga forms for yourself." : "use masculine forms such as samajh jaunga, karunga, and bataunga — never feminine -ungi forms for yourself."}

Rules for spoken replies:
- Imagine you are SPEAKING, not writing. Keep it 2–3 short, punchy sentences max.
- Use contractions always: I'm, you're, that's, let's, it's, can't, won't.
- If the student asks what a word means, define that word simply, give one short example, and ask them to make their own sentence. Do not respond with a generic life question.
- If the student uses an Indian-language word or transliteration inside an English sentence, explain or translate that specific word briefly before continuing. Never ignore the word.
- If the student asks “how are you?”, answer that question directly in one short sentence before asking anything else.
- If the student asks to learn vocabulary or English, teach 2–3 useful words or phrases immediately, with meanings and one example. Do not only ask where they want to use English.
- Start replies smoothly with the substance of your answer. Do not open with "Oh", "Hmm", "Okay", "Got it", "Right", or another filler acknowledgement.
- Do not repeat acknowledgement phrases before answering; move directly from understanding what the student said to the useful response or follow-up question.
- Ask follow-up questions based on what they just said — never repeat a question already covered in this conversation.
- NEVER restate, rephrase, or echo your own previous message — each reply must add something genuinely new and move the conversation forward.
- If they make a grammar mistake, quietly use the correct form in YOUR next sentence — never point it out.
- NEVER use bullet points, numbered lists, dashes, asterisks, or any formatting.
- NEVER start your reply with your name or any label like "Teacher:".
- Prefer pronounceable spoken forms for acronyms and workplace terms. Say "A I", "H R", "R B I", or "business to business" rather than rushing compressed letter strings.
- Always finish your thought — never cut off mid-sentence.
- If asked about news, sports, films, prices, or current events: answer confidently using "from what I know" or "last I heard". Do NOT say you have no internet. Your knowledge is up to early 2025; for very recent things, say "I may not have the very latest, but…".${webContextNote}`,
          undefined,
          // Live Conversation uses Groq directly while Claude/Gemini credits
          // are unavailable; the server keeps Z.ai as the emergency fallback.
          { endpoint: "/api/ai/stream?provider=groq", maxTokens: 140, timeoutMs: 4800 }
        );
        // Never leave the student waiting while a provider stalls. The
        // fallback is spoken normally, so the mic handoff still completes.
        if (!response.trim()) {
          response = variedFallback(userMsg, isSilenceProbe);
        }
        const previousAiReply = [...convHistoryRef.current]
          .reverse()
          .find((item) => item.role === "ai")?.text ?? "";
        if (normalizeReply(response) === normalizeReply(previousAiReply)) {
          response = variedFallback(userMsg, isSilenceProbe);
        }
        // A fallback reply is a successful recovery, not a failed live turn.
        // Clear the hook error so mobile users are not left staring at a stale
        // "AI request failed" banner while the mic has already reopened.
        resetAI();
        if (
          turnGeneration !== liveTurnGenerationRef.current ||
          (liveChatRef.current && livePausedRef.current)
        ) {
          if (turnGeneration === liveTurnGenerationRef.current) aiBusyRef.current = false;
          return;
        }
        // A turn owns the microphone until the complete queued utterance ends.
        // This local latch also makes the safety fallback and TTS onEnd
        // mutually exclusive; without it, a slow multilingual queue could
        // release the mic twice and start two recognition lifecycles.
        let turnReleased = false;
        /** Release the busy lock and reopen the mic — called from TTS onEnd OR the safety timer. */
        const releaseTurn = () => {
          if (
            turnGeneration !== liveTurnGenerationRef.current ||
            (liveChatRef.current && livePausedRef.current)
          ) return;
          if (turnReleased) return;
          turnReleased = true;
          if (speakSafetyTimerRef.current) { clearTimeout(speakSafetyTimerRef.current); speakSafetyTimerRef.current = null; }
          aiBusyRef.current = false;
          if (liveChatRef.current) {
            // Pre-warm: spawn the mic 500ms after TTS ends so the recognizer is
            // already hot and calibrated by the time the student speaks — but
            // suppress results for 2s (from TTS end) so room echo of the AI's
            // voice on laptop/phone speakers is never passed to handleConvPhrase.
            // The content-based echo guard (6s, 85% overlap) is an additional
            // backstop for devices with slow echo decay.
            lastAiSpeechEndRef.current = Date.now();
             speechRef.current.suppressUntil(Date.now() + 2500);
             // Tightened from 650ms — matches interview-ace.tsx and real natural-pause data (~400ms median)
             speechRef.current.blockFor(0);
             // Re-arm the single recognition loop immediately. blockFor()
             // handles the short speaker-tail delay and prevents duplicate
             // recorders; do not wait for a React effect to notice the state.
             speechRef.current.startContinuous(p => handleConvPhraseRef.current?.(p));
            setConvFlowState("user-speaking");
          } else {
            setConvFlowState("idle");
          }
        };

        if (response) {
          // Strip any "TeacherName: " prefix the AI may echo, plus markdown
          const cleanResponse = alignTutorGender(stripMarkdownForSpeech(response), tutor.voiceGender)
            .replace(/^[A-Za-zÀ-ÿ'\s]{2,30}:\s*/, "")
            .trim();
          setConvHistory(h => [...h, { role: "ai", text: cleanResponse }]);
          track("English Guru", "Live Conversation");
          setConvFlowState("ai-speaking");
          // Failsafe only: the normal path releases from the final queued audio
          // chunk. The old timeout was short enough to reopen the mic during a
          // long mixed-language response, so allow network retries and every
          // language chunk to finish before treating TTS as stuck.
          // Audio completion is normally released by TTS onEnd. Keep a short
          // watchdog so a missing audio callback cannot strand the mic.
          const safetyMs = Math.max(cleanResponse.length * 70 + 4_000, 6_000);
          speakSafetyTimerRef.current = setTimeout(releaseTurn, safetyMs);
          // Voice the reply in English by default — the AI is instructed to speak
          // MOSTLY English here, so a native neural voice (e.g. Malayalam) reading
          // English text was the "teacher isn't speaking English" bug. Only switch
          // to the native voice when the reply is predominantly native script (a
          // heavier "help" moment), so that gloss is still pronounced correctly.
          // Use speakRef so we always call the latest speak closure even though
          // handleConvPhrase no longer has `speak` in its deps.
          const speechLang = uiLang === "English"
            ? "English"
            : ((cleanResponse.match(/[\u0900-\u0D7F\u0600-\u06FF]/g)?.length ?? 0)
                > (cleanResponse.match(/[A-Za-z]/g)?.length ?? 0) ? uiLang : "English");
          // Listen for the student's NEXT turn in whatever language the AI just
          // spoke: English stays English (so the echo of the AI's own English
          // voice is same-script and the echo-guard can drop it), and a native
          // explanation flips the mic to the native language for the student's
          // likely native reply — then the next English reply flips it back.
          setRecognitionLang(speechLang);
          lastAiSpeechRef.current = cleanResponse;
          // Voice the reply with per-script accents: English words in the tutor's
          // English voice, native words in a true native accent. The server splits
          // the reply when we pass the helper language; `language: "English"` keeps
          // the English runs on the tutor voice. (speechLang above still drives
          // only which language we LISTEN in next, not the voice.)
          speakRef.current(cleanResponse, "English", releaseTurn, {
            rate: 1.0,
            nativeLanguage: uiLang !== "English" ? uiLang : undefined,
          });
        } else {
          releaseTurn();
        }
      } catch (err) {
        console.error("[English Guru] conversation turn failed", err);
        if (turnGeneration !== liveTurnGenerationRef.current) return;
        // Never leave the busy flag latched on an unexpected failure, or all
        // future turns (live and typed) would be silently blocked.
        if (speakSafetyTimerRef.current) {
          clearTimeout(speakSafetyTimerRef.current);
          speakSafetyTimerRef.current = null;
        }
        aiBusyRef.current = false;
        if (liveChatRef.current && !livePausedRef.current) {
          speechRef.current.suppressUntil(Date.now() + 900);
          speechRef.current.blockFor(0);
          setConvFlowState("user-speaking");
          speechRef.current.startContinuous(p => handleConvPhraseRef.current?.(p));
        } else {
          setConvFlowState("idle");
        }
      }
    })();
  // `speech` and `speak` intentionally removed from deps — accessed via
  // speechRef/speakRef so the callback isn't re-created on every render.
  // `level` and `uiLang` ARE deps so a filter change is picked up on the very
  // next turn (handleConvPhraseRef is refreshed by the effect below).
  }, [stream, resetAI, track, isStreaming, profile.name, tutor.teachingStyle, uiLang, level, teacherShort]);

  useEffect(() => { handleConvPhraseRef.current = handleConvPhrase; }, [handleConvPhrase]);

  // Continuity watchdog: browsers occasionally kill the SpeechRecognition loop
  // (transient errors, tab backgrounding, OS mic hiccups), which would make the
  // teacher stop answering after a reply. While live chat is on and the AI isn't
  // mid-turn, re-kick the loop every few seconds. startContinuous() is now
  // idempotent — if a recognizer is already spawning or listening it's a no-op
  // (guarded by recognitionActiveRef); if the loop actually died, it respawns.
  // This is what guarantees the conversation keeps going until the user ends it.
  useEffect(() => {
    if (!liveChat) return;
    const id = setInterval(() => {
      if (!liveChatRef.current || livePausedRef.current || aiBusyRef.current) return;
      // Don't retry while the mic is in a hard-error state (e.g. not-allowed).
      // The user needs to tap "Retry mic" first — auto-retrying just causes
      // rapid error flickers and masks the real problem.
      if (speechRef.current.error) return;
      speechRef.current.startContinuous(p => handleConvPhraseRef.current?.(p));
    }, 4000);
    return () => clearInterval(id);
  }, [liveChat]);

  // Start every live session with an AI-led English greeting. Previously Live
  // only opened the microphone and waited for the learner, which felt broken
  // because the teacher never initiated the conversation.
  const startLiveGreeting = useCallback(() => {
    const firstName = profile.name?.trim().split(/\s+/)[0] || "there";
    const opening = LIVE_OPENINGS[Math.floor(Math.random() * LIVE_OPENINGS.length)]!(firstName);
      const greeting = `${opening} I’m ${tutor.name.replace(/\s+(Ma'am|Sir)$/i, "")}.`;
    aiBusyRef.current = true;
    speechRef.current.pause();
    lastAiSpeechRef.current = greeting;
    setRecognitionLang("English");
    setConvHistory(h => [...h, { role: "ai", text: greeting }]);
    setConvFlowState("ai-speaking");

    const releaseGreeting = () => {
      if (!liveChatRef.current || livePausedRef.current) return;
      if (speakSafetyTimerRef.current) {
        clearTimeout(speakSafetyTimerRef.current);
        speakSafetyTimerRef.current = null;
      }
      aiBusyRef.current = false;
      lastAiSpeechEndRef.current = Date.now();
      speechRef.current.suppressUntil(Date.now() + 2500);
      // Tightened from 650ms — matches interview-ace.tsx and real natural-pause data (~400ms median)
      speechRef.current.blockFor(0);
      speechRef.current.startContinuous(p => handleConvPhraseRef.current?.(p));
      setConvFlowState("user-speaking");
    };

    speakSafetyTimerRef.current = setTimeout(
      releaseGreeting,
      Math.max(greeting.length * 60 + 4000, 10_000),
    );
    synth.speak(greeting, "English", releaseGreeting, {
      voiceGender: tutor.voiceGender,
      voiceStyle: tutor.voiceStyle,
      rate: ENGLISH_GURU_SPEECH_RATE,
    });
  }, [
    profile.name,
    tutor.name,
    tutor.voiceGender,
    tutor.voiceStyle,
    synth,
  ]);

  const toggleLiveChat = useCallback(async () => {
    // Unlock browser autoplay policy synchronously within the user-gesture stack.
    // Must run before any await so Chrome still considers this a gesture-initiated play.
    unlockAudio();
    if (liveChat) {
      cancelActiveTurn();
      setLiveChat(false);
      setLivePaused(false);
      livePausedRef.current = false;
      setConvFlowState("idle");
      silenceProbeCountRef.current = 0;
      return;
    }
    liveTurnGenerationRef.current += 1;
    // Don't decide guest vs. paid until auth has resolved — otherwise a signed-in
    // user could slip onto the free path before /api/auth/me returns.
    if (authLoading) {
      toast({ title: "One moment…", description: "Checking your account — please try again in a second." });
      return;
    }
    // Ask for microphone access while still inside the Live button gesture.
    // SpeechRecognition can otherwise fail silently in Chrome/Brave after a
    // deployed-origin permission change, leaving only the AI's silence nudges.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getTracks().forEach(track => track.stop());
      } catch {
        toast({
          title: "Microphone access is needed",
          description: "Allow microphone access in your browser, then tap Live again.",
          variant: "destructive",
        });
        return;
      }
    }
    // Guests get a free 15-minute trial (no signup); signed-in users spend credits (5/hour).
    if (!user) {
      if (guestLiveSecondsLeft() <= 0) {
        setShowCreditGate(true);
        return;
      }
    } else {
      const charge = await startLiveBlock();
      if (!charge.ok) {
        if (charge.status === 402) {
          setShowCreditGate(true);
        } else {
          toast({ title: "Couldn't start live chat", description: charge.error ?? "Please try again.", variant: "destructive" });
        }
        return;
      }
    }
    liveChatRef.current = true;
    livePausedRef.current = false;
    setLiveChat(true);
    setConvFlowState("user-speaking");
    // The teacher initiates first; the microphone starts after the greeting.
    startLiveGreeting();
  }, [liveChat, speech, user, authLoading, toast, cancelActiveTurn, startLiveGreeting]);

  const togglePauseLiveChat = useCallback(() => {
    if (!liveChat) return;
    const next = !livePausedRef.current;
    livePausedRef.current = next;
    setLivePaused(next);
    if (next) {
      // Invalidate first, then abort/stop everything. This makes pause
      // immediate even while the AI fetch is between await points.
      cancelActiveTurn();
      setConvFlowState("idle");
    } else {
      liveTurnGenerationRef.current += 1;
      const recentUser = [...convHistoryRef.current].reverse().find(m => m.role === "user")?.text;
      const recall = recentUser
        ? `Okay, we're back. We were talking about "${recentUser.slice(0, 90)}${recentUser.length > 90 ? "…" : ""}". Take your time and continue from there — I'm listening.`
        : "Okay, we're back. I remember where we were — go ahead and continue. I'm listening.";
      aiBusyRef.current = true;
      // pause() intentionally creates a long recognition block. Stop the
      // current recognizer first, then clear that block so resume never waits
      // for the old ten-minute pause window.
      speechRef.current.pause();
      speechRef.current.blockFor(0);
      setConvHistory(h => [...h, { role: "ai", text: recall }]);
      setConvFlowState("ai-speaking");
      lastAiSpeechRef.current = recall;
      const releaseResume = () => {
        aiBusyRef.current = false;
        if (!liveChatRef.current || livePausedRef.current) return;
        lastAiSpeechEndRef.current = Date.now();
        speechRef.current.suppressUntil(Date.now() + 1200);
        speechRef.current.blockFor(0);
        setConvFlowState("user-speaking");
      };
      speakRef.current(recall, "English", releaseResume, { rate: 1.0 });
    }
  }, [liveChat, speech, cancelActiveTurn]);

  // Keep a live reference to the "stop everything" action for the metering timer.
  const stopLiveRef = useRef<() => void>(() => {});
  useEffect(() => {
    stopLiveRef.current = () => {
      setLiveChat(false);
      setLivePaused(false);
      livePausedRef.current = false;
      setConvFlowState("idle");
      cancelActiveTurn();
    };
  }, [cancelActiveTurn]);

  // Meter live conversation: signed-in users spend 1 credit per 12-min block;
  // guests burn down a free 15-minute trial. Both end gracefully when exhausted.
  useEffect(() => {
    if (!liveChat) return;
    if (user) {
      const id = setInterval(async () => {
        const r = await tickLiveBlock();
        if (!r.ok && r.status === 402) {
          stopLiveRef.current();
          toast({ title: "Credits used up", description: "Your live conversation ended. Top up to keep chatting.", variant: "destructive" });
        }
      }, LIVE_BLOCK_SECONDS * 1000);
      return () => clearInterval(id);
    }
    // Guest trial: tick down the free 15 minutes locally.
    const GUEST_TICK = 10; // seconds
    const id = setInterval(() => {
      addGuestLiveSeconds(GUEST_TICK);
      if (guestLiveSecondsLeft() <= 0) {
        stopLiveRef.current();
        toast({ title: "Free trial finished 🎉", description: "That's your 15 free minutes. Sign in to get 20 free credits and keep going.", variant: "destructive" });
      }
    }, GUEST_TICK * 1000);
    return () => clearInterval(id);
  }, [liveChat, user, toast]);

  const handleConvSend = useCallback(async () => {
    const userMsg = convInput.trim();
    if (!userMsg) return;
    setConvInput("");
    await handleConvPhrase(userMsg);
  }, [convInput, handleConvPhrase]);

  return (
    <div className="min-h-full w-full min-w-0 max-w-full overflow-x-hidden lg:h-full lg:flex lg:flex-col lg:overflow-hidden container mx-auto px-3 sm:px-4 pt-1 pb-2 max-w-6xl">
      {showTutorPicker && (
        <TutorSelector currentId={tutorId} onSelect={handleSelectTutor} onClose={() => setShowTutorPicker(false)} />
      )}
      <div className="mb-3 flex flex-col items-center gap-1.5 md:hidden">
        <LanguageHighlight />
        <MobilePrimaryCTA label="Start Speaking Practice" onClick={() => document.getElementById("english-guru-live")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
      </div>
      <div className="mb-3 hidden flex-col items-center gap-1.5 md:flex">
        <LanguageHighlight />
        <Button
          size="lg"
          className="h-11 w-full max-w-sm bg-orange-500 px-5 text-sm font-extrabold text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
          onClick={() => document.getElementById("english-guru-live")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          Start Speaking Practice
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr] lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Sidebar */}
        <aside className="order-2 lg:order-1 space-y-2 lg:flex lg:flex-col lg:overflow-y-auto lg:min-h-0">
          {/* Change Teacher — top of page CTA */}
          <Button
            variant="default"
            className="w-full font-semibold rounded-xl h-9"
            onClick={() => setShowTutorPicker(true)}
          >
            <Users className="w-4 h-4 mr-2" />Change Teacher
          </Button>

          {/* Student Name */}
          <Card className="border shadow-sm">
            <CardContent className="pt-2 pb-2 space-y-2">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student Name</span>
                <Input
                  value={profile.name}
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  placeholder={user?.name ?? "Your name"}
                  className="h-8 text-sm"
                />
              </label>
            </CardContent>
          </Card>

          {/* Desktop avatar card */}
          <div className="hidden lg:flex flex-col items-center py-3 px-3 bg-card rounded-2xl border shadow-sm">
            <AnimatedAvatar
              name={tutor.name}
              subtitle={tutor.role}
              isSpeaking={synth.isSpeaking}
              isThinking={isStreaming}
              gender={tutor.gender}
              size="md"
              imageSrc={tutor.imageSrc}
            />
             <Badge variant="secondary" className="mt-1 text-[10px] font-medium">
               Speaks: {tutor.languages.filter(l => l !== "English").concat("English").join(" + ")}
             </Badge>
            <div className="mt-2 text-center px-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed italic line-clamp-2">"{tutor.intro}"</p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {tutor.languages.map(l => (
                <span key={l} className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">{l}</span>
              ))}
            </div>
            {liveChat && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Live ON
              </div>
            )}
          </div>

          {/* Mobile avatar bar — hidden; portrait is now at the top of main content */}
          <div className="hidden items-center gap-3 p-3 bg-card rounded-xl border shadow-sm">
            <AnimatedAvatar
              name={tutor.name}
              subtitle={tutor.role}
              isSpeaking={synth.isSpeaking}
              isThinking={isStreaming}
              gender={tutor.gender}
              size="md"
              imageSrc={tutor.imageSrc}
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{tutor.name}</p>
              <p className="text-xs text-muted-foreground">{tutor.role}</p>
              <Badge variant="secondary" className="text-xs mt-0.5">{level}</Badge>
              {liveChat && <div className="text-xs text-green-600 font-semibold mt-0.5 animate-pulse">● Live</div>}
            </div>
            <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setShowTutorPicker(true)}>
              <Users className="w-3.5 h-3.5" />
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="order-1 lg:order-2 min-w-0 lg:flex lg:flex-col lg:min-h-0 lg:overflow-y-auto max-lg:overflow-y-auto max-lg:min-h-0">
          {/* ── MOBILE HERO — Change Teacher at top, then student greeting + tutor ── */}
          <div className="lg:hidden flex flex-col shrink-0 mb-2 gap-1.5">
            <Button
              variant="default"
              className="w-full font-semibold rounded-xl h-9"
              onClick={() => setShowTutorPicker(true)}
            >
              <Users className="w-4 h-4 mr-2" />Change Teacher
            </Button>
            <div className="flex items-center gap-2 py-2 px-3 bg-card rounded-2xl border shadow-sm">
              <AnimatedAvatar
                name={tutor.name}
                subtitle={tutor.role}
                isSpeaking={synth.isSpeaking}
                isThinking={isStreaming}
                gender={tutor.gender}
                size="sm"
                imageSrc={tutor.imageSrc}
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-secondary leading-tight">{profile.name || user?.name ? `Hi, ${profile.name || user?.name} 👋` : "Hi there 👋"}</p>
                <p className="text-xs text-muted-foreground italic leading-snug line-clamp-2 mt-0.5">"{tutor.intro}"</p>
                {liveChat && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold animate-pulse mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Live ON
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── STICKY PROFILE BAR — always visible at top without scrolling ── */}
          <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-1 mb-2 bg-background/95 backdrop-blur-sm border-b flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-secondary truncate">{profile.name || user?.name || "Guest"}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs font-medium text-muted-foreground">Native language</span>
            <Select value={uiLang} onValueChange={(v) => {
              if (v === uiLang) return;
              setUiLang(v);
              updateProfile({ preferredLanguage: v });
              // AI resumes English-first after a language change, so reset the mic
              // to English; from there it re-follows whatever the AI actually
              // speaks (English by default, the new native language right after an
              // explanation). uiLang still reaches the AI on its next turn.
              setRecognitionLang("English");
              // Live chat: DON'T interrupt the conversation. If it's the student's
              // turn, softly restart the mic so the reset language applies right
              // away; the loop stays alive (pause()+blockFor keep shouldContinue
              // true). Never touch the mic while the AI is mid-turn (aiBusyRef) or
              // it would capture the coach's own voice as input.
              if (liveChatRef.current && !aiBusyRef.current) {
                speech.pause();
                speech.blockFor(150);
              }
            }}>
              <SelectTrigger className="h-7 text-xs w-[120px] rounded-full border-dashed" aria-label="Native language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">🇬🇧 English</SelectItem>
                <SelectItem value="Hindi">🇮🇳 Hindi</SelectItem>
                {INDIAN_LANGUAGES.filter(l => l !== "Hindi").map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={(v) => {
              if (v === level) return;
              setLevel(v);
              updateProfile({ englishLevel: v });
              // Applies to the AI's next turn immediately (level is a handleConvPhrase
              // dep, so handleConvPhraseRef is refreshed). The live session is left
              // completely untouched — no stop, no abort — so continuity is preserved.
            }}>
              <SelectTrigger className="h-7 text-xs w-[110px] rounded-full border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Beginner", "Intermediate", "Advanced"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            {liveChat && (
              <span className="ml-auto text-xs text-green-600 font-semibold animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Live
              </span>
            )}
          </div>

          {/* ── LIVE CONVERSATION — top section with its own heading ── */}
          <section id="english-guru-live" className="flex flex-col min-h-0 flex-1">
            <Card className={`flex flex-col overflow-hidden border-2 transition-all flex-1 min-h-0 max-h-[calc(100dvh-6rem)] lg:max-h-none ${liveChat ? "border-green-400 bg-green-50/30" : "border-green-200/70 bg-green-50/10"}`}>
            <CardContent className="pt-3 pb-3 space-y-2 flex min-h-0 flex-1 flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-secondary">Live Conversation</h2>
                    <p className="text-xs text-muted-foreground">{uiLang === "English" ? "Speak in English — I reply naturally" : `Speak in English or ${uiLang} — I'll help in ${uiLang} when you're stuck`}</p>
                  </div>
                </div>
                <Button
                  onClick={toggleLiveChat}
                  variant={liveChat ? "destructive" : "default"}
                  size="sm"
                  className={`font-bold shrink-0 w-full sm:w-auto ${liveChat ? "" : "bg-green-600 hover:bg-green-700"}`}
                  disabled={!speech.isSupported}>
                  {liveChat ? <><StopCircle className="w-4 h-4 mr-1.5" />End</> : <><Mic className="w-4 h-4 mr-1.5" />Live</>}
                </Button>
                {liveChat && (
                  <Button
                    onClick={togglePauseLiveChat}
                    variant="outline"
                    size="sm"
                    className="font-bold shrink-0 w-full sm:w-auto"
                  >
                    {livePaused ? <><Mic className="w-4 h-4 mr-1.5" />Resume</> : <><StopCircle className="w-4 h-4 mr-1.5" />Pause</>}
                  </Button>
                )}
              </div>
              {!liveChat && (
                <p className="text-xs text-muted-foreground">
                  {user ? (
                    <>Uses <span className="font-semibold text-secondary">5 credits/hour</span> · Balance: <span className="font-semibold text-secondary">{balance ?? "…"}</span> · <Link href="/credits" className="text-primary font-semibold hover:underline">Top up</Link></>
                  ) : guestLiveLeft > 0 ? (
                    <><span className="font-semibold text-green-700">{Math.ceil(guestLiveLeft / 60)} min</span> free trial left — no signup needed · <Link href="/login?returnTo=%2Fenglish-guru" className="text-primary font-semibold hover:underline">Sign in</Link> for 20 free credits</>
                  ) : (
                    <>Free trial used up · <Link href="/login?returnTo=%2Fenglish-guru" className="text-primary font-semibold hover:underline">Sign in</Link> to get 20 free credits and keep chatting</>
                  )}
                </p>
              )}
              {liveChat && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  convFlowState === "user-speaking"
                    ? speech.status === "warming"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : speech.status === "listening"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-muted text-muted-foreground border"
                    : convFlowState === "ai-thinking" || convFlowState === "ai-speaking"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-muted text-muted-foreground"
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    convFlowState === "user-speaking"
                      ? speech.status === "warming"
                        ? "bg-amber-400 animate-pulse"
                        : speech.status === "listening"
                          ? "bg-green-500 animate-pulse"
                          : "bg-muted-foreground animate-pulse"
                      : convFlowState === "ai-thinking"
                        ? "bg-yellow-500 animate-pulse"
                        : convFlowState === "ai-speaking"
                          ? "bg-blue-500 animate-pulse"
                          : "bg-muted-foreground"
                  }`} />
                   {convFlowState === "user-speaking" && (
                     <span className="sr-only" role="status">
                       {speech.error ? speech.error : "Listening for your voice"}
                     </span>
                   )}
                  {convFlowState === "ai-thinking" && `${tutor.name} is thinking...`}
                  {convFlowState === "ai-speaking" && `${tutor.name} is speaking... (mic restarts when done)`}
                  {convFlowState === "idle" && (livePaused ? "Live chat paused" : "Live chat off")}
                   {convFlowState === "user-speaking" && speech.status === "listening" && (
                     <span
                       className="ml-auto flex h-2 w-16 items-center gap-0.5 overflow-hidden rounded-full bg-green-100"
                       aria-label="Microphone listening level"
                     >
                       {[0.55, 0.85, 0.65, 1, 0.72, 0.92, 0.5].map((multiplier, index) => (
                         <span
                           key={index}
                           className="block flex-1 rounded-full bg-green-500 transition-all"
                           style={{ height: `${Math.max(15, Math.round(speech.audioLevel * multiplier * 100))}%` }}
                         />
                       ))}
                     </span>
                   )}
                  {liveChat && speech.error && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 px-2 text-xs"
                      onClick={async () => {
                        // Re-check mic permission inside the user gesture before
                        // restarting recognition — this surfaces a clear browser
                        // prompt if the permission was previously denied.
                        if (navigator.mediaDevices?.getUserMedia) {
                          try {
                            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                            s.getTracks().forEach(t => t.stop());
                          } catch {
                            toast({
                              title: "Microphone still blocked",
                              description: "Go to your browser settings, allow the microphone for this site, then try again.",
                              variant: "destructive",
                            });
                            return;
                          }
                        }
                        speech.stop();
                        speech.startContinuous(p => handleConvPhraseRef.current?.(p));
                      }}
                    >
                      Retry mic
                    </Button>
                  )}
                </div>
              )}
              {liveChat && aiError && (
                <div className="mx-1 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {aiError} — tap mic to try again
                </div>
              )}
              {(convHistory.length > 0 || isStreaming || (liveChat && !!speech.interimTranscript)) && (
                <div ref={convScrollRef} className="flex flex-col gap-3 flex-1 min-h-[260px] lg:min-h-0 overflow-y-auto pr-1 pt-1">
                  {liveChat && speech.interimTranscript && (
                    <div className="flex gap-2 justify-end">
                      <div className="max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words bg-primary/60 text-primary-foreground italic">
                        {speech.interimTranscript}
                        <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle bg-primary-foreground/80 animate-pulse" />
                      </div>
                    </div>
                  )}
                  {isStreaming && !aiText && (
                    <div className="flex gap-2 justify-start">
                      <div className="px-4 py-2.5 bg-muted rounded-2xl">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  {isStreaming && aiText && (
                    <div className="flex gap-2 justify-start">
                      <div className="max-w-[90%] rounded-2xl px-4 py-2.5 text-sm bg-muted text-secondary whitespace-pre-wrap break-words">{formatGeneratedText(aiText)}</div>
                    </div>
                  )}
                  {[...convHistory].reverse().map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary"}`}>
                         {msg.role === "user" ? msg.text : formatGeneratedText(msg.text)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!liveChat && (
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <Textarea
                    ref={convInputRef}
                    placeholder={uiLang === "English" ? "Type in English, or press mic to speak..." : `Type in English or ${uiLang}, or press mic to speak...`}
                    value={convInput}
                    onChange={e => setConvInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (convInput.trim()) void handleConvSend(); } }}
                    className="flex-1 min-h-[52px] max-h-[180px] resize-none overflow-hidden text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <MicButton isListening={speech.isListening} isSupported={speech.isSupported}
                      onStart={() => speech.start(t => setConvInput(p => p + t))} onStop={speech.stop} />
                    <Button className="font-bold px-4 w-full sm:w-auto" disabled={isStreaming || !convInput.trim()} onClick={handleConvSend}>
                      {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {convHistory.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground mr-1">Save chat:</span>
                  <Button variant="outline" size="sm" className="text-xs h-8"
                    onClick={() => exportConversationPdf(convHistory, { aiName: teacherShort, userName: profile.name || "You" })}>
                    <FileDown className="w-3.5 h-3.5 mr-1.5" />PDF
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-8"
                    onClick={() => exportConversationWord(convHistory, { aiName: teacherShort, userName: profile.name || "You" })}>
                    <FileText className="w-3.5 h-3.5 mr-1.5" />Word
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-8 ml-auto"
                    onClick={() => { setConvHistory([]); setLiveChat(false); speech.stop(); setConvFlowState("idle"); }}>
                    Clear & Start Over
                  </Button>
                </div>
              )}
              {!speech.isSupported && (
                <p className="text-xs text-muted-foreground text-center">Voice requires Chrome or Edge browser</p>
              )}
            </CardContent>
          </Card>
          </section>

        </main>
      </div>
      {showCreditGate && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">English Guru</p>
                <h2 className="mt-1 text-xl font-display font-bold text-secondary">
                  {user ? "You're out of credits" : "Keep practising with free credits"}
                </h2>
              </div>
              <button type="button" onClick={() => setShowCreditGate(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {user
                ? "Live conversation uses 5 credits per hour. Top up now and return here automatically."
                : "Sign in to receive your welcome credits and return to this conversation."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreditGate(false)}>Maybe later</Button>
              <Link href={user ? "/credits?returnTo=%2Fenglish-guru" : "/login?returnTo=%2Fenglish-guru"}>
                <Button className="font-bold">{user ? "Top Up Credits" : "Sign in — it’s free"}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
