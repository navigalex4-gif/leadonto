import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
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
    title: "Start with 100 seats",
    body: "Activate a 30-day pilot for final-year students with no card and no lock-in.",
  },
  {
    step: "2",
    title: "Watch practice happen",
    body: "Students build speaking and interview habits while the TPO sees participation and readiness signals.",
  },
  {
    step: "3",
    title: "Make the annual call",
    body: "At day 30, use the cohort report to renew for the batch from ₹299 per student per year.",
  },
] as const;

const BUYER_LENSES = [
  {
    icon: GraduationCap,
    title: "For students",
    body: "Practice English conversations, mock interviews, and job-ready communication before placement day.",
  },
  {
    icon: BarChart3,
    title: "For the TPO",
    body: "See participation, fluency, interview readiness, and common gaps without chasing spreadsheets.",
  },
  {
    icon: ShieldCheck,
    title: "For leadership",
    body: "Start with a bounded pilot, keep student work private, and expand only when the evidence is useful.",
  },
] as const;

const INSTITUTION_PLANS = [
  {
    name: "Pilot",
    price: "₹0",
    detail: "100 seats · 30 days",
    body: "A low-risk way to see participation and readiness before committing to an annual licence.",
    badge: "Start here",
  },
  {
    name: "College Standard",
    price: "₹299",
    detail: "per student · per year · 200+ seats",
    body: "The practical whole-batch option with the TPO dashboard, support, and the full student practice stack.",
    badge: "Best value",
  },
  {
    name: "Corporate Cohort",
    price: "Custom",
    detail: "100-seat minimum",
    body: "Custom scenarios, HR reports, and a private cohort experience for L&D and hiring teams.",
    badge: "For employers",
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
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-200">For placement cells &amp; L&amp;D teams</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Turn placement prep into a measurable campus advantage.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary-foreground/80 sm:text-lg">
            Give every final-year student a private place to practise English and interviews, while your TPO gets
            a clear view of cohort readiness. Start with 100 seats free for 30 days.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-indigo-100">
            {["100 seats", "30 days", "No card", "India-first support"].map((item) => (
              <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{item}</span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="mailto:email@leadonto.com?subject=Free%20100-seat%20pilot%20for%20our%20college"
              onClick={() => {
                track("colleges_cta_clicked", { cta: "email_sales", placement: "hero" });
                trackFunnel("cta_clicked", { cta: "colleges_email_sales", placement: "for_colleges_hero" });
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-secondary hover:bg-orange-50"
            >
              Start the free 100-seat pilot
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
            See the pilot evidence first. No credit card is required, and you choose whether to continue after 30 days.
          </p>
        </div>
      </section>

      {/* Value bullets */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">One platform, three wins</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
              The value is visible to the student, the TPO, and the decision-maker.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...BUYER_LENSES, ...BULLETS.slice(0, 1)].map(({ icon: Icon, title, body }) => (
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

      {/* Pilot nudge */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">A practical 30-day decision</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
              Start small. See the signal. Then scale with confidence.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ step, title, body }) => (
              <Card key={step} className="border-border/80">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-extrabold">
                    {step}
                  </div>
                  {step === "1" && <Clock3 className="ml-auto h-4 w-4 text-primary" aria-label="30-day pilot" />}
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
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">Institution pricing</p>
            <h2 className="mt-3 max-w-2xl text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
              One low-risk pilot, one clear annual value choice.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Compare the path that fits your buying moment. Every paid college seat is annual, predictable, and
              free from per-session surprises.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {INSTITUTION_PLANS.map((plan, index) => (
              <Card
                key={plan.name}
                className={index === 1 ? "border-2 border-[#F97316] bg-white shadow-lg shadow-orange-100/50" : "border-border/80"}
              >
                <CardContent className="p-5">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                    index === 1 ? "bg-orange-100 text-orange-800" : "bg-secondary/10 text-secondary"
                  }`}>
                    {plan.badge}
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold text-secondary">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-extrabold text-secondary">{plan.price}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{plan.detail}</p>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.body}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Predictable institutional access
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <a
                href="mailto:email@leadonto.com?subject=B2B%20pricing%20enquiry"
                className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F97316] px-5 text-sm font-extrabold text-white hover:bg-[#C2410C]"
                onClick={() =>
                  trackFunnel("cta_clicked", { cta: "colleges_email_sales", placement: "for_colleges_pricing" })
                }
              >
                <Mic className="h-4 w-4" /> Get a proposal
              </a>
              <Link
                href="/b2b/login"
                className="ml-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-extrabold text-secondary hover:bg-muted/30"
              >
                <Building2 className="h-4 w-4" /> B2B Portal
              </Link>
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
