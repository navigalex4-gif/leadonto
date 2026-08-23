import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Loader2, Mic, MicOff, Sparkles, Target } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnimatedAvatar } from "@/components/avatar";
import { useToast } from "@/hooks/use-toast";
import { PageMeta } from "@/components/page-meta";
import { useAuth } from "@/lib/use-auth";
import { useGeminiStream } from "@/lib/use-gemini-stream";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { unlockAudio, useGoogleTTS } from "@/lib/use-edge-tts";
import { track, trackFunnel } from "@/lib/analytics";
import { MobilePrimaryCTA } from "@/components/mobile-primary-cta";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TOTAL_SECONDS = 90;
const COMMUNICATION_CHECK_SPEECH_RATE = 1.0;
const QUICK_ACKNOWLEDGEMENTS = [
  "That is a useful example",
  "I can see the effort there",
  "That gives me a clearer picture",
  "Interesting — let us explore that",
  "That sounds like a practical step",
  "I like the way you explained that",
  "That is worth unpacking",
  "You have given me something specific to work with",
];
const OPENING_QUESTIONS = [
  "Tell me about something you are working towards right now.",
  "What is one recent experience you would enjoy telling a colleague about?",
  "What is something you learned recently, and why did it matter to you?",
  "Tell me about a small win you had recently.",
];
const FIRST_QUESTION = OPENING_QUESTIONS[0]!;
const SIGNALS = ["structure", "clarity", "explanation", "collaboration", "adaptability", "confidence", "self-awareness", "listening"] as const;
type Signal = typeof SIGNALS[number];
const QUESTION_BANK = [
  // The bank is intentionally balanced across the strongest observable
  // communication signals: structure, clarity, listening/empathy, explanation,
  // collaboration, persuasion, adaptability and self-awareness.
  "Explain a task or idea you know well to someone who is new to it.",
  "Tell me about a time you had to handle a difficult conversation. What did you say first?",
  "Describe a problem you faced, the action you took, and what happened next.",
  "What is one strength you bring to a team? Give a short example.",
  "How would you introduce yourself to a new customer or colleague?",
  "Tell me about a time you changed your approach after receiving feedback.",
  "When you disagree with someone at work or in a group, how do you explain your view?",
  "Imagine you need someone to support your idea. How would you persuade them?",
  "What do you do when you are not sure you understand someone's instructions?",
  "Tell me about a time you helped another person understand something.",
  "What motivates you when a task becomes challenging?",
  "How do you decide what information is important when explaining something?",
  "Tell me about a small decision you made recently and why you made it.",
  "What helps you stay calm and clear when something does not go as planned?",
  "How do you usually prepare before speaking to a group or interviewer?",
  "What kind of feedback helps you improve the way you communicate?",
  "Tell me about a time you had to adapt your message for a different person.",
  "What is one communication habit you are actively trying to improve?",
  "If you had one extra hour today, how would you use it and why?",
  "Before we finish, what would you like an interviewer to understand about you?",
  "What is a skill you learned outside school or work that helps you today?",
  "Tell me about a time you made a mistake and what you changed afterward.",
  "What is the most useful advice someone has given you?",
  "Describe a situation where you had to learn something quickly.",
  "What would you do if a customer or teammate misunderstood your message?",
  "Tell me about a time you took responsibility without being asked.",
  "What kind of work makes you lose track of time?",
  "Describe a day when your plan changed suddenly. How did you respond?",
  "What is one everyday problem you would like to solve?",
  "Tell me about a person who has influenced the way you work.",
  "How would you explain your current goal to a ten-year-old?",
  "What do you do when you need to disagree respectfully?",
  "Tell me about a time you encouraged someone else.",
  "Which part of a new job would you want to understand first?",
  "What makes a conversation feel successful to you?",
  "Describe a time you had to wait, persist, or try again.",
  "If you could improve one service in your city, what would you change?",
  "Tell me about a recent choice you are proud of.",
  "What is something you can teach another person confidently?",
  "How do you prepare when you have to speak to someone senior?",
  "Tell me about a time you solved a problem with limited information.",
  "What would your best friend say is your strongest quality?",
  "What is one question you ask when you join a new team?",
  "Imagine your first week in your target role. What would success look like?",
  "Tell me about a moment when listening carefully helped you.",
  "What is one topic you could discuss for five minutes without preparation?",
  "Describe a time you changed someone’s mind respectfully.",
  "What helps you recover when a conversation does not go well?",
  "What is a small habit that has made you more dependable?",
];
const INTERVIEWER = {
  name: "Neha Madam",
  imageSrc: "/images/tutor-neha.jpg",
  gender: "female" as const,
  voiceStyle: "neha",
};

type Candidate = {
  name: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  experienceLevel: string;
};

type Answer = { question: string; answer: string };
type Feedback = {
  source?: "ai" | "indicative";
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  clarityScore: number;
  headline: string;
  strengths: string[];
  evidence?: string[];
  oneNextStep: string;
  summary: string;
  personalizedPlan: string[];
};

function cleanSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^(?:Ack|Next):\s*/gim, "")
    .replace(/[#*_]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeQuestion(text: string): string {
  return cleanSpeech(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionIsRepeated(question: string, askedQuestions: string[]): boolean {
  const candidate = normalizeQuestion(question);
  if (!candidate) return true;
  const candidateWords = new Set(candidate.split(" ").filter((word) => word.length > 2));
  return askedQuestions.some((asked) => {
    const normalizedAsked = normalizeQuestion(asked);
    if (normalizedAsked === candidate) return true;
    const askedWords = new Set(normalizedAsked.split(" ").filter((word) => word.length > 2));
    if (!candidateWords.size || !askedWords.size) return false;
    const shared = [...candidateWords].filter((word) => askedWords.has(word)).length;
    const similarity = shared / Math.min(candidateWords.size, askedWords.size);
    return similarity >= 0.78;
  });
}

function extractQuestion(text: string): string {
  const sentences = cleanSpeech(text).split(/(?<=[?!.])\s+/).filter(Boolean);
  return sentences.find((sentence) => sentence.includes("?")) ?? "";
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededIndex(seed: number, length: number, offset = 0): number {
  const value = Math.imul(seed ^ Math.imul(offset + 1, 374761393), 668265263) >>> 0;
  return value % length;
}

function roleContext(candidate: Candidate): string {
  const role = candidate.targetRole.trim();
  if (!role) return "the kind of work you want next";
  return role.length > 70 ? role.slice(0, 70) : role;
}

function openingFor(candidate: Candidate, seed: number): string {
  const role = roleContext(candidate);
  const location = candidate.location.trim();
  const experience = candidate.experienceLevel === "Fresher"
    ? "as someone starting out"
    : `with ${candidate.experienceLevel || "your current experience"}`;
  const options = [
    `What are you working towards in ${role}, and what has prepared you for it?`,
    `Tell me about something you have done recently that connects to ${role}.`,
    `Imagine you are introducing yourself for ${role} ${experience}. What would you want them to know?`,
    location
      ? `What would make a good opportunity in ${role} feel right for you in or around ${location}?`
      : `What interests you most about moving towards ${role}?`,
  ];
  return options[seededIndex(seed, options.length)]!;
}

function nextUnusedQuestion(askedQuestions: string[], seed: number, candidate: Candidate, signal: Signal): string {
  const role = roleContext(candidate);
  const experience = candidate.experienceLevel === "Fresher" ? "as someone starting out" : `with ${candidate.experienceLevel || "your experience"}`;
  const contextual = [
    `Explain one skill you would use in ${role} to someone who is new to it.`,
    `Tell me about a time you had to work with someone different from you while preparing for ${role}.`,
    `What is one challenge you expect in ${role}, and how would you handle it?`,
    `How would you explain your strongest reason for choosing ${role} to a customer or colleague?`,
    `Tell me about a piece of feedback that could help you grow ${experience}.`,
    `If a teammate misunderstood your message about ${role}, how would you make it clearer?`,
  ];
  const pool = [...QUESTION_BANK, contextual[seededIndex(seed, contextual.length, askedQuestions.length + SIGNALS.indexOf(signal))]!];
  const ordered = pool
    .map((question, index) => ({ question, index: (index + seededIndex(seed, pool.length, askedQuestions.length)) % pool.length }))
    .sort((a, b) => a.index - b.index)
    .map(({ question }) => question);
  return ordered.find((question) => !questionIsRepeated(question, askedQuestions))
    ?? `What is one thing about ${role} you would like to practise saying more confidently?`;
}

function getAnonymousId(): string {
  try {
    const key = "leadonto_communication_check_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return "anonymous-check";
  }
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function localFallback(answers: Answer[]): Feedback {
  const words = answers.reduce((sum, item) => sum + item.answer.trim().split(/\s+/).filter(Boolean).length, 0);
  const score = Math.max(42, Math.min(84, 48 + Math.min(24, words) + answers.filter((item) => item.answer.trim()).length * 5));
  return {
    overallScore: score,
    communicationScore: Math.min(90, score + 2),
    confidenceScore: Math.max(35, score - 2),
    clarityScore: Math.min(90, score + 1),
    headline: "You have a workable foundation.",
    strengths: ["You completed the speaking check", "You communicated a main idea"],
    oneNextStep: "Answer in three parts: point, example, and result.",
    summary: "This is an indicative check. Practise one spoken answer daily to build a clearer, more confident delivery.",
    personalizedPlan: [
      "Record one 60-second answer each day using point, example, and result.",
      "Replay it once and remove filler words before trying again.",
      "Practise one role-specific answer aloud three times this week.",
    ],
  };
}

function scoreTone(score: number): { card: string; bar: string; text: string } {
  if (score >= 75) return { card: "border-emerald-200 bg-emerald-50", bar: "bg-emerald-500", text: "text-emerald-700" };
  if (score >= 55) return { card: "border-amber-200 bg-amber-50", bar: "bg-amber-500", text: "text-amber-700" };
  return { card: "border-rose-200 bg-rose-50", bar: "bg-rose-500", text: "text-rose-700" };
}

export default function CommunicationCheck() {
  const { user } = useAuth();
  const { toast } = useToast();
  // A shorter end-of-speech window is appropriate for this bounded check;
  // the final server transcript remains authoritative.
  const speech = useSpeechRecognition("English");
  const synth = useGoogleTTS();
  const { stream, reset: resetStream } = useGeminiStream();
  const [phase, setPhase] = useState<"details" | "interview" | "feedback">("details");
  const [candidate, setCandidate] = useState<Candidate>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    location: "",
    targetRole: "",
    experienceLevel: "Fresher",
  });
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(FIRST_QUESTION);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const answerRef = useRef("");
  const questionRef = useRef(FIRST_QUESTION);
  const answersRef = useRef<Answer[]>([]);
  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceWrapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishWithFeedbackRef = useRef<(finalAnswers: Answer[]) => void>(() => {});
  const endingRef = useRef(false);
  const closingRef = useRef(false);
  const turnRef = useRef(false);
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [isListening, setIsListening] = useState(false);
  const finalWindowRef = useRef(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const interviewStartedAtRef = useRef<number | null>(null);
  const sessionSeedRef = useRef(0);
  const signalIndexRef = useRef(0);

  useEffect(() => {
    trackFunnel("communication_check_opened", { authenticated: Boolean(user) });
  }, [user]);

  useEffect(() => {
    if (user) {
      setCandidate((current) => ({
        ...current,
        name: current.name || user.name || "",
        email: current.email || user.email || "",
      }));
    }
  }, [user]);

  const clearTimers = useCallback(() => {
    if (autoSubmitRef.current) clearTimeout(autoSubmitRef.current);
    if (deadlineRef.current) clearTimeout(deadlineRef.current);
    if (speechSafetyRef.current) clearTimeout(speechSafetyRef.current);
    if (silenceWrapRef.current) clearTimeout(silenceWrapRef.current);
    autoSubmitRef.current = null;
    deadlineRef.current = null;
    speechSafetyRef.current = null;
    silenceWrapRef.current = null;
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    speech.pause();
    if (speechSafetyRef.current) clearTimeout(speechSafetyRef.current);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (speechSafetyRef.current) {
        clearTimeout(speechSafetyRef.current);
        speechSafetyRef.current = null;
      }
      speech.suppressUntil(Date.now() + 250);
      speech.blockFor(0);
      onEnd?.();
    };
    const spokenText = cleanSpeech(text);
    speechSafetyRef.current = setTimeout(
      release,
      Math.max(6000, spokenText.length * 65 + 2000),
    );
    void synth.speak(spokenText, "English", release, {
      voiceGender: "female",
      voiceStyle: INTERVIEWER.voiceStyle,
      rate: COMMUNICATION_CHECK_SPEECH_RATE,
    });
  }, [speech.pause, speech.suppressUntil, speech.blockFor, synth.speak]);

  const startListening = useCallback(() => {
    if (!speech.isSupported || endingRef.current || (closingRef.current && !finalWindowRef.current)) return;
    setIsListening(true);
    speech.blockFor(0);
    if (silenceWrapRef.current) clearTimeout(silenceWrapRef.current);
    silenceWrapRef.current = setTimeout(() => {
      if (endingRef.current || turnRef.current || answerRef.current.trim()) return;
      finishWithFeedbackRef.current(
        answersRef.current.length
          ? answersRef.current
          : [{ question: questionRef.current, answer: "" }],
      );
    }, 30_000);
    speech.startContinuous((text) => {
      const chunk = text.trim();
      if (!chunk || endingRef.current) return;
      if (silenceWrapRef.current) clearTimeout(silenceWrapRef.current);
      silenceWrapRef.current = null;
      const next = `${answerRef.current ? `${answerRef.current} ` : ""}${chunk}`.trim();
      answerRef.current = next;
      setCurrentAnswer(next);
      if (autoSubmitRef.current) clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = setTimeout(() => {
        const latest = answerRef.current.trim();
        if (latest) void submitAnswerRef.current(latest);
       }, 2200);
    });
  }, [speech]);

  // Recovery for browsers that silently stop MediaRecorder after the first
  // completed turn. Do not wait for a user click or a React remount.
  useEffect(() => {
    if (phase !== "interview" || !isListening || isThinking || speech.status !== "idle") return;
    const timer = setTimeout(() => startListening(), 350);
    return () => clearTimeout(timer);
  }, [phase, isListening, isThinking, speech.status, startListening]);

  const finishWithFeedback = useCallback(async (finalAnswers: Answer[]) => {
    if (endingRef.current) return;
    endingRef.current = true;
    clearTimers();
    speech.stop();
    synth.stop();
    setIsListening(false);
    setIsSubmitting(true);
    setIsThinking(true);
    const fallback = localFallback(finalAnswers);
    try {
      const response = await fetch(`${BASE}/api/communication-checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          anonymousId: getAnonymousId(),
          answers: finalAnswers,
          durationSeconds: Math.min(TOTAL_SECONDS, Math.max(0, Math.round((Date.now() - (interviewStartedAtRef.current ?? Date.now())) / 1000))),
        }),
      });
      const data = await response.json() as { feedback?: Feedback; error?: string; emailMessage?: string };
      if (!response.ok || !data.feedback) {
        trackFunnel("api_failed", { stage: "communication_check_submit", status: response.status });
        throw new Error(data.error || "Could not save feedback");
      }
      setFeedback(data.feedback);
      setEmailMessage("");
      setLeadSubmitted(false);
      trackFunnel("communication_check_completed", {
        authenticated: Boolean(user),
        saved: response.status === 201,
        needsDetails: Boolean((data as { needsDetails?: boolean }).needsDetails),
      });
    } catch {
      trackFunnel("api_failed", { stage: "communication_check_submit", reason: "network_or_save_error" });
      setFeedback(fallback);
      setEmailMessage("Your result is ready here, but the email could not be delivered. Please check your email address and try again.");
      toast({ title: "Feedback ready", description: "Your indicative score is shown; we could not sync the full result." });
    } finally {
      setIsSubmitting(false);
      setIsThinking(false);
      setPhase("feedback");
    }
  }, [candidate, clearTimers, speech, synth, toast, user]);

  useEffect(() => {
    finishWithFeedbackRef.current = (finalAnswers) => {
      void finishWithFeedback(finalAnswers);
    };
  }, [finishWithFeedback]);

  const sendExpandedFeedback = useCallback(async () => {
    if (!feedback) return;
    if (!candidate.name.trim() || !candidate.email.trim()) {
      trackFunnel("validation_failed", { stage: "expanded_feedback", missing: "name_or_email" });
      toast({ title: "Add your name and email", description: "We’ll use them to send your expanded personalised feedback.", variant: "destructive" });
      return;
    }
    setEmailSending(true);
    try {
      const response = await fetch(`${BASE}/api/communication-checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...candidate,
          anonymousId: getAnonymousId(),
          answers: answersRef.current,
          durationSeconds: Math.min(TOTAL_SECONDS, Math.max(0, Math.round((Date.now() - (interviewStartedAtRef.current ?? Date.now())) / 1000))),
        }),
      });
      const data = await response.json() as { emailMessage?: string; error?: string };
      if (!response.ok) {
        trackFunnel("api_failed", { stage: "expanded_feedback", status: response.status });
        throw new Error(data.error || "Could not send your feedback");
      }
      setEmailMessage(data.emailMessage || "Your expanded feedback is on its way.");
      setLeadSubmitted(true);
      trackFunnel("signup_started", { stage: "expanded_feedback", method: "lead_email" });
    } catch (error) {
      toast({ title: "Could not send feedback", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setEmailSending(false);
    }
  }, [candidate, feedback, toast]);

  const submitAnswer = useCallback(async (spokenAnswer: string) => {
    if (turnRef.current || endingRef.current || (closingRef.current && !finalWindowRef.current)) return;
    turnRef.current = true;
    clearTimers();
    speech.stop();
    setIsListening(false);
    const answer = spokenAnswer.trim();
    const nextAnswers = [...answersRef.current, { question: questionRef.current, answer }];
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setCurrentAnswer("");
    answerRef.current = "";

    // During the final ten-second window, capture this last answer immediately
    // instead of spending the remaining time generating another question.
    if (finalWindowRef.current) {
      setIsThinking(false);
      turnRef.current = false;
      void finishWithFeedback(nextAnswers);
      return;
    }

    setIsThinking(true);
    const fallbackTimer = new Promise<string>((resolve) => {
       deadlineRef.current = setTimeout(() => resolve(""), 1000);
    });
    const askedQuestions = nextAnswers.map((item) => item.question);
    const signal = SIGNALS[signalIndexRef.current % SIGNALS.length]!;
    const answerDetail = answer.length > 220 ? `${answer.slice(0, 220)}…` : answer;
    let response = "";
    try {
      response = await Promise.race([
        stream(
          `Respond as a fast, energetic but natural human interviewer after this answer: "${answerDetail}".
Candidate profile: target role "${roleContext(candidate)}"; experience "${candidate.experienceLevel || "not specified"}"; location "${candidate.location || "not specified"}".
This is a 90-second spoken communication check. Explore the signal "${signal}" next, but connect the question to one concrete detail from the answer. Choose a fresh direction, not a generic career question.
Questions already asked: ${askedQuestions.join(" | ")}
Never repeat or paraphrase an earlier question. Return one or two short spoken sentences: a specific reaction grounded in the answer, then one fresh question. Do not guess what an unclear phrase means. Do not use “Okay”, “Got it”, “Right”, or “Thanks for sharing” as the whole reaction. Maximum 32 words.`,
          "You are a warm, lively Indian interviewer. Sound alert, encouraging and genuinely interested, not like a form. Speak at a brisk conversational pace with clear energy, short sentences and varied reactions. Show empathy when the answer is difficult, celebrate a specific small win, and make brief answers easier. Never sound fake, breathless or scripted. No markdown or preamble.",
          undefined,
            { maxTokens: 40, timeoutMs: 2600 },
        ),
        fallbackTimer,
      ]);
    } catch {
      response = "";
    }
    if (!response.trim()) {
      resetStream();
      response = nextUnusedQuestion(askedQuestions, sessionSeedRef.current, candidate, signal);
    }
    if (endingRef.current) {
      turnRef.current = false;
      return;
    }
    const cleanedResponse = cleanSpeech(response).replace(/^(?:Question|Next):\s*/i, "").trim();
    const generatedQuestion = extractQuestion(cleanedResponse);
    const question = generatedQuestion && !questionIsRepeated(generatedQuestion, askedQuestions)
      ? generatedQuestion
      : nextUnusedQuestion(askedQuestions, sessionSeedRef.current, candidate, signal);
    const spokenResponse = generatedQuestion && !questionIsRepeated(generatedQuestion, askedQuestions)
      ? cleanedResponse
      : question;
    questionRef.current = question;
    setCurrentQuestion(question);
    signalIndexRef.current += 1;
    setIsThinking(false);
    turnRef.current = false;
    if (endingRef.current) return;
    const acknowledgement = QUICK_ACKNOWLEDGEMENTS[seededIndex(sessionSeedRef.current, QUICK_ACKNOWLEDGEMENTS.length, nextAnswers.length)]!;
    // Keep the AI's concrete reaction when available; otherwise use a seeded
    // short fallback. One TTS call avoids a gap (or overlapping playback).
    speak(spokenResponse || `${acknowledgement}, ${question}`, startListening);
  }, [candidate, clearTimers, finishWithFeedback, resetStream, speak, speech, stream, startListening]);

  const submitAnswerRef = useRef<typeof submitAnswer>(submitAnswer);
  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);

  useEffect(() => {
    if (phase !== "interview") return;
    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timer);
          const final = answerRef.current.trim()
            ? [...answersRef.current, { question: questionRef.current, answer: answerRef.current.trim() }]
            : answersRef.current;
           void finishWithFeedback(final.length ? final : [{ question: questionRef.current, answer: "" }]);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [clearTimers, finishWithFeedback, phase]);

  useEffect(() => {
    if (phase !== "interview" || remaining > 10 || remaining <= 0 || closingRef.current) return;
    closingRef.current = true;
    finalWindowRef.current = true;
    // Do not stop the microphone here. The candidate gets the full final
    // question response window; submitAnswer will capture it and finish.
    if (!isListening && !isThinking && !synth.isSpeaking) {
      speak("You have ten seconds for your final answer. Go ahead.", startListening);
    }
  }, [clearTimers, phase, remaining, speak, speech, synth, isListening, isThinking, startListening]);

  useEffect(() => () => {
    endingRef.current = true;
    clearTimers();
    speech.stop();
    synth.stop();
    resetStream();
  }, [clearTimers, resetStream, speech.stop, synth.stop]);

  const startCheck = useCallback(async () => {
    unlockAudio();
    const microphoneReady = await speech.prepareMicrophone();
    if (!microphoneReady) {
      trackFunnel("api_failed", { stage: "microphone_permission" });
      toast({ title: "Microphone access is needed", description: "Allow microphone access, then tap Start again.", variant: "destructive" });
      return;
    }
    track("communication_check_started", { targetRole: candidate.targetRole || "unspecified" });
    trackFunnel("communication_check_started", { targetRole: candidate.targetRole || "unspecified", authenticated: Boolean(user) });
    endingRef.current = false;
    closingRef.current = false;
    finalWindowRef.current = false;
    turnRef.current = false;
    answersRef.current = [];
    setAnswers([]);
    setRemaining(TOTAL_SECONDS);
    setCurrentAnswer("");
    answerRef.current = "";
    sessionSeedRef.current = hashSeed([
      candidate.name,
      candidate.email,
      candidate.location,
      candidate.targetRole,
      candidate.experienceLevel,
      crypto.randomUUID(),
    ].join("|"));
    signalIndexRef.current = seededIndex(sessionSeedRef.current, SIGNALS.length);
    const opening = OPENING_QUESTIONS[Math.floor(Math.random() * OPENING_QUESTIONS.length)]!;
    questionRef.current = opening;
    setCurrentQuestion(opening);
    setPhase("interview");
    interviewStartedAtRef.current = Date.now();
    speak(opening, startListening);
  }, [candidate, speak, speech.prepareMicrophone, startListening, toast, user]);

  if (phase === "feedback" && feedback) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <PageMeta title="Communication Check" description="Get a free 90-second check of your communication, confidence, and interview readiness." ogUrl="https://leadonto.com/communication-check" canonicalUrl="https://leadonto.com/communication-check" />
        <Card className="overflow-hidden border-primary/20 shadow-xl">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-7 text-white">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-300">Your 90-second result</p>
            <h1 className="mt-2 text-3xl font-display font-extrabold">{feedback.headline}</h1>
            <p className="mt-2 max-w-xl text-slate-300">{feedback.summary}</p>
          </div>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-secondary">Your scorecard</h2>
                 <p className="text-xs text-muted-foreground">Each score is out of 100</p>
              </div>
               <div className="flex items-center gap-2">
                 <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${feedback.source === "ai" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                   {feedback.source === "ai" ? "Based on your answers" : "Indicative only"}
                 </span>
                 <Target className="h-5 w-5 text-primary" />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Overall", feedback.overallScore],
                ["Communication", feedback.communicationScore],
                ["Confidence", feedback.confidenceScore],
                ["Clarity", feedback.clarityScore],
              ].map(([label, score]) => (
                <div key={label} className={`rounded-2xl border p-4 ${scoreTone(Number(score)).card}`}>
                  <div className="flex items-end justify-between gap-1">
                    <p className={`text-2xl font-extrabold ${scoreTone(Number(score)).text}`}>{score}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">/ 100</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
                    <div className={`h-full rounded-full ${scoreTone(Number(score)).bar}`} style={{ width: `${Number(score)}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div>
              <h2 className="mb-3 font-bold text-secondary">What came through</h2>
              <ul className="space-y-2">
                {feedback.strengths.map((strength) => <li key={strength} className="flex gap-2 text-sm text-secondary"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />{strength}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Your one next step</p>
              <p className="mt-1 text-sm font-semibold text-secondary">{feedback.oneNextStep}</p>
            </div>
             <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
               <p className="text-xs font-bold uppercase tracking-wide text-primary">Quick actions for you</p>
               <ul className="mt-3 space-y-2">
                 {feedback.strengths.map((strength) => <li key={strength} className="flex gap-2 text-sm text-secondary"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />Keep building on: {strength}</li>)}
                 <li className="flex gap-2 text-sm font-semibold text-secondary"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Next: {feedback.oneNextStep}</li>
               </ul>
             </div>
             {feedback.evidence?.length ? (
               <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                 <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Evidence from your response</p>
                 <ul className="mt-2 space-y-2">
                   {feedback.evidence.map((item) => <li key={item} className="text-sm text-secondary">• {item}</li>)}
                 </ul>
               </div>
             ) : null}
             {leadSubmitted ? (
               <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                 <p className="font-bold">Expanded feedback requested.</p>
                 <p className="mt-1">{emailMessage}</p>
               </div>
             ) : (
               <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
                 <p className="font-bold text-secondary">Want the personalised action plan?</p>
                 <p className="mt-1 text-sm text-muted-foreground">Add your details and we’ll email expanded feedback with specific steps for your goals.</p>
                 <div className="mt-4 grid gap-3 sm:grid-cols-2">
                   <Input value={candidate.name} onChange={(e) => setCandidate({ ...candidate, name: e.target.value })} placeholder="Your name *" autoComplete="name" />
                   <Input type="email" value={candidate.email} onChange={(e) => setCandidate({ ...candidate, email: e.target.value })} placeholder="Your email *" autoComplete="email" />
                   <Input value={candidate.phone} onChange={(e) => setCandidate({ ...candidate, phone: e.target.value })} placeholder="Phone (optional)" autoComplete="tel" />
                   <Input value={candidate.location} onChange={(e) => setCandidate({ ...candidate, location: e.target.value })} placeholder="City / location (optional)" />
                   <Input value={candidate.targetRole} onChange={(e) => setCandidate({ ...candidate, targetRole: e.target.value })} placeholder="Target role (optional)" />
                   <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={candidate.experienceLevel} onChange={(e) => setCandidate({ ...candidate, experienceLevel: e.target.value })}>
                     <option>Fresher</option><option>1-2 years</option><option>3-5 years</option><option>5+ years</option>
                   </select>
                 </div>
                 <Button className="mt-4 font-bold" onClick={() => void sendExpandedFeedback()} disabled={emailSending}>
                   {emailSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : <>Email my expanded feedback <ArrowRight className="ml-2 h-4 w-4" /></>}
                 </Button>
               </div>
             )}
            <div className="flex flex-wrap gap-3">
              <Link href="/interview-ace"><Button className="font-bold">Practise a full interview <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
               {!user && (
                 <Link href="/login?returnTo=%2Finterview-ace" onClick={() => trackFunnel("signup_started", { stage: "communication_check_result", method: "account_cta" })}>
                   <Button variant="outline" className="font-bold">Save my result + get 20 free credits <ArrowRight className="ml-2 h-4 w-4" /></Button>
                 </Link>
               )}
              <Link href="/"><Button variant="outline">Back to Lead Onto</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`container mx-auto max-w-4xl px-4 ${phase === "interview" ? "h-[calc(100dvh-4.5rem)] overflow-hidden py-2 sm:h-auto sm:overflow-visible sm:py-12" : "py-8 sm:py-12"}`}>
      <PageMeta title="Communication Check" description="Get a free 90-second check of your communication, confidence, and interview readiness." ogUrl="https://leadonto.com/communication-check" canonicalUrl="https://leadonto.com/communication-check" />
      {phase === "details" ? (
        <Card className="overflow-hidden border-primary/20 shadow-xl">
          <div className="bg-gradient-to-br from-orange-50 via-background to-violet-50 p-5 sm:p-7">
             <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700"><Sparkles className="h-3.5 w-3.5" /> Free 90-Second Communication Check</div>
             <h1 className="max-w-2xl text-2xl font-display font-extrabold tracking-tight text-secondary sm:text-4xl">How Strong Are Your Communication &amp; Confidence Skills?</h1>
             <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Get quick feedback on your communication, confidence &amp; interview skills.</p>
             <div className="mt-4 md:hidden"><Button size="lg" onClick={() => void startCheck()} className="h-11 w-full bg-orange-500 text-sm font-extrabold text-white hover:bg-orange-600"><Mic className="mr-2 h-4 w-4" />Try My Free 90-Second Check</Button></div>
          </div>
          <CardContent className="space-y-5 p-6 sm:p-9">
             <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
               <p className="font-bold text-secondary">No sign-up before you start</p>
               <p className="mt-1 text-sm text-muted-foreground">Take the free 90-second speaking check first. You’ll see a short action-focused result before we ask whether you want the expanded feedback by email.</p>
             </div>
             <div className="space-y-3">
               <div>
                 <p className="text-sm font-bold text-secondary">Make it relevant to you <span className="font-normal text-muted-foreground">(optional)</span></p>
                 <p className="mt-1 text-xs text-muted-foreground">Your coach will use these details to make the conversation feel closer to your real goals.</p>
               </div>
               <div className="grid gap-3 sm:grid-cols-3">
                 <Input
                   value={candidate.targetRole}
                   onChange={(e) => setCandidate({ ...candidate, targetRole: e.target.value })}
                   placeholder="Target role"
                   autoComplete="organization-title"
                 />
                 <Input
                   value={candidate.location}
                   onChange={(e) => setCandidate({ ...candidate, location: e.target.value })}
                   placeholder="City / location"
                   autoComplete="address-level2"
                 />
                 <select
                   className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                   value={candidate.experienceLevel}
                   onChange={(e) => setCandidate({ ...candidate, experienceLevel: e.target.value })}
                 >
                   <option>Fresher</option>
                   <option>1-2 years</option>
                   <option>3-5 years</option>
                   <option>5+ years</option>
                 </select>
               </div>
             </div>
             <div className="hidden flex-wrap items-center gap-3 pt-2 md:flex">
              <Button size="lg" onClick={() => void startCheck()} className="h-12 px-7 text-base font-extrabold shadow-lg shadow-primary/25"><Mic className="mr-2 h-5 w-5" />Start my free check</Button>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" /> Takes 90 seconds</span>
            </div>
            <p className="text-xs text-muted-foreground">Your answers and result are used to improve your career practice experience and are visible to authorised Lead Onto admins.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex h-full flex-col overflow-hidden border-primary/20 shadow-xl sm:h-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3 sm:gap-3 sm:px-7 sm:py-4">
             <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Live communication check</p><p className="mt-1 text-sm text-muted-foreground">Speak naturally. Your communication coach responds quickly.</p></div>
            <div className="flex items-center gap-2">
              <div className={`rounded-full px-3 py-1.5 font-mono text-base font-bold sm:px-4 sm:py-2 sm:text-lg ${remaining <= 10 ? "bg-red-100 text-red-700" : "bg-background text-secondary"}`}><Clock3 className="mr-1.5 inline h-4 w-4" />{formatTime(remaining)}</div>
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${
                speech.status === "listening" ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
                speech.status === "processing" ? "border-blue-300 bg-blue-50 text-blue-700" :
                speech.status === "warming" ? "border-amber-300 bg-amber-50 text-amber-700" :
                "border-slate-200 bg-slate-50 text-slate-600"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${speech.status === "listening" ? "animate-pulse bg-emerald-500" : speech.status === "processing" ? "animate-pulse bg-blue-500" : speech.status === "warming" ? "animate-pulse bg-amber-500" : "bg-slate-400"}`} />
                {speech.status === "warming" ? "Preparing" : speech.status === "processing" ? "Transcribing" : speech.status === "listening" ? "Speak" : "Ready"}
              </div>
            </div>
          </div>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden p-3 sm:space-y-6 sm:p-9">
             <div className="flex min-h-0 shrink-0 items-start gap-3 rounded-2xl bg-gradient-to-r from-orange-50 to-violet-50 p-3 sm:gap-4 sm:p-5">
               <AnimatedAvatar
                 name={INTERVIEWER.name}
                  subtitle="Communication coach"
                 isSpeaking={synth.isSpeaking}
                 isThinking={isThinking}
                 gender={INTERVIEWER.gender}
                 size="sm"
                 imageSrc={INTERVIEWER.imageSrc}
               />
                <div className="min-w-0 flex-1 pt-1"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Communication coach</p><p className="mt-1 text-base font-semibold leading-snug text-secondary sm:text-lg sm:leading-relaxed">{currentQuestion}</p></div>
            </div>
               <div className="min-h-24 max-h-32 min-w-0 flex-none overflow-y-auto rounded-xl border bg-background p-3 text-sm text-secondary sm:min-h-20 sm:max-h-none sm:flex-1 sm:p-4">
                 {currentAnswer || speech.interimTranscript || <span className="text-muted-foreground">{isThinking ? "Your interviewer is preparing the next question…" : speech.status === "warming" ? "Preparing microphone…" : speech.status === "processing" ? "Your answer is being transcribed…" : speech.status === "listening" ? "Speak naturally…" : isListening ? "Preparing to listen…" : "Get ready to speak…"}</span>}
                 {!currentAnswer && speech.interimTranscript && <span className="ml-1 inline-block w-0.5 h-4 align-middle bg-primary animate-pulse" />}
            </div>
              <div className="shrink-0 space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:space-y-0">
                <Button variant={isListening ? "outline" : "default"} size="lg" disabled={!speech.isSupported || isThinking || isSubmitting} onClick={() => {
                if (isListening) { speech.stop(); setIsListening(false); } else startListening();
              }}>
                 {isListening ? <><MicOff className="mr-2 h-5 w-5" />Stop</> : <><Mic className="mr-2 h-5 w-5" />{isThinking ? "Coach is replying…" : "Tap to speak"}</>}
              </Button>
              <span className="text-xs text-muted-foreground">{answers.length} answer{answers.length === 1 ? "" : "s"} captured · no credits used</span>
            </div>
            {!speech.isSupported && <p className="text-sm text-red-600">Voice recognition is not available in this browser. Try Chrome or Edge.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}