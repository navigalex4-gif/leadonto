import { useEffect } from "react";

/**
 * The acquisition page is kept as the supplied standalone HTML/CSS/JS asset
 * at /lp/speak. This route is the public English-page entry point.
 */
export default function EnglishLanding() {
  useEffect(() => {
    window.location.replace("/lp/speak");
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#0f0b2d] text-white">
      <p className="text-sm text-white/75">Opening Lead Onto English practice…</p>
    </main>
  );
}