import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Volume2,
  RotateCw,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Target,
  Award,
} from "lucide-react";
import { GuruHomeButton } from "@/components/navigation/guru-home-button";
import { GURU_FONT, GURU_COLORS } from "@/components/english/guru-theme";

export interface InterviewFeedbackScreenProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  userAnswer: string;
  scores: {
    relevance: number;
    accuracy: number;
    clarity: number;
    confidence: number;
  };
  mistakes?: string[];
  improvedAnswer?: string;
  hindiExplanation?: string;
  practicalTip?: string;
  onSpeakAgain: () => void;
  onNextQuestion: () => void;
  onListenSample: (text: string) => void;
}

export function InterviewFeedbackScreen({
  questionNumber,
  totalQuestions,
  questionText,
  userAnswer,
  scores,
  mistakes = [],
  improvedAnswer,
  hindiExplanation,
  practicalTip,
  onSpeakAgain,
  onNextQuestion,
  onListenSample,
}: InterviewFeedbackScreenProps) {
  // Score color helper
  const getScoreColor = (val: number) => {
    if (val >= 8) return "bg-emerald-500 text-emerald-950";
    if (val >= 6) return "bg-blue-500 text-blue-950";
    if (val >= 4) return "bg-amber-500 text-amber-950";
    return "bg-red-500 text-red-950";
  };

  const getScoreBg = (val: number) => {
    if (val >= 8) return "bg-emerald-50 border-emerald-200";
    if (val >= 6) return "bg-blue-50 border-blue-200";
    if (val >= 4) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div
      className="min-h-screen w-full bg-[#F7F5F2] flex flex-col pb-24 lg:pb-8"
      style={{ fontFamily: GURU_FONT }}
    >
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 sm:px-6 py-2.5 shadow-xs backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GuruHomeButton variant="pill" isDirty={false} />
            <div>
              <span className="text-xs sm:text-sm font-extrabold text-[#12163A]">
                जवाब का विश्लेषण · Answer Feedback
              </span>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            सवाल {questionNumber} / {totalQuestions}
          </span>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Question Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            इंटरव्यू प्रश्न · Question {questionNumber}
          </span>
          <p className="text-sm sm:text-base font-bold text-[#12163A] mt-0.5">
            "{questionText}"
          </p>
        </div>

        {/* SECTION 1: YOU SAID */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>आपने कहा · YOU SAID</span>
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
            "{userAnswer}"
          </div>
        </div>

        {/* SECTION 2: 4 PERFORMANCE SCORES */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">
            4 परफ़ॉर्मेंस स्कोर · Performance Scores
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { labelHi: "सटीकता", labelEn: "Relevance", score: scores.relevance },
              { labelHi: "शुद्धता", labelEn: "Accuracy", score: scores.accuracy },
              { labelHi: "स्पष्टता", labelEn: "Clarity", score: scores.clarity },
              { labelHi: "आत्मविश्वास", labelEn: "Confidence", score: scores.confidence },
            ].map((metric) => (
              <div
                key={metric.labelEn}
                className={`p-3 rounded-2xl border ${getScoreBg(metric.score)} text-center`}
              >
                <div className="text-lg sm:text-xl font-black text-slate-900">
                  {metric.score}
                  <span className="text-xs font-normal text-slate-500">/10</span>
                </div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{metric.labelHi}</div>
                <div className="text-[10px] text-slate-500">{metric.labelEn}</div>
                {/* Progress Mini Bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getScoreColor(metric.score).split(" ")[0]}`}
                    style={{ width: `${Math.min(100, metric.score * 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: ONE MISTAKE TO FIX (DIFF + HINDI EXPLANATION) */}
        {(mistakes.length > 0 || hindiExplanation) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 uppercase tracking-wider mb-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>एक गलती सुधारें · Fix This Mistake</span>
            </div>

            {mistakes.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {mistakes.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/90 border border-amber-200 text-xs sm:text-sm font-semibold text-amber-950 flex items-start gap-2"
                  >
                    <span className="text-red-500">❌</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            )}

            {hindiExplanation && (
              <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-200 text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                <span className="font-bold">💡 समझें: </span>
                <span>{hindiExplanation}</span>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: SAMPLE ANSWER (WITH AUDIO) */}
        {improvedAnswer && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>बेहतर नमूना उत्तर · Sample Answer</span>
              </span>
              <button
                type="button"
                onClick={() => onListenSample(improvedAnswer)}
                className="min-h-[36px] px-3 rounded-full bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-emerald-100 active:scale-95 transition-all"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>सुनें · Listen</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-emerald-950 font-semibold leading-relaxed p-3 rounded-xl bg-white/90 border border-emerald-200">
              "{improvedAnswer}"
            </p>
          </div>
        )}

        {/* SECTION 5: PRACTICAL TIP */}
        {practicalTip && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs flex items-start gap-2.5">
            <Target className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm text-blue-950">
              <strong className="font-bold">व्यावहारिक टिप · Practical Tip: </strong>
              <span>{practicalTip}</span>
            </div>
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM ACTIONS BAR ── */}
      <footer className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSpeakAgain}
            className="min-h-[48px] px-4 sm:px-6 rounded-2xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <RotateCw className="h-4 w-4" />
            <span>फिर से बोलें · Try Again</span>
          </button>

          <button
            type="button"
            onClick={onNextQuestion}
            className="min-h-[48px] px-6 sm:px-8 rounded-2xl text-xs sm:text-sm font-extrabold text-white shadow-md transition-all active:scale-98 flex items-center gap-2"
            style={{ backgroundColor: GURU_COLORS.accent }}
          >
            <span>अगला सवाल · Next Question</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default InterviewFeedbackScreen;
