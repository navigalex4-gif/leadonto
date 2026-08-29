import { Link } from "wouter";
import { ArrowRight, Check, Coins, ShieldCheck, Infinity as InfinityIcon } from "lucide-react";
import { PageMeta } from "@/components/page-meta";
import { PLANS, type Plan } from "@/lib/plans";
import { track, trackFunnel } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";

function PlanCard({ plan }: { plan: Plan }) {
  const isHighlight = !!plan.highlight;
  return (
    <div
      className={
        "flex flex-col rounded-2xl p-6 " +
        (isHighlight
          ? "border-2 border-[#F97316] bg-white shadow-xl shadow-orange-200/40"
          : "border border-border bg-card")
      }
    >
      {isHighlight && (
        <span className="mb-3 inline-flex w-fit items-center rounded-full bg-[#F97316] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white">
          Most popular
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

      <ul className="mt-5 flex-1 space-y-2 text-sm text-secondary">
        {plan.fullBullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.ctaHref}
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
    q: "Can I cancel a subscription anytime?",
    a: "Yes. Cancel from your profile and you keep access until the end of the billing period.",
  },
  {
    q: "What happens to my credits if I subscribe?",
    a: "Existing credits stay in your account, never expire, and are used automatically once your subscription entitlements are used up.",
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
    a: "The ₹1,499 Placement Sprint is designed for final-year students. Bulk college purchases start at ₹299/student/year — see For Colleges.",
  },
] as const;

export default function Pricing() {
  const consumer = PLANS.filter((p) => p.id === "free" || p.id === "practice" || p.id === "career");
  const other = PLANS.filter((p) => p.id === "sprint" || p.id === "credits");

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <PageMeta
        title="Pricing"
        description="Try free. Subscribe when it works. Lead Onto plans start at ₹0 forever, ₹199/mo Practice, ₹499/mo Career, or ₹1,499 one-time Placement Sprint."
        canonicalUrl="https://leadonto.com/pricing"
      />

      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">₹ Pricing</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-secondary sm:text-5xl">
          Try free. Subscribe when it works.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          Start with 15 free minutes as a guest — no signup, no card. Create a free account and get 20 credits.
          Only pay when you're ready to practise every day.
        </p>
      </header>

      {/* Consumer plans */}
      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {consumer.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </section>

      {/* Other ways to buy */}
      <section className="mt-14">
        <h2 className="text-xl font-extrabold text-secondary">Other ways to buy</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {other.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      </section>

      {/* B2B teaser */}
      <section className="mt-14">
        <Card className="border-none bg-gradient-to-br from-indigo-950 to-secondary text-secondary-foreground shadow-xl">
          <CardContent className="p-8 sm:p-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-200">🎓 For colleges & corporate teams</p>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Volume pricing for placement cells and L&D teams.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary-foreground/70 sm:text-base">
              Branded portal for your college or company, cohort analytics for the TPO, and mother-tongue support so no
              student is left behind. From <strong className="text-white">₹299/student/year</strong> for 200+ seats.
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
