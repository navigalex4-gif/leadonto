import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  FileText,
  Globe2,
  Languages,
  MessageCircle,
  Mic2,
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
import { track, trackFunnel } from "@/lib/analytics";

const DIFFERENTIATORS = [
  {
    icon: MessageCircle,
    title: "Know What to Say",
    description: "Practise English for real conversations and professional moments.",
  },
  {
    icon: Target,
    title: "Use the Right Words",
    description: "Learn natural, modern expressions that fit the situation.",
  },
  {
    icon: Languages,
    title: "Learn in Your Language",
    description: "Get support in Hindi, Tamil, Telugu and other Indian languages.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Prepare for Your Role",
    description: "Practise interviews and communication situations for the role you want.",
  },
] as const;

const FLUENCY_TOOLS = [
  {
    icon: MessageCircle,
    title: "Real-World Conversation",
    description: "Practise situations, natural expressions and confidence through conversation.",
    href: "/english-guru",
  },
  {
    icon: Wrench,
    title: "Choose the Right Words",
    description: "Improve grammar, vocabulary, writing and pronunciation.",
    href: "/tools-pro",
  },
  {
    icon: Route,
    title: "See Your Progress",
    description: "Follow your A1→C2 journey and build useful daily habits.",
    href: "/learning-journey",
  },
];

const CAREER_TOOLS = [
  {
    icon: Mic2,
    title: "Role-Based Interview Practice",
    description: "Prepare for interviews tailored to your role and experience.",
    href: "/interview-ace",
  },
  {
    icon: Newspaper,
    title: "Find Your Next Opportunity",
    description: "Discover relevant jobs and career information for your location.",
    href: "/rozgar-samachar",
  },
  {
    icon: FileText,
    title: "Make Your Resume Work Harder",
    description: "Find ATS gaps and missing keywords for the roles you want.",
    href: "/resume-intelligence",
  },
];

const ROLE_EXAMPLES = ["Software Developer", "Sales Executive", "Customer Support", "Marketing", "HR", "Finance", "Fresh Graduate"];
const LANGUAGES = ["Hindi", "Tamil", "Telugu", "Marathi", "Bengali", "Kannada", "Gujarati"];

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

function QuietLink({ href, children, onClick, className = "" }: { href: string; children: React.ReactNode; onClick?: () => void; className?: string }) {
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

export default function Home() {
  const heroEyebrow = useContent("home.hero.eyebrow", "Show Up as Good as You Are.");
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
        <section className="relative isolate overflow-hidden bg-[#FFFDF9] pb-10 pt-8 sm:pb-14 sm:pt-12 lg:pb-16 lg:pt-14" aria-labelledby="hero-title">
          <div className="home-grid-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-50" />
          <div className="pointer-events-none absolute -right-40 top-10 -z-10 h-72 w-72 rounded-full bg-orange-100 blur-3xl" />
          <div className="container mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
            <div className="home-reveal max-w-2xl">
              <p className="mb-5 max-w-lg text-xs font-extrabold uppercase tracking-[0.14em] text-[#C2410C] sm:text-sm">{heroEyebrow}</p>
              <h1 id="hero-title" className="max-w-2xl text-[clamp(1.25rem,2.2vw,1.6rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#111827]">
                Know What to Say.
                <br />
                <span className="text-[#F97316]">Say It With Confidence.</span>
                <br />
                Be Ready for What’s Next.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#596273] sm:text-lg">{heroSubtitle}</p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <PrimaryLink href="/english-guru" onClick={() => track("home_cta_clicked", { cta: "start_learning", placement: "hero" })}>
                  {ctaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </PrimaryLink>
                <QuietLink href="/communication-check" onClick={() => trackFunnel("cta_clicked", { cta: "communication_check", placement: "hero" })}>
                  <Timer className="h-4 w-4 text-primary" />
                  {ctaSecondary}
                </QuietLink>
              </div>
              <p className="mt-3 text-xs font-semibold text-[#596273]">Start free. See where you stand. Build from there.</p>
            </div>

            <Link
              href="/communication-check"
              onClick={() => {
                track("home_cta_clicked", { cta: "communication_check", placement: "hero_visual" });
                trackFunnel("cta_clicked", { cta: "communication_check", placement: "hero_visual" });
              }}
              className="home-reveal group relative mx-auto block w-full max-w-md rounded-2xl border border-[#F97316]/35 bg-card p-5 shadow-[0_18px_55px_-30px_rgba(249,115,22,.42)] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-4 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">A clear next step</p>
                  <h2 className="mt-3 max-w-xs text-xl font-extrabold leading-tight tracking-tight text-[#111827] sm:text-2xl">Find out where you stand in 90 seconds.</h2>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F97316] text-white">
                  <Timer className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-7 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>A situation you know</span>
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] text-orange-700">PRACTISE</span>
                </div>
                <p className="mt-3 text-sm font-bold text-secondary">“Tell me about yourself.”</p>
                <div className="mt-3 h-2 rounded-full bg-orange-100"><div className="h-2 w-[62%] rounded-full bg-primary" /></div>
              </div>
              <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700"><BadgeCheck className="h-4 w-4" />A more natural way to say it</div>
                <p className="mt-2 text-sm font-semibold text-secondary">Clear, confident, and right for the role.</p>
              </div>
            </Link>
          </div>
        </section>

        <section className="border-y border-orange-200/70 bg-[#FFF8F0] py-7 sm:py-9" aria-labelledby="instant-practice-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#C2410C]">Try the part that helps today</p>
                <h2 id="instant-practice-title" className="text-xl font-extrabold tracking-tight text-[#111827] sm:text-2xl">Start with a real conversation or a real interview.</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#596273]">No long setup. Pick a coach, speak naturally, and get useful guidance as you go.</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/english-guru" className="group flex items-center gap-4 rounded-2xl border border-orange-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><MessageCircle className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-secondary">English Guru</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">Have a warm, unscripted English conversation in your own style.</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-orange-600 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/interview-ace" className="group flex items-center gap-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Mic2 className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-secondary">Interview Ace</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">Meet a role-matched interviewer who adapts to how you answer.</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-blue-600 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-orange-200/70 bg-gradient-to-br from-orange-50 via-amber-50 to-sky-50 py-9 text-secondary sm:py-11" aria-labelledby="opportunity-title">
          <div className="container mx-auto flex max-w-6xl flex-col gap-5 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700">Before the next chance arrives</p>
              <h2 id="opportunity-title" className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">The next opportunity won’t wait for you to feel ready.</h2>
              <p className="mt-2 text-sm leading-6 text-secondary/70">Start building the communication skills before the opportunity arrives.</p>
            </div>
            <PrimaryLink href="/interview-ace" className="self-start lg:self-center">Start Preparing Free <ArrowRight className="h-4 w-4" /></PrimaryLink>
          </div>
        </section>

        <section className="py-12 sm:py-14" aria-labelledby="different-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-xl">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Why Lead Onto</p>
              <h2 id="different-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">More Than English. More Than Interview Prep.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Communicate better in the situations that matter.</p>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DIFFERENTIATORS.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-2xl border border-border/80 bg-card/50 p-5 transition-colors hover:border-primary/30">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Icon className="h-4 w-4" /></div>
                  <h3 className="mt-5 text-base font-extrabold text-secondary">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/40 py-12 sm:py-14" aria-labelledby="suites-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-xl">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">How it works</p>
              <h2 id="suites-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">Two ways to get ready.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Build the communication you need now, then prepare for where you want to go next.</p>
            </div>
            <div className="mt-7 grid gap-4 lg:grid-cols-2">
              {[
                { title: "Speak Better in the Real World.", icon: BookOpen, color: "orange", tools: FLUENCY_TOOLS, href: "/english-guru", cta: "Start My English Journey" },
                { title: "Prepare for the Role You Want.", icon: TrendingUp, color: "blue", tools: CAREER_TOOLS, href: "/interview-ace", cta: "Prepare for My Next Role" },
              ].map(({ title, icon: Icon, color, tools, href, cta }) => (
                <article key={title} className={`rounded-2xl border p-5 sm:p-6 ${color === "orange" ? "border-orange-200/70 bg-orange-50/60" : "border-blue-200/70 bg-blue-50/60"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color === "orange" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}><Icon className="h-5 w-5" /></span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${color === "orange" ? "text-orange-700" : "text-blue-700"}`}>{color === "orange" ? "Fluency Suite" : "Career Suite"}</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold leading-tight tracking-tight text-secondary">{title}</h3>
                  <div className="mt-6 space-y-2">
                    {tools.map(({ icon: ToolIcon, title: toolTitle, description, href: toolHref }) => (
                      <Link key={toolTitle} href={toolHref} className="group flex items-start gap-3 rounded-xl bg-card/70 p-3 transition-colors hover:bg-card">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color === "orange" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}><ToolIcon className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-secondary">{toolTitle}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span>
                        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary" />
                      </Link>
                    ))}
                  </div>
                  <Link href={href} className={`mt-6 inline-flex items-center gap-2 text-sm font-extrabold ${color === "orange" ? "text-orange-700" : "text-blue-700"}`}>{cta}<ArrowRight className="h-4 w-4" /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-14" aria-labelledby="roles-title">
          <div className="container mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div>
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Made for your next role</p>
              <h2 id="roles-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">Your interview shouldn’t be generic.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Practise the questions, vocabulary and communication situations relevant to the role you’re targeting.</p>
              <div className="mt-6 flex flex-wrap gap-2">{ROLE_EXAMPLES.map((role) => <span key={role} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">{role}</span>)}</div>
              <QuietLink href="/interview-ace" className="mt-7">Explore role-based practice <ArrowRight className="h-4 w-4" /></QuietLink>
            </div>
            <div className="rounded-2xl border border-teal-200/70 bg-teal-50/60 p-6 sm:p-7">
              <div className="flex items-center gap-3 text-teal-700"><Globe2 className="h-5 w-5" /><span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">Support that meets you where you are</span></div>
              <h3 className="mt-5 text-xl font-extrabold leading-tight tracking-tight text-secondary sm:text-2xl">Think in Your Language. Speak with Confidence in English.</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Understand and practise with support in Hindi, Tamil, Telugu and other Indian languages.</p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{LANGUAGES.map((language) => <span key={language} className="rounded-lg border border-teal-200/70 bg-card/70 px-2 py-2 text-center text-xs font-bold text-teal-800">{language}</span>)}</div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/40 py-12 sm:py-14" aria-labelledby="coaches-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Practice with perspective</p>
                <h2 id="coaches-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">Meet Your English Coaches</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Choose the coach that matches what you want to improve.</p>
              </div>
              <Link href="/english-guru" className="inline-flex items-center gap-2 text-sm font-extrabold text-primary">Meet the full coaching team <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{TUTORS.map((tutor, index) => <Link key={tutor.id} href="/english-guru" className="group rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40"><img src={tutor.imageSrc} alt={tutor.name} width={80} height={80} loading={index < 3 ? "eager" : "lazy"} className="mx-auto aspect-square w-16 rounded-full object-cover object-top sm:w-20" /><p className="mt-3 text-xs font-extrabold leading-tight text-secondary">{tutor.name}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{tutor.role.replace("Pronunciation Specialist", "Pronunciation Coach")}</p></Link>)}</div>
          </div>
        </section>

        <section className="bg-secondary py-12 text-secondary-foreground sm:py-14" aria-labelledby="final-title">
          <div className="container mx-auto max-w-3xl px-5 text-center sm:px-8">
            <Sparkles className="mx-auto h-5 w-5 text-orange-300" />
            <h2 id="final-title" className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">Be ready when your next opportunity comes.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-secondary-foreground/70 sm:text-base">Start with one real situation. Find the right words. Build from there.</p>
            <PrimaryLink href="/english-guru" className="mt-7" onClick={() => track("home_cta_clicked", { cta: "start_learning", placement: "final_cta" })}>Start Free <ArrowRight className="h-4 w-4" /></PrimaryLink>
            <p className="mx-auto mt-5 max-w-2xl text-[10px] leading-4 text-secondary-foreground/45">
              97% of HR decision-makers in India say English proficiency is more important today than five years ago. 87% say AI is increasing the need for strong English skills. Source: ETS, TOEIC Global English Skills Report 2026.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}