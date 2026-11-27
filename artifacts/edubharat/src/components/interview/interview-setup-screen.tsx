import React, { useState } from "react";
import { Link } from "wouter";
import {
  Briefcase,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Check,
  Globe,
  Coins,
  ArrowRight,
  Target,
  Zap,
} from "lucide-react";
import { GuruHomeButton } from "@/components/navigation/guru-home-button";
import { GURU_FONT, GURU_COLORS } from "@/components/english/guru-theme";
import { LANGUAGE_NATIVE_NAMES } from "@/components/shared/language-sheet";

export interface InterviewSetupScreenProps {
  user: any;
  profile: any;
  selectedType: string;
  onSelectType: (type: string) => void;
  selectedExperience: string;
  onSelectExperience: (exp: string) => void;
  selectedDuration: number;
  onSelectDuration: (dur: number) => void;
  selectedCoach: any;
  onSelectCoach: (coach: any) => void;
  onBegin: () => void;
  onOpenLanguageSheet: () => void;
  helperLanguage: string;
  guestLeft: number;
  balance: number | null;
  interviewTypes: { value: string; label: string; icon: string }[];
  experienceLevels: string[];
  durations: { value: number; label: string }[];
  coaches: any[];
}

export function InterviewSetupScreen({
  user,
  profile,
  selectedType,
  onSelectType,
  selectedExperience,
  onSelectExperience,
  selectedDuration,
  onSelectDuration,
  selectedCoach,
  onSelectCoach,
  onBegin,
  onOpenLanguageSheet,
  helperLanguage,
  guestLeft,
  balance,
  interviewTypes,
  experienceLevels,
  durations,
  coaches,
}: InterviewSetupScreenProps) {
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [showCoachPicker, setShowCoachPicker] = useState(false);

  // Top 8 roles vs extended
  const initialRoles = interviewTypes.slice(0, 8);
  const extendedRoles = interviewTypes.slice(8);
  const displayedRoles = showAllRoles ? interviewTypes : initialRoles;

  const currentRoleMeta = interviewTypes.find((t) => t.value === selectedType) || interviewTypes[0]!;

  return (
    <div
      className="min-h-screen w-full bg-[#F7F5F2] flex flex-col pb-24 lg:pb-8"
      style={{ fontFamily: GURU_FONT }}
    >
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 sm:px-6 py-2.5 shadow-xs backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GuruHomeButton variant="pill" isDirty={false} />
            <span className="text-xs sm:text-sm font-extrabold text-[#12163A]">
              Interview Ace · सेटअप
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLanguageSheet}
              className="min-h-[36px] px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
              aria-label="भाषा चुनें · Language Preferences"
            >
              <Globe className="h-3.5 w-3.5 text-orange-600" />
              <span>{LANGUAGE_NATIVE_NAMES[helperLanguage] || helperLanguage}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT (2 cols on Desktop, 1 on Mobile) ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left Column: 3 Steps */}
        <div className="space-y-6">
          {/* Pre-Interview Briefing Note */}
          <div className="rounded-3xl border border-blue-200/90 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-4 sm:p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-extrabold text-blue-950 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                i
              </span>
              <span>इंटरव्यू से पहले जानिए · What to Expect</span>
            </h2>
            <p className="text-xs text-blue-900/80 mt-1 leading-relaxed">
              यह AI मॉक इंटरव्यू बिल्कुल असली कंपनी इंटरव्यू जैसा है। इंटरव्यूअर एक बार में एक सवाल पूछेंगे, और हर उत्तर के बाद आपको 4-पॉइंट स्कोर व सरल हिंदी में सुधार मिलेगा।
            </p>
          </div>

          {/* STEP 1: Select Job Role */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-extrabold text-xs">
                  1
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#12163A]">
                  नौकरी चुनें · Select Job Role
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {selectedType ? currentRoleMeta.label.split("·")[0]?.trim() : "कोई एक चुनें"}
              </span>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedRoles.map((role) => {
                const isSelected = selectedType === role.value;
                const [enTitle, hiTitle] = role.label.split("·").map((s) => s.trim());
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => onSelectType(role.value)}
                    className={`min-h-[52px] p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-98 ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/70 shadow-xs ring-1 ring-orange-500"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{role.icon}</span>
                        <span
                          className={`text-xs sm:text-sm font-bold truncate ${
                            isSelected ? "text-orange-950" : "text-slate-800"
                          }`}
                        >
                          {enTitle}
                        </span>
                      </div>
                      {hiTitle && (
                        <div className="text-[11px] text-slate-500 font-medium pl-6 truncate">
                          {hiTitle}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Expand / Collapse Button */}
            {interviewTypes.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllRoles((prev) => !prev)}
                className="mt-3.5 inline-flex min-h-[40px] items-center gap-1 text-xs font-bold text-orange-700 hover:text-orange-800 hover:underline"
              >
                <span>
                  {showAllRoles
                    ? "कम नौकरियाँ दिखाएं · Show Fewer"
                    : `सभी ${interviewTypes.length} नौकरियाँ देखें · View All Roles`}
                </span>
                {showAllRoles ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </section>

          {/* STEP 2: Experience & Duration */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-extrabold text-xs">
                2
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#12163A]">
                अनुभव और समय · Experience &amp; Duration
              </h3>
            </div>

            {/* Experience Selection */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                अनुभव स्तर · Experience Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {experienceLevels.map((exp) => {
                  const isSelected = selectedExperience === exp;
                  const hiLabel =
                    exp === "Fresher"
                      ? "फ्रेशर"
                      : exp === "1-2 years"
                      ? "1-2 साल"
                      : exp === "3-5 years"
                      ? "3-5 साल"
                      : "5+ साल";
                  return (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => onSelectExperience(exp)}
                      className={`min-h-[46px] p-2.5 rounded-2xl border text-center transition-all active:scale-95 ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/70 font-bold text-orange-950 shadow-xs ring-1 ring-orange-500"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-bold leading-tight">{hiLabel}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{exp}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                इंटरव्यू समय · Duration (5 ब्लॉक्स में विभाजित)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {durations.map((dur) => {
                  const isSelected = selectedDuration === dur.value;
                  const hiLabel = `${dur.value} मिनट`;
                  const isFreeTrial = dur.value === 10;
                  return (
                    <button
                      key={dur.value}
                      type="button"
                      onClick={() => onSelectDuration(dur.value)}
                      className={`relative min-h-[50px] p-2.5 rounded-2xl border text-center transition-all active:scale-95 ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/70 font-bold text-orange-950 shadow-xs ring-1 ring-orange-500"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isFreeTrial && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black whitespace-nowrap">
                          2 मुफ़्त
                        </span>
                      )}
                      <div className="text-xs sm:text-sm font-bold">{hiLabel}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{dur.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* STEP 3: Interviewer Selection */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-extrabold text-xs">
                  3
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#12163A]">
                  इंटरव्यूअर · Interviewer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCoachPicker(true)}
                className="text-xs font-bold text-orange-700 hover:underline"
              >
                बदलें · Change
              </button>
            </div>

            {/* Selected Coach Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-lg font-extrabold text-orange-900 shrink-0">
                  {selectedCoach?.name?.charAt(0) || "R"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-extrabold text-[#12163A] truncate">
                    {selectedCoach?.name || "Raj Sir"}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {selectedCoach?.role || "Senior HR & Culture Coach"}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {selectedCoach?.languages?.join(", ") || "Hindi, English"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCoachPicker(true)}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
              >
                बदलें
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Desktop Sticky Summary Card */}
        <aside className="hidden lg:flex flex-col space-y-4">
          <div className="sticky top-20 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-extrabold text-[#12163A] uppercase tracking-wider mb-4">
              इंटरव्यू सारांश · Summary
            </h3>

            <div className="space-y-3 pb-4 border-b border-slate-100 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">पद · Role:</span>
                <span className="font-bold text-slate-900 truncate max-w-[180px]">
                  {currentRoleMeta.label.split("·")[0]?.trim()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">अनुभव · Exp:</span>
                <span className="font-bold text-slate-900">{selectedExperience}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">अवधि · Time:</span>
                <span className="font-bold text-slate-900">{selectedDuration} मिनट</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">इंटरव्यूअर:</span>
                <span className="font-bold text-slate-900 truncate max-w-[180px]">
                  {selectedCoach?.name}
                </span>
              </div>
            </div>

            {/* Credit Info */}
            <div className="py-4 border-b border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-700">क्रेडिट स्थिति · Balance:</span>
                <span className="font-extrabold text-orange-600">
                  {!user
                    ? `${guestLeft} मुफ़्त इंटरव्यू बाकी`
                    : `${balance ?? 0} क्रेडिट उपलब्ध`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                1 क्रेडिट प्रति पूरा ब्लॉक (अधिकतम 5 क्रेडिट)।
              </p>
            </div>

            {/* Primary Begin CTA */}
            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={onBegin}
                className="min-h-[52px] w-full rounded-2xl text-base font-extrabold text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                style={{ backgroundColor: GURU_COLORS.accent }}
              >
                <span>इंटरव्यू शुरू करें · Begin</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <div className="text-center text-[11px] text-slate-400 pt-1">
                🔒 आपका डेटा और आवाज़ 100% सुरक्षित है
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* ── MOBILE STICKY BOTTOM BAR ── */}
      <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-[#12163A] truncate">
              {currentRoleMeta.label.split("·")[0]?.trim()}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {selectedExperience} · {selectedDuration}m · {!user ? `${guestLeft} मुफ़्त बाकी` : `${balance ?? 0} cr`}
            </div>
          </div>
          <button
            type="button"
            onClick={onBegin}
            className="min-h-[48px] px-6 rounded-2xl text-sm font-extrabold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
            style={{ backgroundColor: GURU_COLORS.accent }}
          >
            <span>शुरू करें · Begin</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Coach Picker Modal */}
      {showCoachPicker && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-[#12163A]">
                इंटरव्यूअर चुनें · Select Coach
              </h3>
              <button
                type="button"
                onClick={() => setShowCoachPicker(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="py-3 overflow-y-auto space-y-2 flex-1 min-h-0">
              {coaches.map((c) => {
                const isSelected = selectedCoach?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectCoach(c);
                      setShowCoachPicker(false);
                    }}
                    className={`min-h-[50px] w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/70 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center font-extrabold text-sm text-orange-900 shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{c.role}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-orange-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewSetupScreen;
