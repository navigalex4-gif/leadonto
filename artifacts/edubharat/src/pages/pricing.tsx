import { Link } from "wouter";
import { ArrowRight, Check, Coins, ShieldCheck, Infinity as InfinityIcon, Sparkles } from "lucide-react";
import { PageMeta } from "@/components/page-meta";
import { PLANS, type Plan } from "@/lib/plans";
import { track, trackFunnel, withAcquisition } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";

function PlanCard({ plan }: { plan: Plan }) {
  const isHighlight = !!plan.highlight;
  const isBestValue = plan.id === "career";
  const isAnchor = plan.id === "sprint";
  return (
    <div
      className={
        "relative flex flex-col rounded-2xl p-6 " +
        (isHighlight
          ? "border-2 border-[#F97316] bg-white shadow-xl shadow-orange-200/40"
          : isBestValue
            ? "border-2 border-emerald-500/70 bg-emerald-50/20 shadow-lg shadow-emerald-100/50"
            : isAnchor
              ? "border border-dashed border-secondary/30 bg-secondary/[0.03]"
          : "border border-border bg-card")
      }
    >
      {plan.pricingBadge && (
        <span
          className={`mb-3 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${
            isHighlight
              ? "bg-[#F97316] text-white"
              : isBestValue
                ? "bg-emerald-100 text-emerald-800"
                : "bg-secondary/10 text-secondary"
          }`}
        >
          {plan.pricingBadge}
        </span>
      )}
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{plan.name}</p>
      <p className="mt-1 text-4xl font-extrabold text-secondary">
        {plan.priceLabel}
        {plan.cadence && plan.cadence !== "once" && (
          <span className="ml-1 text-base font-semibold text-muted-foreground">/{plan.cadence}</span>
        )}
        {plan.cadence === "once" && (
          <span className="ml-1 text-base font-semibold text-muted-foreground">one-time</span>
        )}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
      {plan.decisionNote && (
        <p className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs font-semibold leading-5 text-secondary">
          {plan.decisionNote}
        </p>
      )}

      <ul className="mt-5 flex-1 space-y-2 text-sm text-secondary">
        {plan.fullBullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <Link
        href={withAcquisition(plan.ctaHref)}
        onClick={() => {
          track("pricing_cta_clicked", { plan: plan.id });
          trackFunnel("cta_clicked", { cta: "pricing_plan", placement: `pricing_${plan.id}` });
        }}
        className={
          "mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition-colors " +
          (isHighlight
            ? "bg-[#F97316] text-white shadow-md hover:bg-[#C2410C]"
            : "border border-border bg-white text-secondary hover:border-secondary/30 hover:bg-muted/30")
        }
      >
        {plan.ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

const FAQS = [
  {
    q: "Do I need a subscription?",
    a: "No. Top up only when you need more practice. Credits never expire.",
  },
  {
    q: "How do credits work?",
    a: "One credit is ₹1 and covers 12 minutes of live conversation. The minimum top-up is ₹10.",
  },
  {
    q: "Do you offer refunds?",
    a: "See our Refund Policy — refunds are available within 7 days if you have used fewer than 20% of your plan's entitlements.",
  },
  {
    q: "Which payment methods work?",
    a: "UPI (Google Pay, PhonePe, Paytm), all major cards, and net banking through Cashfree.",
  },
  {
    q: "Is there a student or bulk discount?",
    a: "Bulk college purchases start at ₹299/student/year for 200 or more seats — see For Colleges.",
  },
] as const;

export default function Pricing() {
  const availablePlans = PLANS.filter((plan) => plan.id === "free" || plan.id === "credits");
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <PageMeta
        title="Pricing"
        description="Start with 15 free guest minutes, then buy credits only when you need them. Credits start at ₹10 and never expire."
        canonicalUrl="https://leadonto.com/pricing"
      />

      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">₹ Pricing</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-secondary sm:text-5xl">
          Pick the right pace for your next opportunity.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          Start with 15 minutes of live conversation without signing up or adding a card.
          Create a free account for 20 credits, then top up only when you need more.
        </p>
      </header>

      <section className="mx-auto mt-8 max-w-4xl rounded-2xl border border-orange-200 bg-orange-50/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-secondary">Start free today</p>
            <p className="mt-0.5 text-xs leading-5 text-secondary/70 sm:text-sm">
              15 guest minutes now, plus 20 credits when you create your free account.
            </p>
          </div>
        </div>
        <Link
          href={withAcquisition("/english-guru")}
          onClick={() => trackFunnel("cta_clicked", { cta: "pricing_try_free", placement: "pricing_trial_banner" })}
          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-xs font-extrabold text-white hover:bg-secondary/90 sm:mt-0"
        >
          Try English Guru
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

        {/* Show only purchase options supported by the current credit policy. */}
      <section className="mt-10" aria-labelledby="plan-comparison-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">Choose your commitment</p>
            <h2 id="plan-comparison-title" className="mt-2 text-2xl font-extrabold text-secondary">
              Start free, then pay only for what you use.
            </h2>
          </div>
          <p className="max-w-xs text-right text-xs leading-5 text-muted-foreground">
            One credit is ₹1, covers 12 minutes of live conversation, and never expires.
          </p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {availablePlans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      </section>

      {/* B2B teaser */}
      <section className="mt-14">
        <Card className="border-none bg-gradient-to-br from-indigo-950 to-secondary text-secondary-foreground shadow-xl">
          <CardContent className="p-8 sm:p-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-200">For colleges & corporate teams</p>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Give a whole cohort a fair shot at the interview.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary-foreground/70 sm:text-base">
              Branded practice, cohort analytics, and mother-tongue support for placement cells and L&D teams.
              College plans start at <strong className="text-white">₹299/student/year</strong> for 200+ seats.
            </p>
            <Link
              href="/for-colleges"
              onClick={() =>
                trackFunnel("cta_clicked", { cta: "pricing_b2b", placement: "pricing_bottom" })
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-secondary hover:bg-orange-50"
            >
              Talk to sales
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Trust row */}
      <section className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Secure Cashfree checkout
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-amber-500" /> UPI · Cards · Net Banking
        </span>
        <span className="inline-flex items-center gap-1.5">
          <InfinityIcon className="h-4 w-4 text-secondary" /> Credits never expire
        </span>
      </section>

      {/* FAQs */}
      <section className="mx-auto mt-14 max-w-3xl">
        <h2 className="text-2xl font-extrabold text-secondary">Frequently asked</h2>
        <dl className="mt-6 divide-y divide-border">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-secondary">
                {f.q}
                <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </dl>
      </section>
    </div>
  );
}
