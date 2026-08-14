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
import { unlockAudio, useEdgeTTS } from "@/lib/use-edge-tts";
import { track } from "@/lib/analytics";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TOTAL_SECONDS = 90;
const FIRST_QUESTION = "Tell me a little about yourself and what you are working toward.";
const QUESTION_BANK = [
  "What is something you learned recently, and how did you learn it?",
  "Tell me about a time you handled a difficult situation. What did you do?",
  "What is one strength you bring to a team? Can you give a quick example?",
  "How would you explain your current work or studies to someone new?",
  "What kind of role or opportunity are you hoping to find next?",
  "Imagine you are meeting a customer or colleague for the first time. How would you introduce yourself?",
  "What is one communication skill you would like to improve?",
  "What motivates you when a task becomes challenging?",
  "What does good teamwork look like to you in everyday work or study?",
  "Tell me about a small decision you made recently and why you made it.",
  "How do you usually prepare when you need to speak in front of others?",
  "What kind of feedback helps you improve the most?",
  "What is one goal you would like to make progress on this year?",
  "How do you make a new person feel comfortable in a conversation?",
  "What helps you stay calm when something does not go as planned?",
  "If you had one extra hour today, how would you use it?",
];
const INTERVIEWER = {
  name: "Priya Ma'am",
  imageSrc: "/images/tutor-priya.jpg",
  gender: "female" as const,
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
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  clarityScore: number;
  headline: string;
  strengths: string[];
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

function nextUnusedQuestion(askedQuestions: string[]): string {
  return QUESTION_BANK.find((question) => !questionIsRepeated(question, askedQuestions))
    ?? "Before we finish, what would you like an interviewer to understand about you?";
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
  const speech = useSpeechRecognition("English");
  const synth = useEdgeTTS();
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
  const endingRef = useRef(false);
  const closingRef = useRef(false);
  const turnRef = useRef(false);
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const interviewStartedAtRef = useRef<number | null>(null);

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
    autoSubmitRef.current = null;
    deadlineRef.current = null;
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    speech.pause();
    void synth.speak(cleanSpeech(text), "English", () => {
      speech.suppressUntil(Date.now() + 450);
      speech.blockFor(450);
      onEnd?.();
    }, { voiceGender: "female", rate: 1.05 });
  }, [speech.pause, speech.suppressUntil, speech.blockFor, synth.speak]);

  const startListening = useCallback(() => {
    if (!speech.isSupported || endingRef.current || closingRef.current) return;
    setIsListening(true);
    speech.blockFor(0);
    speech.startContinuous((text) => {
      const chunk = text.trim();
      if (!chunk || endingRef.current) return;
      const next = `${answerRef.current ? `${answerRef.current} ` : ""}${chunk}`.trim();
      answerRef.current = next;
      setCurrentAnswer(next);
      if (autoSubmitRef.current) clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = setTimeout(() => {
        const latest = answerRef.current.trim();
        if (latest) void submitAnswerRef.current(latest);
      }, 1600);
    });
  }, [speech]);

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
      if (!response.ok || !data.feedback) throw new Error(data.error || "Could not save feedback");
      setFeedback(data.feedback);
      setEmailMessage("");
      setLeadSubmitted(false);
    } catch {
      setFeedback(fallback);
      setEmailMessage("Your result is ready here, but the email could not be delivered. Please check your email address and try again.");
      toast({ title: "Feedback ready", description: "Your indicative score is shown; we could not sync the full result." });
    } finally {
      setIsSubmitting(false);
      setIsThinking(false);
      setPhase("feedback");
    }
  }, [candidate, clearTimers, speech, synth, toast]);

  const sendExpandedFeedback = useCallback(async () => {
    if (!feedback) return;
    if (!candidate.name.trim() || !candidate.email.trim()) {
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
      if (!response.ok) throw new Error(data.error || "Could not send your feedback");
      setEmailMessage(data.emailMessage || "Your expanded feedback is on its way.");
      setLeadSubmitted(true);
    } catch (error) {
      toast({ title: "Could not send feedback", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setEmailSending(false);
    }
  }, [candidate, feedback, toast]);

  const submitAnswer = useCallback(async (spokenAnswer: string) => {
    if (turnRef.current || endingRef.current || closingRef.current) return;
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

    // The acknowledgement is spoken immediately. Keep it short and natural so
    // the interviewer sounds conversational before the next question arrives.
    // Only "Okay." or "Got it." — never combined, alternated so it doesn't
    // feel scripted.
    const acknowledgements = ["Okay.", "Got it."];
    const acknowledgementFinished = new Promise<void>((resolve) => {
      speak(acknowledgements[(nextAnswers.length - 1) % acknowledgements.length] ?? "Okay.", resolve);
    });
    setIsThinking(true);
    const fallbackTimer = new Promise<string>((resolve) => {
      deadlineRef.current = setTimeout(() => resolve(""), 1800);
    });
    const askedQuestions = nextAnswers.map((item) => item.question);
    let response = "";
    try {
      response = await Promise.race([
        stream(
          `Ask one fresh, natural follow-up question after this answer: "${answer}".
This is a 90-second spoken communication check, so explore a different everyday topic each turn: learning, a challenge, teamwork, explaining an idea, career goals, customer interaction, motivation, or self-reflection.
Questions already asked: ${askedQuestions.join(" | ")}
Never repeat or paraphrase an earlier question. Return only one question, maximum 18 words.`,
          "You are a warm, curious Indian interviewer. Sound human and conversational, not like a form. Ask one concise spoken-English question with no markdown or preamble.",
          undefined,
          { maxTokens: 70 },
        ),
        fallbackTimer,
      ]);
    } catch {
      response = "";
    }
    if (!response.trim()) {
      resetStream();
      response = nextUnusedQuestion(askedQuestions);
    }
    if (endingRef.current) {
      turnRef.current = false;
      return;
    }
    const generatedQuestion = cleanSpeech(response).replace(/^(?:Question|Next):\s*/i, "").trim();
    const question = generatedQuestion && !questionIsRepeated(generatedQuestion, askedQuestions)
      ? generatedQuestion
      : nextUnusedQuestion(askedQuestions);
    questionRef.current = question;
    setCurrentQuestion(question);
    setIsThinking(false);
    turnRef.current = false;
    // Keep the human acknowledgement intact before starting the next TTS
    // utterance. The timeout is only a safety valve for a blocked audio device.
    await Promise.race([
      acknowledgementFinished,
      new Promise<void>((resolve) => setTimeout(resolve, 1400)),
    ]);
    if (endingRef.current) return;
    speak(question, startListening);
  }, [clearTimers, finishWithFeedback, resetStream, speak, speech, stream, startListening]);

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
          void finishWithFeedback(final.length ? final : [{ question: FIRST_QUESTION, answer: "" }]);
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
    clearTimers();
    speech.stop();
    setIsListening(false);
    setIsThinking(false);
    synth.stop();
    speak("We have about ten seconds left. I’m wrapping up now, and your result will be ready in a moment.");
  }, [clearTimers, phase, remaining, speak, speech, synth]);

  useEffect(() => () => {
    endingRef.current = true;
    clearTimers();
    speech.stop();
    synth.stop();
    resetStream();
  }, [clearTimers, resetStream, speech.stop, synth.stop]);

  const startCheck = useCallback(async () => {
    unlockAudio();
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.getTracks().forEach((track) => track.stop());
      } catch {
        toast({ title: "Microphone access is needed", description: "Allow microphone access, then tap Start again.", variant: "destructive" });
        return;
      }
    }
    track("communication_check_started", { targetRole: candidate.targetRole || "unspecified" });
    endingRef.current = false;
    closingRef.current = false;
    turnRef.current = false;
    answersRef.current = [];
    setAnswers([]);
    setRemaining(TOTAL_SECONDS);
    setCurrentAnswer("");
    answerRef.current = "";
    questionRef.current = FIRST_QUESTION;
    setCurrentQuestion(FIRST_QUESTION);
    setPhase("interview");
    interviewStartedAtRef.current = Date.now();
    speak(FIRST_QUESTION, startListening);
  }, [candidate, speak, startListening, toast]);

  if (phase === "feedback" && feedback) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <PageMeta title="Your 90-second communication result · Lead Onto" description="A concise communication and confidence check from Lead Onto." />
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
              <Target className="h-5 w-5 text-primary" />
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
              <Link href="/"><Button variant="outline">Back to Lead Onto</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <PageMeta title="Communication & Confidence Check · Lead Onto" description="Check your communication, confidence and interview skills in 90 seconds for free." />
      {phase === "details" ? (
        <Card className="overflow-hidden border-primary/20 shadow-xl">
          <div className="bg-gradient-to-br from-orange-50 via-background to-violet-50 p-5 sm:p-7">
             <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700"><Sparkles className="h-3.5 w-3.5" /> Free 90-Second Communication Check</div>
             <h1 className="max-w-2xl text-2xl font-display font-extrabold tracking-tight text-secondary sm:text-4xl">How Strong Are Your Communication &amp; Confidence Skills?</h1>
             <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Get quick feedback on your communication, confidence &amp; interview skills.</p>
          </div>
          <CardContent className="space-y-5 p-6 sm:p-9">
             <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
               <p className="font-bold text-secondary">No sign-up before you start</p>
               <p className="mt-1 text-sm text-muted-foreground">Take the free 90-second speaking check first. You’ll see a short action-focused result before we ask whether you want the expanded feedback by email.</p>
             </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="lg" onClick={() => void startCheck()} className="h-12 px-7 text-base font-extrabold shadow-lg shadow-primary/25"><Mic className="mr-2 h-5 w-5" />Start my free check</Button>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" /> Takes 90 seconds</span>
            </div>
            <p className="text-xs text-muted-foreground">Your answers and result are used to improve your career practice experience and are visible to authorised Lead Onto admins.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-primary/20 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4 sm:px-7">
             <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Live communication check</p><p className="mt-1 text-sm text-muted-foreground">Speak naturally. Your interviewer responds quickly.</p></div>
            <div className={`rounded-full px-4 py-2 font-mono text-lg font-bold ${remaining <= 10 ? "bg-red-100 text-red-700" : "bg-background text-secondary"}`}><Clock3 className="mr-1.5 inline h-4 w-4" />{formatTime(remaining)}</div>
          </div>
          <CardContent className="space-y-6 p-6 sm:p-9">
            <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-r from-orange-50 to-violet-50 p-5">
               <AnimatedAvatar
                 name={INTERVIEWER.name}
                 subtitle="AI interviewer"
                 isSpeaking={synth.isSpeaking}
                 isThinking={isThinking}
                 gender={INTERVIEWER.gender}
                 size="sm"
                 imageSrc={INTERVIEWER.imageSrc}
               />
               <div className="min-w-0 flex-1 pt-1"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">AI interviewer</p><p className="mt-1 text-lg font-semibold leading-relaxed text-secondary">{currentQuestion}</p></div>
            </div>
            <div className="min-h-20 rounded-xl border bg-background p-4 text-sm text-secondary">
              {currentAnswer || <span className="text-muted-foreground">{isThinking ? "Preparing the next question…" : isListening ? "Listening — take your time…" : "Get ready to speak…"}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant={isListening ? "destructive" : "default"} size="lg" disabled={!speech.isSupported || isThinking || isSubmitting} onClick={() => {
                if (isListening) { speech.stop(); setIsListening(false); } else startListening();
              }}>
                {isListening ? <><MicOff className="mr-2 h-5 w-5" />Stop speaking</> : <><Mic className="mr-2 h-5 w-5" />{isThinking ? "Interviewer is replying…" : "Tap to speak"}</>}
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