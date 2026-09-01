import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  FileText,
  GraduationCap,
  Languages,
  Mic2,
  MessageCircle,
  Newspaper,
  Route,
  Sparkles,
} from "lucide-react";
import { TUTORS } from "@/lib/tutors";
import { HomeMeta } from "@/components/page-meta";
import { useContent } from "@/lib/use-content";
import { track, trackFunnel } from "@/lib/analytics";
import { MobilePrimaryCTA } from "@/components/mobile-primary-cta";
import { PLANS, TESTIMONIALS } from "@/lib/plans";
import { INDIAN_LANGUAGES } from "@/lib/constants";

const ROLE_EXAMPLES = [
  "Software Developer",
  "Sales Executive",
  "Customer Support",
  "Marketing",
  "HR",
  "Finance",
  "Fresh Graduate",
];

const PRODUCT_SHOWCASE = [
  {
    href: "/english-guru",
    name: "English Guru",
    description: "Speak with confidence in interviews, meetings, and everyday work.",
    icon: MessageCircle,
    iconClass: "bg-orange-100 text-orange-700",
    cardClass: "border-orange-200/70 bg-orange-50/60 hover:border-orange-400",
    linkClass: "text-orange-700",
  },
  {
    href: "/interview-ace",
    name: "Interview Ace",
    description: "Practice realistic, role-based mock interviews with instant feedback.",
    icon: Mic2,
    iconClass: "bg-blue-100 text-blue-700",
    cardClass: "border-blue-200/70 bg-blue-50/60 hover:border-blue-400",
    linkClass: "text-blue-700",
  },
  {
    href: "/tools-pro",
    name: "Tools Pro",
    description: "Fix grammar, write better, build vocabulary, and practise pronunciation.",
    icon: Sparkles,
    iconClass: "bg-violet-100 text-violet-700",
    cardClass: "border-violet-200/70 bg-violet-50/60 hover:border-violet-400",
    linkClass: "text-violet-700",
  },
  {
    href: "/rozgar-samachar",
    name: "Rozgar Samachar",
    description: "Find personalised jobs and career opportunities across India.",
    icon: Newspaper,
    iconClass: "bg-teal-100 text-teal-700",
    cardClass: "border-teal-200/70 bg-teal-50/60 hover:border-teal-400",
    linkClass: "text-teal-700",
  },
  {
    href: "/resume-intelligence",
    name: "Resume Intelligence",
    description: "Match your resume to a real job and close your most important skill gaps.",
    icon: FileText,
    iconClass: "bg-amber-100 text-amber-700",
    cardClass: "border-amber-200/70 bg-amber-50/60 hover:border-amber-400",
    linkClass: "text-amber-700",
  },
  {
    href: "/communication-check",
    name: "Communication Check",
    description: "Get a fast, free speaking assessment with practical next steps.",
    icon: BadgeCheck,
    iconClass: "bg-emerald-100 text-emerald-700",
    cardClass: "border-emerald-200/70 bg-emerald-50/60 hover:border-emerald-400",
    linkClass: "text-emerald-700",
  },
  {
    href: "/learning-journey",
    name: "Learning Journey",
    description: "Follow a personalised A1 to C2 practice path with spaced repetition.",
    icon: Route,
    iconClass: "bg-rose-100 text-rose-700",
    cardClass: "border-rose-200/70 bg-rose-50/60 hover:border-rose-400",
    linkClass: "text-rose-700",
  },
] as const;

/** 8 homepage FAQs — copied verbatim from the English Guru page copy that
 * already converts. Kept in one place so the JSON-LD schema in index.html
 * matches what the user reads. */
const FAQS = [
  {
    q: "Is it really free? Do I need to give my card?",
    a: "Your first 15 minutes are free with no signup and no card — just tap Start and begin talking. Create a free account and you get 20 signup credits. You only enter payment details if you decide to buy more credits or subscribe.",
  },
  {
    q: "My English is very weak. Will I be able to use this?",
    a: "That's exactly who this is built for. You can speak entirely in Hindi (or Tamil, Telugu, Bengali and 9 others) and your AI coach will help you say it in English, one sentence at a time. Beginners usually start with 3-minute sessions.",
  },
  {
    q: "How is this different from a free AI chatbot?",
    a: "Three things. It's spoken, not typed — which is the skill you're actually missing. It switches to your mother tongue at the exact moment you get stuck instead of repeating itself in English. And it tracks a Fluency Score across sessions so you can see whether you're improving.",
  },
  {
    q: "Will it work on my phone and my data pack?",
    a: "Yes. It runs in your phone's browser — nothing to install. There's an audio-light mode built for patchy 3G, and a typical 12-minute session uses far less data than a video call.",
  },
  {
    q: "Can I practise for a specific job or interview?",
    a: "Yes. Choose your scenario — HR interview, technical round, customer call, team meeting, IELTS speaking and group discussion. Interview Ace has role-based mock interviews for HR, Software, Sales, BPO, Banking, and more.",
  },
  {
    q: "How do credits work?",
    a: "One credit is ₹1 and covers 12 minutes of live conversation. The minimum top-up is ₹10, credits never expire, and there is no subscription required — but subscriptions unlock unlimited practice.",
  },
  {
    q: "Is my conversation private?",
    a: "Your sessions and account data are handled according to our Privacy Policy. Sessions are private to your account.",
  },
  {
    q: "Can I cancel? What if it doesn't work for me?",
    a: "There is no subscription to cancel on the pay-as-you-go plan. For monthly subscriptions, you can cancel anytime from your profile and keep access until the end of the billing period.",
  },
] as const;

function PrimaryLink({
  href,
  children,
  onClick,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 text-sm font-extrabold text-white shadow-md shadow-orange-200/40 transition-all hover:-translate-y-0.5 hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

function QuietLink({
  href,
  children,
  onClick,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold text-secondary transition-colors hover:border-secondary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

/** Renders only if there is at least one consented testimonial. */
function Testimonials() {
  const items = TESTIMONIALS.filter((t) => t.consent);
  if (items.length === 0) return null;
  return (
    <section className="bg-card/40 border-y border-border/70 py-12 sm:py-14" aria-labelledby="testimonials-title">
      <div className="container mx-auto max-w-6xl px-5 sm:px-8">
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">★ Learners</p>
        <h2 id="testimonials-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">
          Real people. Real practice.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.id} className="rounded-2xl border border-border bg-white p-5">
              <blockquote className="text-sm leading-6 text-secondary">“{t.quote}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                {t.photo ? (
                  <img src={t.photo} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted" />
                )}
                <div className="text-sm">
                  <p className="font-extrabold text-secondary">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role} · {t.city}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  // Preserve admin overrides — same useContent keys as before, better fallbacks.
  const heroEyebrow = useContent(
    "home.hero.eyebrow",
    "🇮🇳 हिंदी · தமிழ் · తెలుగు · বাংলা · मराठी + 8 more",
  );
  const heroTitle = useContent(
    "home.hero.title",
    "Stop freezing in English. Start speaking in 10 seconds.",
  );
  const heroSubtitle = useContent(
    "home.hero.subheadline",
    "Practise real conversations with an AI teacher who switches to your mother tongue the second you get stuck — then brings you right back to English. No classes. No schedule. No judgement.",
  );
  const ctaPrimary = useContent("home.hero.startCta", "🎙 Start 15 Free Minutes");
  const ctaSecondary = useContent("home.hero.checkCta", "Try a Mock Interview");

  const homePlans = PLANS.filter((p) => p.showOnHome);

  return (
    <>
      <HomeMeta />
      <div className="home-shell min-w-0 overflow-hidden">
        {/* HERO */}
        <section
          className="relative isolate overflow-hidden bg-[#FFFDF9] pb-10 pt-8 sm:pb-14 sm:pt-12 lg:pb-16 lg:pt-14"
          aria-labelledby="hero-title"
        >
          <div className="home-grid-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-50" />
          <div className="pointer-events-none absolute -right-40 top-10 -z-10 h-72 w-72 rounded-full bg-orange-100 blur-3xl" />
          <div className="container mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
            <div className="home-reveal max-w-2xl">
              <p className="mb-5 max-w-lg text-xs font-extrabold uppercase tracking-[0.14em] text-[#C2410C] sm:text-sm">
                {heroEyebrow}
              </p>
              <h1
                id="hero-title"
                className="max-w-2xl text-[clamp(1.6rem,4vw,2.6rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#111827]"
              >
                {heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#596273] sm:text-lg">{heroSubtitle}</p>

              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#596273]">
                <li>✓ 15 minutes free</li>
                <li>✓ No signup</li>
                <li>✓ No card</li>
                <li>📶 Works on 3G</li>
              </ul>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <PrimaryLink
                  href="/english-guru"
                  onClick={() => {
                    track("home_cta_clicked", { cta: "start_english_guru", placement: "hero_primary" });
                    trackFunnel("cta_clicked", {
                      cta: "start_english_guru",
                      placement: "hero_primary",
                    });
                  }}
                >
                  {ctaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </PrimaryLink>
                <QuietLink
                  href="/interview-ace"
                  onClick={() =>
                    trackFunnel("cta_clicked", { cta: "start_interview_ace", placement: "hero_secondary" })
                  }
                >
                  <Mic2 className="h-4 w-4 text-blue-600" />
                  {ctaSecondary}
                </QuietLink>
              </div>
              <p className="mt-3 text-xs font-semibold text-[#596273]">
                A private practice room for placements, BPO jobs and MNC interviews.
              </p>
            </div>

            <Link
              href="/english-guru"
              onClick={() => {
                track("home_cta_clicked", { cta: "start_english_guru", placement: "hero_visual" });
                trackFunnel("cta_clicked", {
                  cta: "start_english_guru",
                  placement: "hero_visual",
                });
              }}
              className="home-reveal group relative mx-auto block w-full max-w-md rounded-2xl border border-[#F97316]/35 bg-card p-5 shadow-[0_18px_55px_-30px_rgba(249,115,22,.42)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-4 sm:p-6"
              aria-label="Try the mother-tongue bridge demo"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">
                    Mother-tongue bridge · live demo
                  </p>
                  <h2 className="mt-3 max-w-xs text-xl font-extrabold leading-tight tracking-tight text-[#111827] sm:text-2xl">
                    Get stuck? We switch to your language.
                  </h2>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F97316] text-white">
                  <Languages className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-orange-700">AI Coach</p>
                  <p className="mt-1 text-sm text-secondary">“Tell me about a challenge you faced at work.”</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">You</p>
                  <p className="mt-1 text-sm text-secondary">“I… it was… sorry, I don't know the word.”</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                    AI Coach · switches to Hindi
                  </p>
                  <p className="mt-1 text-sm text-secondary">
                    “Aap kehna chahte ho: <strong>Our team had a coordination problem.</strong> Bolo mere saath.”
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-orange-700">
                  <BadgeCheck className="h-4 w-4" /> Real Lead Onto flow
                </span>
                <span className="inline-flex items-center gap-1 font-extrabold text-orange-700">
                  Try it free <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* MOBILE PRIMARY CTA (in-flow, per-page) */}
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <MobilePrimaryCTA
            label="🎙 Start 15 Free Minutes"
            href="/english-guru"
            onClick={() => {
              track("home_cta_clicked", { cta: "start_english_guru", placement: "mobile_primary" });
              trackFunnel("cta_clicked", {
                cta: "start_english_guru",
                placement: "mobile_primary",
              });
            }}
          />
        </div>

        {/* TRUST BAR — surface the ETS stat + languages count instead of burying them */}
        <section className="border-y border-orange-200/70 bg-[#FFF8F0] py-6 sm:py-8" aria-label="Trust bar">
          <div className="container mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 text-center sm:grid-cols-4 sm:px-8">
            <div>
              <p className="text-2xl font-extrabold text-secondary">{INDIAN_LANGUAGES.length}+</p>
              <p className="mt-1 text-xs text-muted-foreground">Indian languages supported</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-secondary">15 min</p>
              <p className="mt-1 text-xs text-muted-foreground">Free guest practice (no signup)</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-secondary">2 interviews</p>
              <p className="mt-1 text-xs text-muted-foreground">Free mock interviews as guest</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-secondary">97%</p>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">
                of HR decision-makers in India say English matters more today.
                <br />
                <span className="text-[10px]">Source: ETS TOEIC Global English 2026</span>
              </p>
            </div>
          </div>
        </section>

        {/* COMPLETE PRODUCT SUITE */}
        <section className="py-12 sm:py-14" aria-labelledby="products-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-xl">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">One ecosystem, every next step</p>
              <h2 id="products-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">
                Everything you need to move forward.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Build communication skills, prepare for interviews, improve your resume, find opportunities, and keep your progress moving.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCT_SHOWCASE.map(({ href, name, description, icon: Icon, iconClass, cardClass, linkClass }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group flex min-h-52 flex-col rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${cardClass}`}
                  onClick={() => trackFunnel("cta_clicked", { cta: `product_${href.slice(1).replaceAll("-", "_")}`, placement: "home_products" })}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-extrabold leading-tight tracking-tight text-secondary">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                  <span className={`mt-auto inline-flex items-center gap-2 pt-5 text-sm font-extrabold ${linkClass}`}>
                    Explore {name} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <p className="text-xs font-semibold text-muted-foreground w-full">
                Role-based practice for:
              </p>
              {ROLE_EXAMPLES.map((role) => (
                <span key={role} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
                  {role}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS — only renders when TESTIMONIALS array has consented entries */}
        <Testimonials />

        {/* COACHES — with AI Coach badge */}
        <section className="border-y border-border/70 bg-card/40 py-12 sm:py-14" aria-labelledby="coaches-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Practice with perspective</p>
                <h2 id="coaches-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">
                  Meet Your AI English Coaches
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                  Choose the AI coach that matches what you want to improve. Every coach is an AI persona built on Lead Onto's Indian-English models.
                </p>
              </div>
              <Link href="/english-guru" className="inline-flex items-center gap-2 text-sm font-extrabold text-primary">
                Meet the full coaching team <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {TUTORS.map((tutor, index) => (
                <Link
                  key={tutor.id}
                  href="/english-guru"
                  className="group relative rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40"
                >
                  <span className="absolute right-2 top-2 rounded-full bg-secondary/90 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white">
                    AI
                  </span>
                  <img
                    src={tutor.imageSrc}
                    alt={tutor.name}
                    width={80}
                    height={80}
                    loading={index < 3 ? "eager" : "lazy"}
                    className="mx-auto aspect-square w-16 rounded-full object-cover object-top sm:w-20"
                  />
                  <p className="mt-3 text-xs font-extrabold leading-tight text-secondary">{tutor.name}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                    {tutor.role.replace("Pronunciation Specialist", "Pronunciation Coach")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING TEASER — reads from PLANS single source of truth */}
        <section className="py-12 sm:py-14" aria-labelledby="pricing-teaser-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-xl">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">₹ Choose your pace</p>
              <h2 id="pricing-teaser-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">
                Start free. Upgrade when your interview is on the calendar.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Try 15 guest minutes with no card, then choose the everyday plan or the complete job-search stack.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {homePlans.map((p) => {
                const isHighlight = !!p.highlight;
                const isBestValue = p.id === "career";
                return (
                  <div
                    key={p.id}
                    className={
                      "rounded-2xl p-6 " +
                      (isHighlight
                        ? "border-2 border-[#F97316] bg-white shadow-md"
                        : isBestValue
                          ? "border-2 border-emerald-500/70 bg-emerald-50/20 shadow-md"
                        : "border border-border bg-card/60")
                    }
                  >
                    {p.pricingBadge && (
                      <span className={`mb-3 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${
                        isHighlight ? "bg-orange-500 text-white" : isBestValue ? "bg-emerald-100 text-emerald-800" : "bg-secondary/10 text-secondary"
                      }`}>
                        {p.pricingBadge}
                      </span>
                    )}
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{p.name}</p>
                    <p className="mt-1 text-3xl font-extrabold text-secondary">
                      {p.priceLabel}
                      {p.cadence && p.cadence !== "once" && (
                        <span className="ml-1 text-sm font-semibold text-muted-foreground">/{p.cadence}</span>
                      )}
                    </p>
                    <ul className="mt-4 space-y-1.5 text-sm text-secondary">
                      {p.homeBullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <Link
                href="/pricing"
                onClick={() => trackFunnel("cta_clicked", { cta: "see_all_plans", placement: "home_pricing" })}
                className="inline-flex items-center gap-2 text-sm font-extrabold text-primary"
              >
                Compare all 5 paths <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* COLLEGES TEASER */}
        <section className="py-12 sm:py-14" aria-labelledby="colleges-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-secondary p-8 text-secondary-foreground sm:p-12">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-200">🎓 For placement cells</p>
              <h2 id="colleges-title" className="mt-3 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl">
                Give every final-year student unlimited interview practice.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary-foreground/70 sm:text-base">
                Branded portal for your college, cohort analytics for the TPO, and mother-tongue support so no student is left behind.
                From <strong className="text-white">₹299/student/year</strong> for 200+ seats.
              </p>
              <Link
                href="/for-colleges"
                onClick={() => trackFunnel("cta_clicked", { cta: "colleges_teaser", placement: "home_colleges" })}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-secondary hover:bg-orange-50"
              >
                <Building2 className="h-4 w-4" /> Book a free 100-seat pilot
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 sm:py-14" aria-labelledby="faq-title">
          <div className="container mx-auto max-w-3xl px-5 sm:px-8">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">? Questions</p>
            <h2 id="faq-title" className="mt-3 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
              Everything you're wondering
            </h2>
            <dl className="mt-6 divide-y divide-border">
              {FAQS.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-secondary sm:text-base">
                    {f.q}
                    <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </dl>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-secondary py-12 text-secondary-foreground sm:py-14" aria-labelledby="final-title">
          <div className="container mx-auto max-w-3xl px-5 text-center sm:px-8">
            <Sparkles className="mx-auto h-5 w-5 text-orange-300" />
            <h2 id="final-title" className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              Be ready when your next opportunity comes.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-secondary-foreground/70 sm:text-base">
              Start with one real conversation. Find the right words. Build from there.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <PrimaryLink
                href="/english-guru"
                onClick={() => track("home_cta_clicked", { cta: "start_english_guru", placement: "final_cta" })}
              >
                🎙 Start 15 Free Minutes <ArrowRight className="h-4 w-4" />
              </PrimaryLink>
              <QuietLink
                href="/pricing"
                className="!bg-transparent !text-secondary-foreground/80 !border-secondary-foreground/20"
              >
                <GraduationCap className="h-4 w-4" /> See pricing
              </QuietLink>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
