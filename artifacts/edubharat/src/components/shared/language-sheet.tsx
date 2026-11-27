import { useState, useEffect, useCallback } from "react";
import { Globe, Check, X, Sparkles, MessageSquare, HelpCircle } from "lucide-react";
import { INDIAN_LANGUAGES } from "@/lib/constants";
import { GURU_FONT, GURU_COLORS } from "@/components/english/guru-theme";

export interface LanguageSettings {
  helpLang: string; // e.g. "Hindi", "English", "Bengali", etc.
  questionLang: "english" | "bilingual" | "native"; // Interview Question Language
}

const STORAGE_KEY_HELP_LANG = "leadonto_help_lang";
const STORAGE_KEY_Q_LANG = "leadonto_q_lang";

export const LANGUAGE_NATIVE_NAMES: Record<string, string> = {
  English: "English",
  Hindi: "हिन्दी",
  Bengali: "বাংলা",
  Telugu: "తెలుగు",
  Marathi: "मराठी",
  Tamil: "தமிழ்",
  Gujarati: "ગુજરાતી",
  Kannada: "ಕನ್ನಡ",
  Malayalam: "മലയാളം",
  Punjabi: "ਪੰਜਾਬੀ",
  Odia: "ଓଡ଼ିଆ",
  Urdu: "اردو",
  Assamese: "অসমীয়া",
};

export const ALL_HELP_LANGUAGES = ["English", ...INDIAN_LANGUAGES];

export function getSavedLanguageSettings(): LanguageSettings {
  try {
    const savedHelp = localStorage.getItem(STORAGE_KEY_HELP_LANG);
    const savedQ = localStorage.getItem(STORAGE_KEY_Q_LANG);
    return {
      helpLang: savedHelp && ALL_HELP_LANGUAGES.includes(savedHelp) ? savedHelp : "Hindi",
      questionLang:
        savedQ === "english" || savedQ === "bilingual" || savedQ === "native"
          ? savedQ
          : "english",
    };
  } catch {
    return { helpLang: "Hindi", questionLang: "english" };
  }
}

export function saveLanguageSettings(settings: Partial<LanguageSettings>): LanguageSettings {
  const current = getSavedLanguageSettings();
  const updated: LanguageSettings = {
    helpLang: settings.helpLang ?? current.helpLang,
    questionLang: settings.questionLang ?? current.questionLang,
  };
  try {
    localStorage.setItem(STORAGE_KEY_HELP_LANG, updated.helpLang);
    localStorage.setItem(STORAGE_KEY_Q_LANG, updated.questionLang);
    // Also update legacy key if present so older hooks stay in sync
    localStorage.setItem("edubharat_preferred_language", updated.helpLang);
  } catch {
    // localStorage optional
  }
  return updated;
}

export function useLanguageSettings() {
  const [settings, setSettings] = useState<LanguageSettings>(getSavedLanguageSettings);

  useEffect(() => {
    const onStorage = () => setSettings(getSavedLanguageSettings());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: Partial<LanguageSettings>) => {
    const saved = saveLanguageSettings(next);
    setSettings(saved);
  }, []);

  return { ...settings, updateSettings: update };
}

interface LanguageSheetProps {
  open: boolean;
  onClose: () => void;
  showQuestionLangSetting?: boolean; // True for Interview Ace, false for English Guru
  onSave?: (settings: LanguageSettings) => void;
}

export function LanguageSheet({
  open,
  onClose,
  showQuestionLangSetting = true,
  onSave,
}: LanguageSheetProps) {
  const [selectedHelp, setSelectedHelp] = useState<string>("Hindi");
  const [selectedQ, setSelectedQ] = useState<"english" | "bilingual" | "native">("english");

  useEffect(() => {
    if (open) {
      const saved = getSavedLanguageSettings();
      setSelectedHelp(saved.helpLang);
      setSelectedQ(saved.questionLang);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    const saved = saveLanguageSettings({
      helpLang: selectedHelp,
      questionLang: selectedQ,
    });
    onSave?.(saved);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
      style={{ fontFamily: GURU_FONT }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 id="lang-modal-title" className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                भाषा चुनें · Choose Language
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                सीखने और इंटरव्यू के लिए अपनी पसंदीदा भाषा सेट करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="बंद करें · Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-5 py-4 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* Setting A: Help and Feedback Language */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <HelpCircle className="h-4 w-4 text-orange-600" />
              <label className="text-xs sm:text-sm font-bold text-slate-900">
                1. सहायक भाषा · Help &amp; Feedback Language
              </label>
            </div>
            <p className="text-xs text-slate-500 mb-2.5 leading-relaxed">
              AI इस भाषा में मदद करेगा, अर्थ बताएगा और आपकी गलतियाँ समझाएगा।
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_HELP_LANGUAGES.map((lang) => {
                const native = LANGUAGE_NATIVE_NAMES[lang] || lang;
                const isSelected = selectedHelp === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedHelp(lang)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-left border flex items-center justify-between transition-all active:scale-95 ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/70 text-orange-950 font-bold shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="text-xs sm:text-sm leading-tight truncate">{native}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">{lang}</div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-orange-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Setting B: Interview Question Language (Optional / Contextual) */}
          {showQuestionLangSetting && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="h-4 w-4 text-orange-600" />
                <label className="text-xs sm:text-sm font-bold text-slate-900">
                  2. सवाल की भाषा · Question Language
                </label>
              </div>
              <p className="text-xs text-slate-500 mb-2.5 leading-relaxed">
                इंटरव्यूअर किस भाषा में सवाल पूछे:
              </p>

              <div className="space-y-2">
                {[
                  {
                    value: "english" as const,
                    title: "English (अनुशंसित · Recommended)",
                    desc: "सवाल अंग्रेज़ी में, मदद व अनुवाद आपकी भाषा में",
                    badge: "Best for practice",
                  },
                  {
                    value: "bilingual" as const,
                    title: "English + अनुवाद (Bilingual)",
                    desc: "सवाल अंग्रेज़ी और हिन्दी दोनों में साथ दिखाई देगा",
                  },
                  {
                    value: "native" as const,
                    title: `${LANGUAGE_NATIVE_NAMES[selectedHelp] || selectedHelp} (Full Native)`,
                    desc: "पूरा इंटरव्यू और सवाल चुनी हुई भाषा में",
                  },
                ].map((opt) => {
                  const isSelected = selectedQ === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedQ(opt.value)}
                      className={`min-h-[48px] w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all active:scale-[0.99] ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/70 shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isSelected ? "text-orange-950" : "text-slate-800"
                            }`}
                          >
                            {opt.title}
                          </span>
                          {opt.badge && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-orange-600 bg-orange-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 truncate">
            सहायक भाषा: <strong className="text-slate-800">{LANGUAGE_NATIVE_NAMES[selectedHelp] || selectedHelp}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              रद्द करें · Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all active:scale-95"
              style={{ backgroundColor: GURU_COLORS.accent }}
            >
              सेव करें · Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LanguageSheet;
