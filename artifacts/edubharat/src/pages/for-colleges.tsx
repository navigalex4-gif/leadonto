import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PageMeta } from "@/components/page-meta";
import { track, trackFunnel } from "@/lib/analytics";
import { INDIAN_LANGUAGES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

const BULLETS = [
  {
    icon: Users,
    title: "Unlimited practice for every student",
    body: "AI English conversations and mock interviews so no student in your cohort is left behind before placements.",
  },
  {
    icon: Building2,
    title: "Branded portal for your institution",
    body: "Your college logo, your students, your data — accessed through a private B2B portal.",
  },
  {
    icon: BarChart3,
    title: "TPO dashboard with cohort analytics",
    body: "See fluency scores, mock interview outcomes, and readiness rankings across departments and years.",
  },
  {
    icon: BookOpen,
    title: "Mother-tongue bridge in 12 Indian languages",
    body: "Practise switches to Hindi, Tamil, Telugu, Bengali and 8 more the moment a student gets stuck.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Free 100-seat pilot",
    body: "We activate 100 seats for your final-year students for 30 days. No card, no lock-in.",
  },
  {
    step: "2",
    title: "TPO reviews the cohort report",
    body: "At day 30 you receive fluency and interview-readiness data for the pilot cohort.",
  },
  {
    step: "3",
    title: "Renew for the whole batch",
    body: "Annual licence from ₹299 per student for 200+ seats. Includes admin dashboard and support.",
  },
] as const;

export default function ForColleges() {
  return (
    <div className="min-w-0">
      <PageMeta
        title="For Colleges & Employers"
        description="Give every final-year student unlimited AI English practice and mock interviews with a mother-tongue bridge. Free 100-seat pilot for Indian colleges."
        canonicalUrl="https://leadonto.com/for-colleges"
      />

      {/* Hero */}
      <section className="border-b border-border/70 bg-gradient-to-br from-indigo-950 to-secondary text-secondary-foreground">
        <div className="container mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-200">🎓 For placement cells</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Give every final-year student unlimited interview practice.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary-foreground/80 sm:text-lg">
            Branded portal for your college, cohort analytics for the TPO, and mother-tongue support so no student is
            left behind. From ₹299/student/year for 200+ seats.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="mailto:email@leadonto.com?subject=Free%20100-seat%20pilot%20for%20our%20college"
              onClick={() => {
                track("colleges_cta_clicked", { cta: "email_sales", placement: "hero" });
                trackFunnel("cta_clicked", { cta: "colleges_email_sales", placement: "for_colleges_hero" });
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-secondary hover:bg-orange-50"
            >
              Book a free 100-seat pilot
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/b2b/login"
              onClick={() => {
                track("colleges_cta_clicked", { cta: "b2b_portal", placement: "hero" });
                trackFunnel("cta_clicked", { cta: "colleges_b2b_portal", placement: "for_colleges_hero" });
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-extrabold text-white hover:bg-white/10"
            >
              <Building2 className="h-4 w-4" /> B2B Portal login
            </Link>
          </div>

          <p className="mt-4 text-xs text-secondary-foreground/60">
            Already partnered with placement cells across India. No credit card required for the pilot.
          </p>
        </div>
      </section>

      {/* Value bullets */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">Why placement cells choose us</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
              Everything your students need before the interview.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BULLETS.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-border/80">
                <CardContent className="p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-5 text-base font-extrabold text-secondary">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Language bar */}
      <section className="border-y border-border/70 bg-card/40 py-10">
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">🇮🇳 Mother-tongue bridge</p>
              <h3 className="mt-2 text-xl font-extrabold text-secondary sm:text-2xl">
                Support in {INDIAN_LANGUAGES.length} Indian languages.
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {INDIAN_LANGUAGES.map((lang) => (
                <span
                  key={lang}
                  className="rounded-lg border border-teal-200/70 bg-white px-2.5 py-1 text-xs font-bold text-teal-800"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">How it works</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
              Start with a free 100-seat pilot.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ step, title, body }) => (
              <Card key={step} className="border-border/80">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-extrabold">
                    {step}
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-secondary">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing summary */}
      <section className="border-y border-border/70 bg-card/40 py-12 sm:py-16">
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">Institution pricing</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
                Simple annual licences. No per-session fees.
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-secondary">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span><strong>College Pilot</strong> — free · 100 seats · 30 days</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span><strong>College Standard</strong> — ₹299/student/year for 200+ seats · TPO dashboard included</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span><strong>Corporate Cohort</strong> — from ₹799/employee/month (100-seat minimum) · custom scenarios · HR reports</span>
                </li>
              </ul>
              <a
                href="mailto:email@leadonto.com?subject=B2B%20pricing%20enquiry"
                className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F97316] px-5 text-sm font-extrabold text-white hover:bg-[#C2410C]"
                onClick={() =>
                  trackFunnel("cta_clicked", { cta: "colleges_email_sales", placement: "for_colleges_pricing" })
                }
              >
                <Mic className="h-4 w-4" /> Get a proposal
              </a>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-secondary/60">
                <Sparkles className="h-3.5 w-3.5" /> Sample TPO report
              </div>
              <h3 className="mt-3 text-lg font-extrabold text-secondary">Placement-Ready Cohort Snapshot</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                  <span className="text-muted-foreground">Fluency ready (B2+)</span>
                  <span className="font-extrabold text-secondary">64%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                  <span className="text-muted-foreground">Avg mock interview score</span>
                  <span className="font-extrabold text-secondary">71/100</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                  <span className="text-muted-foreground">Practice minutes / student</span>
                  <span className="font-extrabold text-secondary">142 min</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                  <span className="text-muted-foreground">Common gap</span>
                  <span className="font-extrabold text-secondary">Salary negotiation</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Real reports use anonymised cohort data. Sample values shown for illustration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-12 sm:py-14">
        <div className="container mx-auto max-w-3xl px-5 text-center sm:px-8">
          <ShieldCheck className="mx-auto h-6 w-6 text-emerald-600" />
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
            Secure, private, and India-first.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Student conversations are private to the institution's portal. We support single sign-on and can host
            student data under your institution's data-protection preferences.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:email@leadonto.com?subject=Free%20100-seat%20pilot%20for%20our%20college"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-5 text-sm font-extrabold text-secondary-foreground hover:bg-secondary/90"
              onClick={() =>
                trackFunnel("cta_clicked", { cta: "colleges_email_sales", placement: "for_colleges_final" })
              }
            >
              <GraduationCap className="h-4 w-4" /> Start a free pilot
            </a>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-extrabold text-secondary hover:bg-muted/30"
            >
              See consumer pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
