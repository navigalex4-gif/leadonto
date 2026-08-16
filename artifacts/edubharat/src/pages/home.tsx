import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  Globe2,
  Languages,
  MessageCircle,
  Mic2,
  MoveUpRight,
  Newspaper,
  Route,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { TUTORS } from "@/lib/tutors";
import { HomeMeta } from "@/components/page-meta";
import { useContent } from "@/lib/use-content";
import { track } from "@/lib/analytics";

const DIFFERENTIATORS = [
  {
    icon: MessageCircle,
    number: "01",
    title: "Know What to Say",
    description: "Practise English for real conversations, everyday situations and professional moments.",
    accent: "orange",
  },
  {
    icon: Target,
    number: "02",
    title: "Use the Right Words",
    description: "Learn natural, modern and context-appropriate expressions — not textbook English alone.",
    accent: "blue",
  },
  {
    icon: Languages,
    number: "03",
    title: "Learn in Your Language",
    description: "Understand concepts with support in Hindi, Tamil, Telugu and other Indian languages.",
    accent: "teal",
  },
  {
    icon: BriefcaseBusiness,
    number: "04",
    title: "Prepare for Your Role",
    description: "Practise interviews and communication situations tailored to the role you want.",
    accent: "violet",
  },
] as const;

const FLUENCY_TOOLS = [
  {
    icon: MessageCircle,
    index: "01",
    title: "Real-World Conversation",
    description: "Practise real situations, discover natural expressions, and build confidence through conversation.",
    href: "/english-guru",
  },
  {
    icon: Wrench,
    index: "02",
    title: "Choose the Right Words",
    description: "Improve grammar, vocabulary, writing and pronunciation so you can communicate naturally.",
    href: "/tools-pro",
  },
  {
    icon: Route,
    index: "03",
    title: "See Your Progress",
    description: "Follow your A1→C2 journey, build daily habits and turn practice into measurable progress.",
    href: "/learning-journey",
  },
];

const CAREER_TOOLS = [
  {
    icon: Mic2,
    index: "01",
    title: "Role-Based Interview Practice",
    description: "Prepare for interviews tailored to your target role, experience and communication needs.",
    href: "/interview-ace",
  },
  {
    icon: Newspaper,
    index: "02",
    title: "Find Your Next Opportunity",
    description: "Discover relevant jobs, salary insights and career information based on experience and location.",
    href: "/rozgar-samachar",
  },
  {
    icon: FileText,
    index: "03",
    title: "Make Your Resume Work Harder",
    description: "Find ATS gaps, identify missing keywords and improve your resume for the roles you want.",
    href: "/resume-intelligence",
  },
];

const ROLE_EXAMPLES = [
  "Software Developer",
  "Sales Executive",
  "Customer Support",
  "Marketing",
  "HR",
  "Finance",
  "Fresh Graduate",
];

const LANGUAGE_EXAMPLES = ["Hindi", "Tamil", "Telugu", "Marathi", "Bengali", "Kannada", "Gujarati"];

const ACCENT_STYLES = {
  orange: {
    icon: "bg-orange-100 text-orange-700",
    number: "text-orange-500",
    line: "bg-orange-400",
  },
  blue: {
    icon: "bg-blue-100 text-blue-700",
    number: "text-blue-500",
    line: "bg-blue-400",
  },
  teal: {
    icon: "bg-teal-100 text-teal-700",
    number: "text-teal-500",
    line: "bg-teal-400",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    number: "text-violet-500",
    line: "bg-violet-400",
  },
} as const;

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
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground shadow-lg shadow-orange-200/50 transition-all hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
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
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/70 px-6 text-sm font-bold text-secondary transition-all hover:-translate-y-0.5 hover:border-secondary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

export default function Home() {
  const heroEyebrow = useContent(
    "home.hero.eyebrow",
    "Your next opportunity starts with how you communicate.",
  );
  const heroSubtitle = useContent(
    "home.hero.subheadline",
    "Real-world English, the right words for every situation, local-language support, and role-based interview practice — built to help you seize your next opportunity.",
  );
  const ctaPrimary = useContent("home.hero.startCta", "Start Free");
  const ctaSecondary = useContent("home.hero.checkCta", "Take the 90-Second Check");

  return (
    <>
      <HomeMeta />
      <div className="home-shell min-w-0 overflow-hidden">
        {/* Hero: promise first, product proof second. */}
        <section className="relative isolate overflow-hidden pb-20 pt-12 sm:pb-28 sm:pt-20 lg:pb-32 lg:pt-24" aria-labelledby="hero-title">
          <div className="home-grid-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] opacity-60" />
          <div className="pointer-events-none absolute -right-40 top-12 -z-10 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 top-80 -z-10 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="container mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.03fr_.97fr] lg:gap-16">
            <div className="home-reveal max-w-3xl">
              <p className="mb-7 max-w-xl text-sm font-extrabold uppercase tracking-[0.16em] text-primary sm:text-base">
                {heroEyebrow}
              </p>
              <h1 id="hero-title" className="max-w-3xl text-[clamp(2.7rem,7vw,5.65rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-secondary">
                Know What to Say.
                <br />
                <span className="text-primary">Know How to Say It.</span>
                <br />
                Be Ready for What’s Next.
              </h1>
              <p className="mt-8 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                {heroSubtitle}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <PrimaryLink
                  href="/english-guru"
                  onClick={() => track("home_cta_clicked", { cta: "start_learning", placement: "hero" })}
                >
                  {ctaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </PrimaryLink>
                <QuietLink
                  href="/communication-check"
                  onClick={() => track("home_cta_clicked", { cta: "communication_check", placement: "hero" })}
                >
                  <Timer className="h-4 w-4 text-primary" />
                  {ctaSecondary}
                </QuietLink>
              </div>
              <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground">
                Start free. See where you stand. Build from there.
              </p>
            </div>

            <div className="home-reveal relative mx-auto w-full max-w-[31rem] [animation-delay:120ms]">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-orange-100/60 blur-2xl" />
              <Link
                href="/communication-check"
                onClick={() => track("home_cta_clicked", { cta: "communication_check", placement: "hero_visual" })}
                className="group relative block overflow-hidden rounded-[2rem] border border-orange-200/80 bg-card p-2 shadow-[0_24px_70px_-28px_rgba(198,112,32,.5)] transition-transform duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
              >
                <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-orange-50 via-amber-50/70 to-blue-50/70 p-5 sm:p-7">
                  <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full border-[26px] border-orange-200/35" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-700">Start with a clear next step</p>
                      <h2 className="mt-3 max-w-xs text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">
                        Find out where you stand in 90 seconds.
                      </h2>
                    </div>
                    <div className="home-drift flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-orange-300/50">
                      <Timer className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="relative mt-8 space-y-3">
                    <div className="rounded-2xl border border-orange-200/80 bg-card/80 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-muted-foreground">A situation you know</span>
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-extrabold text-orange-700">PRACTISE</span>
                      </div>
                      <p className="mt-3 text-sm font-bold leading-6 text-secondary">“Tell me about yourself.”</p>
                      <div className="mt-3 h-2 rounded-full bg-orange-100">
                        <div className="h-2 w-[62%] rounded-full bg-primary" />
                      </div>
                    </div>
                    <div className="ml-8 rounded-2xl border border-blue-200/80 bg-card/85 p-4 shadow-sm transition-transform duration-300 group-hover:translate-x-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                        <BadgeCheck className="h-4 w-4" />
                        A more natural way to say it
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-secondary">Clear, confident, and right for the role.</p>
                    </div>
                  </div>
                  <div className="relative mt-6 flex items-center justify-between border-t border-secondary/10 pt-4">
                    <span className="text-xs font-semibold text-muted-foreground">Communication, confidence, interview readiness</span>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Ethical urgency: the cost of waiting, not fabricated scarcity. */}
        <section className="border-y border-secondary/10 bg-secondary py-16 text-secondary-foreground sm:py-20" aria-labelledby="opportunity-title">
          <div className="container mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-300">Before the next chance arrives</p>
              <h2 id="opportunity-title" className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                The next opportunity won’t wait for you to feel ready.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-secondary-foreground/70 sm:text-lg">
                A better interview. A new job. A promotion. A client conversation. A chance to move ahead. Start building the communication skills before the opportunity arrives.
              </p>
            </div>
            <PrimaryLink href="/interview-ace" className="shrink-0 self-start lg:self-end">
              Start Preparing Free
              <ArrowRight className="h-4 w-4" />
            </PrimaryLink>
          </div>
        </section>

        {/* Four differentiators. */}
        <section className="py-20 sm:py-28" aria-labelledby="different-title">
          <div className="container mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Why Lead Onto</p>
              <h2 id="different-title" className="text-3xl font-extrabold leading-tight tracking-tight text-secondary sm:text-5xl">
                More Than English. More Than Interview Prep.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
                Lead Onto helps you communicate better in the situations that matter.
              </p>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DIFFERENTIATORS.map(({ icon: Icon, number, title, description, accent }) => {
                const styles = ACCENT_STYLES[accent];
                return (
                  <article key={title} className="group relative min-h-[18rem] overflow-hidden rounded-3xl border border-border/80 bg-card/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-secondary/20 hover:shadow-xl hover:shadow-secondary/5">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.icon}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`mt-8 block text-xs font-extrabold tracking-[0.18em] ${styles.number}`}>{number}</span>
                    <h3 className="mt-3 text-xl font-extrabold tracking-tight text-secondary">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                    <div className={`absolute bottom-0 left-0 h-1 w-0 ${styles.line} transition-all duration-300 group-hover:w-full`} />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Communication check conversion block. */}
        <section className="pb-20 sm:pb-28" aria-labelledby="check-title">
          <div className="container mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid overflow-hidden rounded-[2rem] border border-orange-200/80 bg-gradient-to-br from-orange-50 via-amber-50/65 to-blue-50/80 lg:grid-cols-[1.15fr_.85fr]">
              <div className="p-7 sm:p-12 lg:p-16">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">A useful first step</p>
                <h2 id="check-title" className="mt-5 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-secondary sm:text-5xl">
                  Find Out Where You Stand in 90 Seconds.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Discover your communication, confidence and interview-readiness gaps — and know what to work on next.
                </p>
                <PrimaryLink
                  href="/communication-check"
                  className="mt-8"
                  onClick={() => track("home_cta_clicked", { cta: "communication_check", placement: "check_section" })}
                >
                  Take My Free 90-Second Check
                  <ArrowRight className="h-4 w-4" />
                </PrimaryLink>
                <p className="mt-4 text-xs font-semibold text-muted-foreground">No payment. No long assessment. Just 90 seconds.</p>
              </div>
              <div className="relative flex min-h-[19rem] items-center justify-center overflow-hidden border-t border-orange-200/70 bg-card/45 p-7 lg:border-l lg:border-t-0">
                <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(hsl(29_100%_60%/.22)_1px,transparent_1px)] [background-size:18px_18px]" />
                <div className="relative w-full max-w-xs space-y-3">
                  {["Communication", "Confidence", "Interview readiness"].map((label, index) => (
                    <div key={label} className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-bold text-secondary">
                        <span>{label}</span>
                        <span className="text-muted-foreground">{index === 0 ? "01" : index === 1 ? "02" : "03"}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted">
                        <div className={`h-2 rounded-full bg-primary ${index === 0 ? "w-[72%]" : index === 1 ? "w-[48%]" : "w-[61%]"}`} />
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-center text-xs font-bold text-orange-700">A clearer plan starts here.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product suites: one practice suite, one opportunity suite. */}
        <section className="border-y border-border/70 bg-card/45 py-20 sm:py-28" aria-labelledby="suites-title">
          <div className="container mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">How it works</p>
              <h2 id="suites-title" className="text-3xl font-extrabold leading-tight tracking-tight text-secondary sm:text-5xl">Two ways to get ready.</h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">Build the communication you need now, then prepare for where you want to go next.</p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
              <article className="rounded-[2rem] border border-orange-200/80 bg-gradient-to-br from-orange-50/90 via-amber-50/60 to-card p-7 shadow-sm sm:p-9">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700"><BookOpen className="h-5 w-5" /></div>
                  <span className="rounded-full border border-orange-200 bg-orange-100/70 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-orange-700">Fluency Suite</span>
                </div>
                <h3 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight text-secondary sm:text-4xl">Speak Better in the Real World.</h3>
                <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                  Build confidence through practical conversations, real situations and the right words for the moment — with support in the language you understand best.
                </p>
                <div className="mt-8 space-y-3">
                  {FLUENCY_TOOLS.map(({ icon: Icon, index, title, description, href }) => (
                    <Link key={title} href={href} className="group flex items-start gap-3 rounded-2xl border border-orange-100 bg-card/75 p-4 transition-colors hover:border-orange-300 hover:bg-card">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-extrabold text-secondary"><span className="text-[10px] text-orange-500">{index}</span>{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-orange-600" />
                    </Link>
                  ))}
                </div>
                <Link href="/english-guru" className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-orange-700 hover:text-orange-800">
                  Start My English Journey <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="rounded-[2rem] border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-card p-7 shadow-sm sm:p-9">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><TrendingUp className="h-5 w-5" /></div>
                  <span className="rounded-full border border-blue-200 bg-blue-100/70 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-700">Career Suite</span>
                </div>
                <h3 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight text-secondary sm:text-4xl">Prepare for the Role You Want.</h3>
                <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">Don’t practise a generic interview. Practise yours.</p>
                <div className="mt-8 space-y-3">
                  {CAREER_TOOLS.map(({ icon: Icon, index, title, description, href }) => (
                    <Link key={title} href={href} className="group flex items-start gap-3 rounded-2xl border border-blue-100 bg-card/75 p-4 transition-colors hover:border-blue-300 hover:bg-card">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-extrabold text-secondary"><span className="text-[10px] text-blue-500">{index}</span>{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                    </Link>
                  ))}
                </div>
                <Link href="/interview-ace" className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-800">
                  Prepare for My Next Role <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* Roles and language support show who the product is for. */}
        <section className="py-20 sm:py-28" aria-labelledby="roles-title">
          <div className="container mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:gap-20">
            <div>
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Made for your next role</p>
              <h2 id="roles-title" className="text-3xl font-extrabold leading-tight tracking-tight text-secondary sm:text-5xl">Your interview shouldn’t be generic.</h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
                Practise the questions, vocabulary and communication situations relevant to the role you’re targeting.
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {ROLE_EXAMPLES.map((role) => (
                  <span key={role} className="rounded-full border border-blue-200/80 bg-blue-50/70 px-3.5 py-2 text-xs font-bold text-blue-800">{role}</span>
                ))}
              </div>
              <Link href="/interview-ace" className="mt-9 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-blue-800">
                Explore role-based practice <MoveUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative rounded-[2rem] border border-teal-200/80 bg-gradient-to-br from-teal-50 to-card p-7 sm:p-10">
              <div className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700"><Globe2 className="h-5 w-5" /></div>
              <p className="pr-16 text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">Support that meets you where you are</p>
              <h3 className="mt-8 max-w-md text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-4xl">Think in Your Language. Speak with Confidence in English.</h3>
              <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                Understand and practise with support in Hindi, Tamil, Telugu and other supported Indian languages — then build the confidence to express yourself naturally in English.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {LANGUAGE_EXAMPLES.map((language) => (
                  <span key={language} className="rounded-xl border border-teal-200/70 bg-card/75 px-3 py-3 text-center text-xs font-extrabold text-teal-800">{language}</span>
                ))}
              </div>
              <p className="mt-5 text-xs font-bold text-teal-700">12+ Indian languages supported across the experience</p>
            </div>
          </div>
        </section>

        {/* Proof through people and product-supported signals. */}
        <section className="border-y border-border/70 bg-card/45 py-20 sm:py-28" aria-labelledby="coaches-title">
          <div className="container mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Practice with perspective</p>
                <h2 id="coaches-title" className="text-3xl font-extrabold leading-tight tracking-tight text-secondary sm:text-5xl">Meet Your English Coaches</h2>
                <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">Different situations need different communication skills. Choose the coach that matches what you want to improve.</p>
              </div>
              <Link href="/english-guru" className="inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:text-orange-700">Meet the full coaching team <ArrowRight className="h-4 w-4" /></Link>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
              {TUTORS.map((tutor, index) => (
                <Link key={tutor.id} href="/english-guru" className="group rounded-2xl border border-border/80 bg-card p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-orange-100/50 sm:p-4">
                  <img
                    src={tutor.imageSrc}
                    alt={tutor.name}
                    width={96}
                    height={96}
                    loading={index < 3 ? "eager" : "lazy"}
                    decoding="async"
                    className="mx-auto aspect-square w-20 rounded-full object-cover object-top shadow-md ring-4 ring-background transition-transform duration-300 group-hover:scale-105 sm:w-24"
                  />
                  <p className="mt-4 text-sm font-extrabold leading-tight text-secondary">{tutor.name}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{tutor.role.replace("Pronunciation Specialist", "Pronunciation Coach")}</p>
                </Link>
              ))}
            </div>

            <div className="mt-12 grid gap-3 border-t border-border/70 pt-8 sm:grid-cols-3">
              {[
                { value: "6", label: "English coaches", icon: BadgeCheck },
                { value: "12+", label: "Indian languages", icon: Languages },
                { value: "Live", label: "Job opportunities", icon: TrendingUp },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-background/70 px-4 py-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <span><span className="block text-lg font-extrabold tracking-tight text-secondary">{value}</span><span className="block text-xs font-semibold text-muted-foreground">{label}</span></span>
                </div>
              ))}
            </div>
            <p className="mt-7 text-center text-xs font-semibold text-muted-foreground">More coaches for the way you want to learn.</p>
          </div>
        </section>

        {/* Final free-start invitation. */}
        <section className="relative overflow-hidden bg-secondary py-20 text-secondary-foreground sm:py-28" aria-labelledby="final-title">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border-[42px] border-orange-300/10" />
          <div className="pointer-events-none absolute -bottom-44 left-1/4 h-96 w-96 rounded-full border-[50px] border-blue-300/10" />
          <div className="container relative mx-auto max-w-4xl px-5 text-center sm:px-8">
            <Sparkles className="mx-auto h-6 w-6 text-orange-300" />
            <h2 id="final-title" className="mt-6 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Be ready when your next opportunity comes.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-secondary-foreground/70 sm:text-lg">Start with one real situation. Find the right words. Build from there.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryLink href="/english-guru" onClick={() => track("home_cta_clicked", { cta: "start_learning", placement: "final_cta" })}>
                Start Free
                <ArrowRight className="h-4 w-4" />
              </PrimaryLink>
              <QuietLink href="/communication-check" className="border-secondary-foreground/20 bg-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/15">
                Take the 90-Second Check
                <Timer className="h-4 w-4 text-orange-300" />
              </QuietLink>
            </div>
            <p className="mt-5 text-xs font-semibold text-secondary-foreground/55">Start free. See where you stand. Build from there.</p>
          </div>
        </section>
      </div>
    </>
  );
}