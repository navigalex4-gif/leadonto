import { Link, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { track, trackFunnel } from "@/lib/analytics";

/**
 * Global mobile sticky CTA rendered by <Layout>. Hidden on the routes below
 * (product routes have their own footer / in-page CTA, and admin/B2B/login
 * pages should not show a marketing CTA).
 *
 * Kept separate from the existing per-page <MobilePrimaryCTA> which stays as-is.
 */
const HIDE_ON: readonly string[] = [
  "/english-guru",
  "/interview-ace",
  "/communication-check",
  "/rozgar-samachar",
  "/resume-intelligence",
  "/learning-journey",
  "/tools-pro",
  "/history",
  "/progress",
  "/profile",
  "/credits",
  "/login",
  "/admin",
  "/admin-login",
  "/admin-payments",
  "/admin-users",
  "/admin-interviews",
  "/admin-communication-checks",
  "/admin-b2b",
  "/admin-content",
  "/admin-resumes",
  "/admin-activity",
  "/admin-email",
  "/admin-funnel",
  "/b2b",
];

export function MobileStickyCTA() {
  const [location] = useLocation();
  const path = location.split("?")[0] ?? "/";
  const hidden = HIDE_ON.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="border-t border-orange-200/70 bg-white/95 px-3 py-2.5 backdrop-blur-sm">
        <Link
          href="/english-guru"
          onClick={() => {
            track("mobile_sticky_cta_clicked", { placement: "global" });
            trackFunnel("cta_clicked", { cta: "start_english_guru", placement: "mobile_sticky_global" });
          }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F97316] text-sm font-extrabold text-white shadow-lg shadow-orange-200 hover:bg-[#C2410C]"
        >
          🎙 Start 15 Free Minutes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
