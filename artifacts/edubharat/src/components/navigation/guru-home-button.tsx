import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Home, AlertTriangle, X } from "lucide-react";

export interface GuruHomeButtonProps {
  /** If true, confirms with the learner before navigating to home */
  isDirty?: boolean;
  /** Optional callback before navigating away (e.g. stop speech/mic, teardown) */
  onLeave?: () => void;
  /** Visual variant:
   *  - 'pill': Compact rounded pill with icon and bilingual label (default)
   *  - 'header': Integrated header style for top navigation bars
   *  - 'floating': Top-corner floating button for full-screen voice rooms
   *  - 'nav-item': Bottom tab bar / sidebar vertical button
   */
  variant?: "pill" | "header" | "floating" | "nav-item";
  /** Custom extra styling */
  className?: string;
  /** Custom destination (defaults to site home "/") */
  href?: string;
}

export function GuruHomeButton({
  isDirty = false,
  onLeave,
  variant = "pill",
  className = "",
  href = "/",
}: GuruHomeButtonProps) {
  const [, setLocation] = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);

  // Close confirmation modal on Escape key
  useEffect(() => {
    if (!showConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowConfirm(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConfirm]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDirty) {
        setShowConfirm(true);
      } else {
        onLeave?.();
        setLocation(href);
      }
    },
    [isDirty, onLeave, setLocation, href]
  );

  const handleConfirmLeave = useCallback(() => {
    setShowConfirm(false);
    onLeave?.();
    setLocation(href);
  }, [onLeave, setLocation, href]);

  const handleStay = useCallback(() => {
    setShowConfirm(false);
  }, []);

  // Shared min touch target: 44px min height & width for mobile usability
  const baseTouchTarget = "min-h-[44px] min-w-[44px] touch-manipulation select-none";

  let buttonClasses = "";
  if (variant === "floating") {
    buttonClasses = `${baseTouchTarget} inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200/80 backdrop-blur-sm transition-all active:scale-95 text-xs font-bold z-30`;
  } else if (variant === "header") {
    buttonClasses = `${baseTouchTarget} inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors active:scale-95`;
  } else if (variant === "nav-item") {
    buttonClasses = `${baseTouchTarget} flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-slate-700 hover:text-slate-950 active:scale-95 transition-colors`;
  } else {
    // Default 'pill'
    buttonClasses = `${baseTouchTarget} inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs font-bold text-xs transition-all active:scale-95`;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="होम पेज पर जाएं · Go to Home"
        className={`${buttonClasses} ${className}`}
      >
        <Home className="h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
        {variant === "nav-item" ? (
          <span className="text-[10px] font-bold leading-tight tracking-tight">होम · Home</span>
        ) : (
          <span className="inline-flex items-center gap-1 leading-none font-bold">
            <span>होम</span>
            <span className="text-slate-400 font-normal">·</span>
            <span>Home</span>
          </span>
        )}
      </button>

      {/* Confirmation Modal when leaving an active lesson / interview */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-exit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={handleStay}
              aria-label="Close"
              className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 id="confirm-exit-title" className="text-base font-extrabold text-slate-900 leading-snug">
                  क्या आप बाहर जाना चाहते हैं?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Do you want to leave this session?
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-slate-700 bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 font-medium leading-relaxed">
              ⚠️ <strong>प्रगति सेव नहीं होगी।</strong> आपका मौजूदा अभ्यास या इंटरव्यू अधूरा रह जाएगा।
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleStay}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
              >
                रहें · Stay
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-sm transition-all"
              >
                हाँ, बाहर जाएं · Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GuruHomeButton;
