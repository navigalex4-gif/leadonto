import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  RotateCw,
  Keyboard,
  Send,
  Globe,
  Coins,
  ArrowRight,
  ShieldCheck,
  Award,
  BookOpen,
  MessageCircle,
  HelpCircle,
  Zap,
} from "lucide-react";
import { GuruHomeButton } from "@/components/navigation/guru-home-button";
import { LanguageSheet, getSavedLanguageSettings, LANGUAGE_NATIVE_NAMES } from "@/components/shared/language-sheet";
import { GURU_FONT, GURU_COLORS } from "@/components/english/guru-theme";
import { TUTORS } from "@/lib/tutors";
type Tutor = (typeof TUTORS)[number];
import { type Scenario, SCENARIOS, type SuggestedReply } from "@/components/english/live-ui";
import { formatGeneratedText } from "@/lib/english-tools";

export interface GuruLiveMissionProps {
  user: any;
  profile: any;
  balance: number | null;
  guestLiveLeft: number;
  uiLang: string;
  setUiLang: (lang: string) => void;
  level: string;
  setLevel: (lvl: string) => void;
  tutor: Tutor;
  tutorId: string;
  onOpenTutorPicker: () => void;
  speech: any;
  synth: any;
  speak: (
    text: string,
    language?: string,
    onEnd?: () => void,
    opts?: { rate?: number; voiceGender?: "male" | "female"; voiceStyle?: string }
  ) => void;
  convHistory: { role: "user" | "ai"; text: string }[];
  convFlowState: "idle" | "user-speaking" | "ai-thinking" | "ai-speaking";
  liveChat: boolean;
  onToggleLive: () => void;
  handleConvPhrase: (text: string) => void;
  suggestions: SuggestedReply[];
  onAwardXp?: (amount: number) => void;
  requestedGoal?: string | null;
}

interface StepItem {
  key: string;
  labelHi: string;
  labelEn: string;
  questionEn: string;
  questionPhonetic: string;
  questionHi: string;
  replies: { en: string; phonetic: string; hi: string }[];
}

const DEFAULT_INTRO_STEPS: StepItem[] = [
  {
    key: "name",
    labelHi: "1 नाम",
    labelEn: "Name",
    questionEn: "What is your name?",
    questionPhonetic: "व्हाट इज़ योर नेम?",
    questionHi: "आपका नाम क्या है?",
    replies: [
      { en: "My name is Mohan.", phonetic: "माय नेम इज़ मोहन", hi: "मेरा नाम मोहन है।" },
      { en: "I am Rahul.", phonetic: "आई एम राहुल", hi: "मैं राहुल हूँ।" },
      { en: "My name is Priya.", phonetic: "माय नेम इज़ प्रिया", hi: "मेरा नाम प्रिया है।" },
    ],
  },
  {
    key: "city",
    labelHi: "2 शहर",
    labelEn: "City",
    questionEn: "Where are you from?",
    questionPhonetic: "व्हेयर आर यू फ्रॉम?",
    questionHi: "आप कहाँ से हैं?",
    replies: [
      { en: "I am from Delhi.", phonetic: "आई एम फ्रॉम दिल्ली", hi: "मैं दिल्ली से हूँ।" },
      { en: "I am from Patna.", phonetic: "आई एम फ्रॉम पटना", hi: "मैं पटना से हूँ।" },
      { en: "I live in Mumbai.", phonetic: "आई लिव इन मुंबई", hi: "मैं मुंबई में रहता हूँ।" },
    ],
  },
  {
    key: "work",
    labelHi: "3 काम",
    labelEn: "Work",
    questionEn: "What do you do?",
    questionPhonetic: "व्हाट डू यू डू?",
    questionHi: "आप क्या काम या पढ़ाई करते हैं?",
    replies: [
      { en: "I am a student.", phonetic: "आई एम अ स्टूडेंट", hi: "मैं एक छात्र हूँ।" },
      { en: "I work in an office.", phonetic: "आई वर्क इन एन ऑफ़िस", hi: "मैं दफ़्तर में काम करता हूँ।" },
      { en: "I am preparing for exams.", phonetic: "आई एम प्रिपेयरिंग फ़ॉर एग्ज़ाम्स", hi: "मैं परीक्षा की तैयारी कर रहा हूँ।" },
    ],
  },
];

const TEA_SHOP_STEPS: StepItem[] = [
  {
    key: "order",
    labelHi: "1 ऑर्डर",
    labelEn: "Order",
    questionEn: "What would you like to drink? Tea or coffee?",
    questionPhonetic: "व्हाट वुड यू लाइक टू ड्रिंक? टी ऑर कॉफ़ी?",
    questionHi: "आप क्या पीना पसंद करेंगे? चाय या कॉफ़ी?",
    replies: [
      { en: "One cup of hot tea, please.", phonetic: "वन कप ऑफ़ हॉट टी, प्लीज़", hi: "एक कप गरम चाय दीजिए।" },
      { en: "I would like a cold coffee.", phonetic: "आई वुड लाइक अ कोल्ड कॉफ़ी", hi: "मुझे एक कोल्ड कॉफ़ी चाहिए।" },
      { en: "Make it strong with less sugar.", phonetic: "मेक इट स्ट्रॉन्ग विद लेस शुगर", hi: "कम चीनी वाली कड़क चाय बनाइए।" },
    ],
  },
  {
    key: "price",
    labelHi: "2 कीमत",
    labelEn: "Price",
    questionEn: "How much does a cup of tea cost?",
    questionPhonetic: "हाउ मच डज़ अ कप ऑफ़ टी कॉस्ट?",
    questionHi: "एक कप चाय कितने की है?",
    replies: [
      { en: "How much is the total?", phonetic: "हाउ मच इज़ द टोटल", hi: "कुल कितने पैसे हुए?" },
      { en: "Do you accept UPI payment?", phonetic: "डू यू एक्सेप्ट यूपीआई पेमेंट", hi: "क्या आप UPI पेमेंट लेते हैं?" },
      { en: "Here is twenty rupees.", phonetic: "हियर इज़ ट्वेंटी रूपीस", hi: "यह लीजिए बीस रुपये।" },
    ],
  },
  {
    key: "snack",
    labelHi: "3 नाश्ता",
    labelEn: "Snack",
    questionEn: "Would you like some biscuits or samosa?",
    questionPhonetic: "वुड यू लाइक सम बिस्किट्स ऑर समोसा?",
    questionHi: "क्या आप साथ में बिस्कुट या समोसा लेंगे?",
    replies: [
      { en: "Yes, give me one samosa too.", phonetic: "येस, गिव मी वन समोसा टू", hi: "हाँ, एक समोसा भी दे दीजिए।" },
      { en: "No thanks, just tea for now.", phonetic: "नो थैंक्स, जस्ट टी फ़ॉर नाउ", hi: "नहीं धन्यवाद, अभी सिर्फ़ चाय।" },
      { en: "Are the samosas fresh?", phonetic: "आर द समोसाज़ फ्रेश", hi: "क्या समोसे ताज़ा हैं?" },
    ],
  },
];

export function GuruLiveMission({
  user,
  profile,
  balance,
  guestLiveLeft,
  uiLang,
  setUiLang,
  level,
  setLevel,
  tutor,
  tutorId,
  onOpenTutorPicker,
  speech,
  synth,
  speak,
  convHistory,
  convFlowState,
  liveChat,
  onToggleLive,
  handleConvPhrase,
  suggestions: dynamicSuggestions,
  onAwardXp,
  requestedGoal,
}: GuruLiveMissionProps) {
  const [, setLocation] = useLocation();
  const [missionPhase, setMissionPhase] = useState<"mission" | "complete" | "keep_going">("mission");
  const [activeScenarioId, setActiveScenarioId] = useState<"intro" | "tea_shop">("intro");
  const [showLangSheet, setShowLangSheet] = useState(false);
  const [typeMode, setTypeMode] = useState(false);
  const [typeInput, setTypeInput] = useState("");
  const [completedSentences, setCompletedSentences] = useState<string[]>([]);
  const xpAwardedRef = useRef(false);

  // Active step list
  const steps = activeScenarioId === "tea_shop" ? TEA_SHOP_STEPS : DEFAULT_INTRO_STEPS;

  // Determine current step index from user answers count
  const userAnswersCount = useMemo(
    () => convHistory.filter((m) => m.role === "user").length,
    [convHistory]
  );

  const currentStepIdx = Math.min(userAnswersCount, steps.length - 1);
  const isMissionFinished = userAnswersCount >= steps.length;

  // Transition to complete screen when mission is finished
  useEffect(() => {
    if (isMissionFinished && missionPhase === "mission") {
      setMissionPhase("complete");
      if (!xpAwardedRef.current) {
        xpAwardedRef.current = true;
        onAwardXp?.(30);
      }
    }
  }, [isMissionFinished, missionPhase, onAwardXp]);

  // Check if guest free time is exhausted
  const isTimeExhausted = !user && guestLiveLeft <= 0;
  const isBalanceExhausted = !!user && (balance ?? 0) <= 0;

  useEffect(() => {
    if (isTimeExhausted || (isBalanceExhausted && userAnswersCount >= 2)) {
      setMissionPhase("keep_going");
    }
  }, [isTimeExhausted, isBalanceExhausted, userAnswersCount]);

  // Track latest user sentence
  const latestUserSentence = useMemo(() => {
    const userMsgs = convHistory.filter((m) => m.role === "user");
    return userMsgs[userMsgs.length - 1]?.text || "";
  }, [convHistory]);

  // Track latest AI response / note
  const latestAiTurn = useMemo(() => {
    const aiMsgs = convHistory.filter((m) => m.role === "ai");
    return aiMsgs[aiMsgs.length - 1]?.text || "";
  }, [convHistory]);

  const currentStep = steps[currentStepIdx]!;

  // The question to display: latest AI message if available, otherwise current step predefined
  const displayQuestionEn = currentStep.questionEn;
  const displayQuestionPhonetic = currentStep.questionPhonetic;
  const displayQuestionHi = currentStep.questionHi;

  // Replay question audio
  const handleListenQuestion = (rate = 1.0) => {
    speak(displayQuestionEn, "English", undefined, {
      rate,
      voiceGender: tutor.voiceGender,
      voiceStyle: tutor.voiceStyle,
    });
  };

  // Replay user's best sentence
  const handleListenSentence = (text: string) => {
    speak(text, "English", undefined, {
      rate: 0.95,
      voiceGender: tutor.voiceGender,
      voiceStyle: tutor.voiceStyle,
    });
  };

  // Submit typed answer
  const handleSendType = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = typeInput.trim();
    if (!val) return;
    handleConvPhrase(val);
    setTypeInput("");
    setTypeMode(false);
  };

  // Tap a suggestion pill
  const handlePickSuggestion = (text: string) => {
    handleConvPhrase(text);
  };

  // Skip current step
  const handleSkipStep = () => {
    handleConvPhrase("Next question please.");
  };

  // Start next mission (Tea Shop)
  const handleStartNextMission = () => {
    setActiveScenarioId("tea_shop");
    setMissionPhase("mission");
    xpAwardedRef.current = false;
    speak(TEA_SHOP_STEPS[0]!.questionEn, "English", undefined, {
      rate: 1.0,
      voiceGender: tutor.voiceGender,
      voiceStyle: tutor.voiceStyle,
    });
  };

  // Active mic status
  const isListening = speech.isListening || convFlowState === "user-speaking";
  const isThinking = convFlowState === "ai-thinking";
  const isSpeaking = synth.isSpeaking || convFlowState === "ai-speaking";

  // Free trial minutes remaining
  const freeMinutesLeft = Math.ceil(guestLiveLeft / 60);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: MISSION COMPLETE SCREEN (Board 7)
  // ─────────────────────────────────────────────────────────────────────────────
  if (missionPhase === "complete") {
    return (
      <div
        className="min-h-screen w-full bg-[#F7F5F2] flex flex-col justify-between p-4 sm:p-6"
        style={{ fontFamily: GURU_FONT }}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between max-w-xl mx-auto w-full mb-4">
          <GuruHomeButton variant="pill" isDirty={false} />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            English Guru Live
          </span>
        </div>

        {/* Card Body */}
        <div className="max-w-xl mx-auto w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm text-center my-auto">
          {/* Green Check Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50 mb-4 animate-in zoom-in-75 duration-200">
            <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12163A]">
            मिशन पूरा! · Mission Complete
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {activeScenarioId === "tea_shop" ? "चाय की दुकान पर · At the tea shop" : "अपना परिचय दें · Self Introduction"}
          </p>

          {/* 3 Metric Stats */}
          <div className="grid grid-cols-3 gap-2.5 my-6">
            <div className="rounded-2xl bg-orange-50/70 border border-orange-100 p-3">
              <div className="text-xl sm:text-2xl font-black text-orange-950">
                {Math.max(3, userAnswersCount)}
              </div>
              <div className="text-[11px] font-bold text-orange-700/90 mt-0.5 leading-tight">
                वाक्य बोले · Spoken
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3">
              <div className="text-xl sm:text-2xl font-black text-emerald-950">+30 XP</div>
              <div className="text-[11px] font-bold text-emerald-700/90 mt-0.5 leading-tight">
                अंक अर्जित · XP
              </div>
            </div>
            <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-3">
              <div className="text-xl sm:text-2xl font-black text-blue-950">3</div>
              <div className="text-[11px] font-bold text-blue-700/90 mt-0.5 leading-tight">
                नए शब्द · Words
              </div>
            </div>
          </div>

          {/* Teacher Note Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-full bg-orange-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-orange-900">
                {tutor.name.charAt(0)}
              </div>
              <div className="text-xs font-bold text-slate-800">
                {tutor.name} · इंग्लिश कोच
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              "बहुत बढ़िया! अब आप अंग्रेज़ी में बिना झिझक के अपना परिचय दे सकते हैं।"
            </p>

            {/* User best sentence replay */}
            {latestUserSentence && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    आपका सबसे अच्छा वाक्य · Best Sentence
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#12163A] truncate">
                    "{latestUserSentence}"
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleListenSentence(latestUserSentence)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-white border border-slate-200 text-orange-600 hover:bg-orange-50 active:scale-95 shadow-xs"
                  aria-label="दोबारा सुनें · Replay"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Next Mission Card */}
          <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50/80 to-amber-50/60 p-4 text-left flex items-center justify-between gap-3 mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                अगला मिशन · Next Mission
              </div>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                चाय की दुकान पर · At the tea shop
              </div>
              <div className="text-xs text-slate-500 mt-0.5">3 मिनट का अभ्यास · +40 XP</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleStartNextMission}
              className="min-h-[52px] w-full rounded-2xl text-base font-extrabold text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              style={{ backgroundColor: GURU_COLORS.accent }}
            >
              <span>अगला मिशन शुरू करें · Start Next Mission</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setLocation("/english-guru/app")}
              className="min-h-[44px] w-full rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              होम पर जाएं · Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: KEEP GOING / UPGRADE SCREEN (Board 8)
  // ─────────────────────────────────────────────────────────────────────────────
  if (missionPhase === "keep_going") {
    return (
      <div
        className="min-h-screen w-full bg-[#F7F5F2] flex flex-col justify-between p-4 sm:p-6"
        style={{ fontFamily: GURU_FONT }}
      >
        <div className="flex items-center justify-between max-w-xl mx-auto w-full mb-4">
          <GuruHomeButton variant="pill" isDirty={false} />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            English Guru Live
          </span>
        </div>

        <div className="max-w-xl mx-auto w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm text-center my-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3">
            <Sparkles className="h-7 w-7" />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-[#12163A]">
            अच्छी शुरुआत! आपने 15 मिनट अंग्रेज़ी बोली।
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Great start! Keep up your speaking confidence and continue learning.
          </p>

          {/* Free Account Card (If Guest) */}
          {!user && (
            <div className="mt-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/60 p-4 text-left">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase">
                  Free
                </span>
                <span className="text-xs font-extrabold text-emerald-950">
                  मुफ़्त खाता बनाएं · 20 मुफ़्त क्रेडिट पाएं
                </span>
              </div>
              <p className="text-xs text-emerald-900/80 mt-1">
                साइन इन करने पर आपको 20 मुफ़्त क्रेडिट मिलेंगे, जिससे आप आगे बातचीत जारी रख सकते हैं।
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
              >
                Google से साइन इन करें · Sign in with Google
              </Link>
            </div>
          )}

          {/* Credit Packs */}
          <div className="mt-6 text-left">
            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2.5">
              क्रेडिट पैक चुनें · Choose a Credit Pack (₹1 = 1 क्रेडिट)
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { amount: 49, credits: 49, tag: "" },
                { amount: 99, credits: 99, tag: "सुझाया गया · Popular" },
                { amount: 199, credits: 199, tag: "बचत · Best Value" },
              ].map((pack) => (
                <Link
                  key={pack.amount}
                  href={`/buy-credits?amount=${pack.amount}`}
                  className={`relative p-3 rounded-2xl border-2 text-center transition-all hover:scale-102 active:scale-95 flex flex-col justify-between ${
                    pack.amount === 99
                      ? "border-orange-500 bg-orange-50/60"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {pack.tag && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[9px] font-black whitespace-nowrap shadow-xs">
                      {pack.tag}
                    </span>
                  )}
                  <div className="text-base sm:text-lg font-black text-[#12163A]">
                    ₹{pack.amount}
                  </div>
                  <div className="text-xs font-bold text-slate-600 mt-0.5">
                    {pack.credits} क्रेडिट्स
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">कभी समाप्त नहीं होते</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/buy-credits"
              className="min-h-[48px] w-full rounded-2xl text-xs sm:text-sm font-extrabold text-white shadow-sm flex items-center justify-center transition-all active:scale-98"
              style={{ backgroundColor: GURU_COLORS.accent }}
            >
              क्रेडिट्स जोड़ें · Add Credits
            </Link>
            <button
              type="button"
              onClick={() => setLocation("/english-guru/app")}
              className="min-h-[44px] text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              होम पर जाएं · Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: LIVE MISSION SCREEN (Boards 5 & 6)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen w-full bg-[#F7F5F2] flex flex-col"
      style={{ fontFamily: GURU_FONT }}
    >
      {/* ── HEADER NAVIGATION BAR ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 sm:px-6 py-2.5 shadow-xs backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Home Button + Title */}
          <div className="flex items-center gap-2">
            <GuruHomeButton
              variant="pill"
              isDirty={userAnswersCount > 0 && !isMissionFinished}
              onLeave={() => {
                speech?.stop?.();
                synth?.stop?.();
              }}
            />
            <div className="hidden sm:block">
              <span className="text-xs sm:text-sm font-extrabold text-[#12163A]">
                {activeScenarioId === "tea_shop" ? "चाय की दुकान · At the tea shop" : "परिचय मिशन · Self Introduction"}
              </span>
            </div>
          </div>

          {/* Center: Mission Step Dots */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {steps.map((st, i) => {
              const isDone = i < currentStepIdx;
              const isCurrent = i === currentStepIdx;
              return (
                <div key={st.key} className="flex items-center gap-1 sm:gap-1.5">
                  <div
                    className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all ${
                      isDone
                        ? "bg-emerald-100 text-emerald-800"
                        : isCurrent
                        ? "bg-[#C2410C] text-white shadow-xs"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                    <span className="hidden xs:inline">{st.labelHi}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`h-0.5 w-2 sm:w-3 ${
                        isDone ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Teacher Chip + Language Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Tutor Chip */}
            <button
              type="button"
              onClick={onOpenTutorPicker}
              className="min-h-[36px] px-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
              aria-label="शिक्षक बदलें · Change Teacher"
            >
              <div className="h-5 w-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-[10px]">
                {tutor.name.charAt(0)}
              </div>
              <span className="hidden sm:inline">{tutor.name}</span>
            </button>

            {/* Language Switcher Button */}
            <button
              type="button"
              onClick={() => setShowLangSheet(true)}
              className="min-h-[36px] px-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
              aria-label="भाषा चुनें · Choose Language"
            >
              <Globe className="h-3.5 w-3.5 text-orange-600" />
              <span>{LANGUAGE_NATIVE_NAMES[uiLang] || uiLang}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER (Desktop 2 cols, Mobile 1 col) ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left Column: Live Mission Stage */}
        <div className="flex flex-col space-y-4">
          {/* Main Question Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
            {/* Coach meta indicator */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-500">
                  {tutor.name} सवाल पूछ रही हैं · Question {currentStepIdx + 1} of {steps.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleListenQuestion(1.0)}
                  className="min-h-[36px] px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>सुनें · Listen</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleListenQuestion(0.75)}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors active:scale-95"
                  title="धीमी गति से सुनें"
                >
                  <span>🐢 धीरे</span>
                </button>
              </div>
            </div>

            {/* Big Question Text */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#12163A] leading-tight">
              {displayQuestionEn}
            </h2>

            {/* Phonetic Pronunciation */}
            <p className="text-sm sm:text-base font-semibold text-slate-500 mt-1.5">
              {displayQuestionPhonetic}
            </p>

            {/* Hindi / Native Meaning */}
            <div className="mt-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2">
              <span className="text-amber-700">💡 अर्थ:</span>
              <span>{displayQuestionHi}</span>
            </div>
          </div>

          {/* Suggestions Box */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                क्या बोलें? · What to say (टैप करें या बोलें)
              </span>
            </div>

            <div className="space-y-2">
              {currentStep.replies.map((rep, idx) => (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-orange-50/50 hover:border-orange-300 p-3 sm:p-3.5 transition-all flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => handlePickSuggestion(rep.en)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-sm sm:text-base font-bold text-[#12163A] group-hover:text-orange-950">
                      {rep.en}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {rep.phonetic} · <span className="text-slate-600 font-medium">{rep.hi}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleListenSentence(rep.en)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-300 shadow-2xs active:scale-95"
                    aria-label={`Listen: ${rep.en}`}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Speech / Feedback Strip */}
          {latestUserSentence && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>आप बोले · You said:</span>
              </div>
              <p className="font-semibold text-slate-800 mt-0.5">"{latestUserSentence}"</p>
            </div>
          )}

          {/* Type-instead text field if active */}
          {typeMode && (
            <form onSubmit={handleSendType} className="flex gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <input
                type="text"
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                placeholder="अंग्रेज़ी में लिखें... (Type in English)"
                className="flex-1 min-h-[44px] px-3 text-sm outline-none bg-transparent font-medium"
                autoFocus
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: GURU_COLORS.accent }}
              >
                भेजें · Send
              </button>
            </form>
          )}

          {/* ── ACTION DOCK (Mic / Type / Skip) ── */}
          <div className="sticky bottom-3 z-20 mt-auto pt-2">
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 shadow-lg flex items-center justify-between gap-2">
              {/* Keyboard toggle */}
              <button
                type="button"
                onClick={() => setTypeMode((prev) => !prev)}
                className={`min-h-[48px] min-w-[48px] rounded-2xl border flex items-center justify-center transition-all ${
                  typeMode
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="लिखकर जवाब दें · Type instead"
              >
                <Keyboard className="h-5 w-5" />
              </button>

              {/* Big Center Mic Button */}
              <button
                type="button"
                onClick={() => {
                  if (speech.isListening) {
                    speech.stop();
                  } else {
                    onToggleLive();
                  }
                }}
                className={`flex-1 min-h-[56px] sm:min-h-[60px] px-4 rounded-2xl font-extrabold text-sm sm:text-base text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2.5 ${
                  isListening
                    ? "bg-red-600 ring-4 ring-red-200 animate-pulse"
                    : isThinking
                    ? "bg-amber-600"
                    : "bg-[#C2410C] hover:bg-[#a3360a]"
                }`}
              >
                {isListening ? (
                  <>
                    <Mic className="h-6 w-6 stroke-[2.5]" />
                    <span>सुन रहे हैं… बोलिए · Listening…</span>
                  </>
                ) : isThinking ? (
                  <>
                    <RotateCw className="h-5 w-5 animate-spin" />
                    <span>सोच रहे हैं… Thinking…</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-6 w-6 stroke-[2.5]" />
                    <span>दबाकर बोलिए · Tap and speak</span>
                  </>
                )}
              </button>

              {/* Skip button */}
              <button
                type="button"
                onClick={handleSkipStep}
                className="min-h-[48px] px-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all active:scale-95"
              >
                छोड़ें · Skip
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Desktop Sidebar (Free Time, Missions, Recharge) */}
        <aside className="hidden lg:flex flex-col space-y-4">
          {/* Free time / credits meter */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
              <span>समय सीमा · Speaking Time</span>
              <span className="text-orange-600 font-extrabold">
                {!user ? `${freeMinutesLeft} / 15 मिनट मुफ़्त` : `${balance} क्रेडिट्स`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{
                  width: !user ? `${Math.min(100, (freeMinutesLeft / 15) * 100)}%` : "100%",
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {!user
                ? "मुफ़्त 15 मिनट समाप्त होने पर 20 क्रेडिट पाने के लिए साइन अप करें।"
                : "प्रति 12 मिनट की बातचीत = 1 क्रेडिट।"}
            </p>
          </div>

          {/* Today's Missions List */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">
              आज के मिशन · Today's Missions
            </h3>
            <div className="space-y-2.5">
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  activeScenarioId === "intro"
                    ? "border-orange-500 bg-orange-50/70"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">1. अपना परिचय दें</div>
                  <div className="text-[10px] text-slate-500">Self Introduction · 3 मिनट</div>
                </div>
                {activeScenarioId === "intro" ? (
                  <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">
                    चालू
                  </span>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>

              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  activeScenarioId === "tea_shop"
                    ? "border-orange-500 bg-orange-50/70"
                    : "border-slate-200 bg-slate-50/70 opacity-80"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">2. चाय की दुकान पर</div>
                  <div className="text-[10px] text-slate-500">At the tea shop · +40 XP</div>
                </div>
                {activeScenarioId === "tea_shop" ? (
                  <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">
                    चालू
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">अगला</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Credit Packs */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">
              <Coins className="h-4 w-4 text-orange-600" />
              <span>क्रेडिट रिचार्ज · Recharge</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              क्रेडिट कभी समाप्त नहीं होते। 1 क्रेडिट = ₹1।
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[49, 99, 199].map((amt) => (
                <Link
                  key={amt}
                  href={`/buy-credits?amount=${amt}`}
                  className={`p-2 rounded-xl border text-center transition-all hover:border-orange-400 active:scale-95 ${
                    amt === 99 ? "border-orange-500 bg-orange-50/60 font-bold" : "border-slate-200"
                  }`}
                >
                  <div className="text-xs font-extrabold text-slate-900">₹{amt}</div>
                  <div className="text-[10px] text-slate-500">{amt} cr</div>
                </Link>
              ))}
            </div>
            <Link
              href="/buy-credits"
              className="min-h-[38px] w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center transition-colors"
            >
              क्रेडिट जोड़ें · Add Credits
            </Link>
          </div>
        </aside>
      </main>

      {/* Language Selector Bottom Sheet / Modal */}
      <LanguageSheet
        open={showLangSheet}
        onClose={() => setShowLangSheet(false)}
        showQuestionLangSetting={false}
        onSave={(settings) => {
          setUiLang(settings.helpLang);
        }}
      />
    </div>
  );
}

export default GuruLiveMission;
