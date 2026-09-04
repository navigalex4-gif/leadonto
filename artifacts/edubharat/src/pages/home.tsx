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
  Zap,
  Clock,
  Shield,
  Smartphone,
  Play,
  X,
  PhoneCall,
  Star,
  HelpCircle,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { TUTORS } from "@/lib/tutors";
import { HomeMeta } from "@/components/page-meta";
import { useContent } from "@/lib/use-content";
import { track, trackFunnel, withAcquisition } from "@/lib/analytics";
import { MobilePrimaryCTA } from "@/components/mobile-primary-cta";
import { PLANS, TESTIMONIALS } from "@/lib/plans";
import { INDIAN_LANGUAGES } from "@/lib/constants";

const PRODUCT_SHOWCASE = [
  {
    href: "/english-guru",
    name: "Office & Meetings",
    description: "Give a status update, disagree politely, ask for a deadline extension, present to a client on a video call.",
    icon: MessageCircle,
    iconClass: "bg-orange-100 text-orange-700",
    cardClass: "border-orange-200/70 bg-orange-50/60 hover:border-orange-400",
    linkClass: "text-orange-700",
  },
  {
    href: "/interview-ace",
    name: "Job Interviews",
    description: "Mock HR and technical rounds. 'Tell me about yourself', salary negotiation, and follow-up questions.",
    icon: Mic2,
    iconClass: "bg-blue-100 text-blue-700",
    cardClass: "border-blue-200/70 bg-blue-50/60 hover:border-blue-400",
    linkClass: "text-blue-700",
  },
  {
    href: "/english-guru",
    name: "Customer & BPO Calls",
    description: "Handle an angry customer, explain a refund policy, de-escalate — with accent clarity.",
    icon: PhoneCall,
    iconClass: "bg-violet-100 text-violet-700",
    cardClass: "border-violet-200/70 bg-violet-50/60 hover:border-violet-400",
    linkClass: "text-violet-700",
  },
  {
    href: "/english-guru",
    name: "IELTS & PTE Speaking",
    description: "Full examiner-format Part 1, 2 and 3 with band-wise feedback on fluency and pronunciation.",
    icon: GraduationCap,
    iconClass: "bg-teal-100 text-teal-700",
    cardClass: "border-teal-200/70 bg-teal-50/60 hover:border-teal-400",
    linkClass: "text-teal-700",
  },
  {
    href: "/tools-pro",
    name: "College & Campus",
    description: "Group discussions, viva, presentations, and placement-week interviews.",
    icon: Building2,
    iconClass: "bg-amber-100 text-amber-700",
    cardClass: "border-amber-200/70 bg-amber-50/60 hover:border-amber-400",
    linkClass: "text-amber-700",
  },
  {
    href: "/learning-journey",
    name: "Daily Conversation",
    description: "Small talk, social events, travel, and conversations where you are expected to have opinions.",
    icon: Route,
    iconClass: "bg-rose-100 text-rose-700",
    cardClass: "border-rose-200/70 bg-rose-50/60 hover:border-rose-400",
    linkClass: "text-rose-700",
  },
] as const;

const FAQS = [
  {
    q: "Is it really free? Do I need to give my card?",
    a: "Your first 15 minutes are free with no signup and no card — just tap Start and begin talking. Create a free account and you get 20 credits, enough for about 4 hours of live conversation. You only enter payment details if you decide to buy more credits.",
  },
  {
    q: "My English is very weak. Will I be able to use this?",
    a: "That is exactly who this is built for. You can speak entirely in Hindi (or Tamil, Telugu, Bengali and 9 others) and your AI coach will help you say it in English, one sentence at a time. Beginners usually start with 3-minute sessions.",
  },
  {
    q: "How is this different from a free AI chatbot?",
    a: "Three things. It is spoken, not typed — which is the skill you are actually missing. It switches to your mother tongue at the exact moment you get stuck instead of repeating itself in English. And it tracks a Fluency Score across sessions so you can see whether you are improving.",
  },
  {
    q: "Will it work on my phone and my data pack?",
    a: "Yes. It runs in your phone's browser — nothing to install. There is an audio-light mode built for patchy 3G, and a typical 12-minute session uses far less data than a video call.",
  },
  {
    q: "Can I practise for a specific job or interview?",
    a: "Yes. Choose your scenario — HR interview, technical round, customer call, team meeting, IELTS speaking and group discussion. Interview Ace has role-based mock interviews for HR, Software, Sales, BPO, Banking, and more.",
  },
  {
    q: "How do credits work?",
    a: "One credit is ₹1 and covers 12 minutes of live conversation. The minimum top-up is ₹10, credits never expire, and there is no subscription.",
  },
  {
    q: "Is my conversation private?",
    a: "Your sessions and account data are handled according to our Privacy Policy. Sessions are private to your account.",
  },
  {
    q: "What if it doesn't work for me?",
    a: "Start with 15 guest minutes before paying. If you buy credits, see our Refund Policy for eligibility.",
  },
] as const;

const PROBLEM_QUOTES = [
  {
    quote: "In the interview I understood everything. But when they asked me to introduce myself, I just repeated my name twice and stopped.",
    label: "the interview freeze",
  },
  {
    quote: "On team calls I keep my point ready in my head. By the time I am confident enough to say it, someone else has already said it.",
    label: "the meeting mute",
  },
  {
    quote: "I cannot practise with my friends — they will laugh. And I cannot afford an expensive spoken English course just to find out if it works.",
    label: "nowhere safe to fail",
  }
];

const HABIT_FEATURES = [
  {
    title: "Short practice that fits your day",
    desc: "Speak for three minutes or fifteen. Small sessions make it easier to return tomorrow.",
    icon: Clock,
  },
  {
    title: "Feedback you can act on",
    desc: "See what went well and what to practise next instead of finishing a session without direction.",
    icon: Shield,
  },
  {
    title: "Built for your phone",
    desc: "Open Lead Onto in your browser and practise without installing another heavy app.",
    icon: Smartphone,
  },
  {
    title: "Take your learning with you",
    desc: "Save useful conversations and export practice notes when you want to review them later.",
    icon: FileText,
  }
];


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
      href={withAcquisition(href)}
      onClick={onClick}
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#F97316] px-8 text-base font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-[#EA580C] hover:shadow-orange-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

function SecondaryLink({
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
      href={withAcquisition(href)}
      onClick={onClick}
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-indigo-200 bg-white/95 px-7 text-base font-extrabold text-indigo-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

function Testimonials() {
  const items = TESTIMONIALS.filter((t) => t.consent);
  if (items.length === 0) return null;
  return (
    <section className="bg-card py-10 sm:py-16" aria-labelledby="testimonials-title">
      <div className="container mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">Learner Stories</span>
        </div>
        <h2 id="testimonials-title" className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-secondary sm:text-4xl">
          From "I'll just email them" to speaking up.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.id} className="flex flex-col justify-between rounded-3xl border border-border bg-white p-6 shadow-sm">
              <div>
                <div className="flex gap-1 mb-4 text-orange-400">
                  <Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" />
                </div>
                <blockquote className="text-base leading-7 text-secondary">"{t.quote}"</blockquote>
              </div>
              <figcaption className="mt-8 flex items-center gap-4 border-t border-border pt-6">
                {t.photo ? (
                  <img src={t.photo} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                    {t.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-extrabold text-secondary">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
  const heroEyebrow = useContent(
    "home.hero.eyebrow",
    `IN हिंदी · தமிழ் · తెలుగు · বাংলা · मराठी + ${INDIAN_LANGUAGES.length - 5} MORE`,
  );
  
  const heroTitle = useContent(
    "home.hero.title",
    "Know the words but freeze when speaking? Find your flow in 10 seconds.",
  );
  
  const heroSubtitle = useContent(
    "home.hero.subheadline",
    "Practise real conversations with an AI teacher who switches to your mother tongue the second you get stuck — then brings you right back to English. No classes. No schedule. No judgement.",
  );
  const ctaPrimary = useContent("home.hero.startCta", "Start 15 Free Minutes");
  const ctaCheck = useContent("home.hero.checkCta", "Get My 90-Second Communication Score");
  
  const homePlans = PLANS.filter((p) => p.id === "free" || p.id === "credits");
  const heroTutor = TUTORS.find(t => t.id === "neha") || TUTORS[0]!;

  return (
    <>
      <HomeMeta />
      <div className="home-shell min-w-0 overflow-hidden bg-[#FFFDF9]">
        
        {/* HERO */}
        <section className="home-hero relative isolate overflow-hidden pb-12 pt-6 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-12" aria-labelledby="hero-title">
          <div className="pointer-events-none absolute -right-20 -top-32 -z-10 h-[34rem] w-[34rem] rounded-full bg-orange-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 top-8 -z-10 h-[30rem] w-[30rem] rounded-full bg-violet-500/20 blur-3xl" />
          
          <div className="container mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="home-reveal max-w-2xl">
              <p className="mb-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-orange-200 ring-1 ring-inset ring-white/20 backdrop-blur">
                {heroEyebrow}
              </p>
              <h1
                id="hero-title"
                className="text-[clamp(2.35rem,5vw,3.75rem)] font-extrabold leading-[1.03] tracking-[-0.04em] text-white"
              >
                {heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
                {heroSubtitle}
              </p>

              <ul className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3 text-xs font-bold text-white/90 sm:text-sm">
                <li className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2"><Check className="h-4 w-4 text-emerald-300" /> 15 minutes free</li>
                <li className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2"><Check className="h-4 w-4 text-emerald-300" /> No signup</li>
                <li className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2"><Check className="h-4 w-4 text-emerald-300" /> No card</li>
                <li className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2"><Zap className="h-4 w-4 text-emerald-300" /> Works on 3G</li>
              </ul>

              <div className="mt-10 hidden flex-col gap-4 sm:flex sm:flex-row">
                <PrimaryLink
                  href="/english-guru"
                  onClick={() => {
                    track("home_cta_clicked", { cta: "start_english_guru", placement: "hero_primary" });
                    trackFunnel("cta_clicked", { cta: "start_english_guru", placement: "hero_primary" });
                  }}
                  className="w-full sm:w-auto"
                >
                  {ctaPrimary}
                  <ArrowRight className="h-5 w-5" />
                </PrimaryLink>
                <SecondaryLink
                  href="/communication-check"
                  onClick={() => {
                    track("home_cta_clicked", { cta: "communication_score", placement: "hero_secondary" });
                    trackFunnel("cta_clicked", { cta: "communication_score", placement: "hero_secondary" });
                  }}
                  className="w-full sm:w-auto"
                >
                  <Mic2 className="h-5 w-5" />
                  {ctaCheck}
                </SecondaryLink>
              </div>
            </div>

            <div className="home-reveal relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
              <div className="absolute -top-12 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
                <div className="relative">
                  <span className="absolute -left-2 -top-2 flex h-6 items-center rounded-full bg-emerald-500 px-2 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm ring-2 ring-white">
                    <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span> Live
                  </span>
                  <img src={heroTutor.imageSrc} alt={heroTutor.name} className="h-28 w-28 rounded-full border-4 border-white object-cover object-top shadow-2xl" />
                </div>
                <div className="mt-2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-secondary shadow-sm backdrop-blur-sm">
                  {heroTutor.name}
                </div>
              </div>

              <div className="relative rounded-3xl border border-border bg-white/60 p-5 pt-24 shadow-2xl backdrop-blur-xl sm:p-6 sm:pt-24">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-2xl rounded-tl-sm bg-muted p-4 text-sm leading-relaxed text-secondary shadow-sm">
                      "Tell me about your last job. What did you do there?"
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="flex-1 rounded-2xl rounded-tr-sm bg-primary/10 p-4 text-sm leading-relaxed text-secondary shadow-sm ml-8">
                      "I was working in... uh... sorry, I don't know how to say it."
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-2xl rounded-tl-sm bg-emerald-50 border border-emerald-100 p-4 text-sm leading-relaxed text-emerald-900 shadow-sm">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                        <Languages className="h-3 w-3" /> Switched to Hindi
                      </div>
                      "Koi baat nahi! Aap kehna chahte ho <strong>I handled customer complaints.</strong> Bolo mere saath."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MOBILE PRIMARY CTA (in-flow, per-page) */}
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <MobilePrimaryCTA
            label="Start 15 Free Minutes"
            href={withAcquisition("/english-guru")}
            onClick={() => {
              track("home_cta_clicked", { cta: "start_english_guru", placement: "mobile_primary" });
              trackFunnel("cta_clicked", { cta: "start_english_guru", placement: "mobile_primary" });
            }}
          />
        </div>

        {/* TRUST BAR */}
        <section className="border-y border-border/50 bg-white py-10" aria-label="Trust metrics">
          <div className="container mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 text-center sm:grid-cols-4 sm:px-8">
            <div>
              <p className="text-3xl font-extrabold text-secondary">{INDIAN_LANGUAGES.length}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Indian Languages</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-secondary">0</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Signup Required</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-secondary">15</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Free Minutes</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-secondary">10s</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">To First Word</p>
            </div>
          </div>
        </section>

        {/* THE PROBLEM */}
        <section className="py-10 sm:py-16 bg-[#FFFDF9]">
          <div className="container mx-auto max-w-5xl px-5 sm:px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">Sound familiar?</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
                You know the words.<br/>Your mouth just... stops.
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Twelve years of English in school. You can read it, write it, understand every word in a movie. But the moment someone asks you a question out loud, your mind goes blank. That is not a vocabulary problem. It is a practice problem.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {PROBLEM_QUOTES.map((item, idx) => (
                <div key={idx} className="rounded-3xl border border-border bg-white p-8 shadow-sm">
                  <p className="text-sm leading-relaxed text-secondary mb-6">"{item.quote}"</p>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">— {item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-10 sm:py-16 bg-white border-y border-border/50">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
                Three taps to your first English conversation.
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3 relative">
                <div className="absolute left-[16.666%] right-[16.666%] top-12 -z-10 hidden h-0.5 bg-gradient-to-r from-transparent via-border to-transparent md:block" />
              <div className="text-center bg-white px-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-2xl font-extrabold text-orange-700 shadow-sm mb-6">1</div>
                <h3 className="text-xl font-extrabold text-secondary">Pick a teacher</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Neha Ma'am for pronunciation. Maya Ma'am for business English. Arjun Sir for interviews. Each one speaks English plus Indian languages.
                </p>
              </div>
              <div className="text-center bg-white px-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-extrabold text-blue-700 shadow-sm mb-6">2</div>
                <h3 className="text-xl font-extrabold text-secondary">Just start talking</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Press the mic and speak — in English, in Hindi, or a mix. No script to follow, no lesson to finish. It is a conversation, not a test.
                </p>
              </div>
              <div className="text-center bg-white px-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-extrabold text-emerald-700 shadow-sm mb-6">3</div>
                <h3 className="text-xl font-extrabold text-secondary">Get your score</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  After every session: what you said well, the exact words you stumbled on, and three sentences to practise tomorrow. Your score moves.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MOTHER TONGUE BRIDGE (Why people stay) */}
        <section className="py-10 sm:py-16 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 pointer-events-none" />
          <div className="container mx-auto max-w-6xl px-5 sm:px-8 relative z-10">
            <div className="max-w-3xl mb-16">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-blue-400">Why people stay</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Get a bridge back to English at the moment you get stuck.
              </h2>
              <p className="mt-6 text-lg text-slate-300">
                English-only practice can be hard to continue when you cannot find the next word. Lead Onto can switch to your mother tongue, help you form the sentence, and bring you back to English.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="rounded-3xl border border-slate-700 bg-slate-800/50 p-6 sm:p-8 backdrop-blur-sm opacity-60">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                  <X className="h-4 w-4" /> English-Only AI Apps
                </h3>
                <div className="space-y-4">
                  <div className="bg-slate-700/50 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-200">"Tell me about a challenge you faced at work."</div>
                  <div className="bg-blue-500/10 p-4 rounded-2xl rounded-tr-sm text-sm text-slate-200 ml-8">"I... it was... sorry, I don't know the word."</div>
                  <div className="bg-slate-700/50 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-200">"No problem! Tell me about a challenge you faced at work."</div>
                  <div className="p-4 text-sm font-semibold text-slate-400 ml-8 italic flex items-center gap-2">
                     User closes the app in frustration
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-orange-500/30 bg-slate-800/80 p-6 sm:p-8 shadow-2xl shadow-orange-500/10 backdrop-blur-sm relative">
                <div className="absolute -top-4 right-6 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                  Lead Onto
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-orange-400 mb-8 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" /> The Mother-Tongue Bridge
                </h3>
                <div className="space-y-4">
                  <div className="bg-slate-700/50 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-200">"Tell me about a challenge you faced at work."</div>
                  <div className="bg-blue-500/20 p-4 rounded-2xl rounded-tr-sm text-sm text-slate-200 ml-8">"I... it was... sorry, I don't know the word."</div>
                  <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl rounded-tl-sm text-sm text-orange-50">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-1.5">
                      <Languages className="h-3 w-3" /> AI Switches to Hindi
                    </div>
                    "Aap kehna chahte ho ki team mein coordination ki problem thi. English mein bolo: <strong>Our team had a coordination problem.</strong>"
                  </div>
                  <div className="bg-blue-500/20 p-4 rounded-2xl rounded-tr-sm text-sm text-slate-200 ml-8">"Our team had a coordination problem."</div>
                  <div className="bg-slate-700/50 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-200">"Exactly right. So how did you fix it?"</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TEACHERS */}
        <section className="py-10 sm:py-16 bg-white border-b border-border/50">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="text-center mb-8 max-w-2xl mx-auto">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">Your Teachers</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
                  Not just a chatbot. Choose the coach who fits your goal.
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                  Each AI coach has a different speciality, teaching style, and mix of Indian languages, so your practice feels relevant from the first conversation.
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TUTORS.slice(0, 6).map((tutor) => (
                <div key={tutor.id} className="group flex flex-col rounded-3xl border border-border bg-[#FFFDF9] p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center gap-4 mb-5">
                    <img src={tutor.imageSrc} alt={tutor.name} className="h-16 w-16 rounded-full object-cover object-top ring-2 ring-white shadow-sm" />
                    <div>
                      <h4 className="font-extrabold text-secondary text-lg">{tutor.name}</h4>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary mt-0.5">{tutor.role.replace(" Specialist", " Coach")}</p>
                    </div>
                  </div>
                  <div className="mb-4 inline-flex self-start rounded-full bg-muted px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Speaks {tutor.languages.slice(1).join(" + ")}
                  </div>
                  <p className="text-sm leading-relaxed text-secondary flex-1">"{tutor.intro}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section className="py-10 sm:py-16 bg-muted/20">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-2xl mb-12">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">What are you practising for?</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
                Real situations, not textbook chapters.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Every session is a rehearsal for something you will actually have to do.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCT_SHOWCASE.map(({ href, name, description, icon: Icon, iconClass, cardClass, linkClass }) => (
                <Link
                  key={name}
                  href={href}
                  className={`group flex min-h-[14rem] flex-col rounded-3xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg bg-white`}
                  onClick={() => trackFunnel("cta_clicked", { cta: `product_${name.toLowerCase().replace(/ /g, '_')}`, placement: "home_usecases" })}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl mb-5 ${iconClass}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-xl font-extrabold leading-tight tracking-tight text-secondary">{name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  <span className={`mt-auto inline-flex items-center gap-2 pt-6 text-sm font-extrabold ${linkClass}`}>
                    Practise {name} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* WHY IT STICKS (Habit) */}
        <section className="py-10 sm:py-16 bg-white border-t border-border/50">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">Why it sticks</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
                Five minutes a day beats a weekend course.
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Fluency is a muscle. It does not come from a 40-hour class you finish once — it comes from speaking a little, often, with useful feedback.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {HABIT_FEATURES.map((feature, idx) => (
                <div key={idx} className="text-center sm:text-left">
                  <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 mb-5">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-extrabold text-secondary mb-2">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="py-10 sm:py-16 bg-white" aria-labelledby="pricing-title">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-primary">Simple Pricing</p>
              <h2 id="pricing-title" className="text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
                Less than one cup of chai a day.
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Start free. Upgrade only when you can hear the difference in your own voice.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 max-w-4xl mx-auto">
              {homePlans.map((p) => {
                const isHighlight = !!p.highlight;
                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col rounded-3xl p-8 transition-transform hover:-translate-y-1 ${
                      isHighlight
                        ? "border-2 border-orange-500 bg-white shadow-xl shadow-orange-500/10 z-10 scale-100 md:scale-105"
                        : "border border-border bg-card/60"
                    }`}
                  >
                    {p.pricingBadge && (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest shadow-sm ${
                        isHighlight ? "bg-orange-500 text-white" : "bg-secondary text-white"
                      }`}>
                        {p.pricingBadge}
                      </span>
                    )}
                    <h3 className="text-xl font-extrabold text-secondary mt-2">{p.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground min-h-[2.5rem]">{p.tagline}</p>
                    <div className="my-6 border-b border-border/50 pb-6">
                      <p className="text-4xl font-extrabold text-secondary">
                        {p.priceLabel}
                        {p.cadence && p.cadence !== "once" && (
                          <span className="text-base font-semibold text-muted-foreground">/{p.cadence}</span>
                        )}
                      </p>
                    </div>
                    <ul className="mb-8 space-y-3 text-sm text-secondary flex-1">
                      {p.homeBullets.map((b) => (
                        <li key={b} className="flex items-start gap-3 leading-relaxed">
                          <Check className={`mt-0.5 h-5 w-5 shrink-0 ${isHighlight ? "text-orange-500" : "text-emerald-500"}`} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                       href={withAcquisition(p.ctaHref)}
                      onClick={() => trackFunnel("cta_clicked", { cta: `pricing_${p.id}`, placement: "home_pricing" })}
                      className={`inline-flex w-full min-h-12 items-center justify-center rounded-xl px-5 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        isHighlight
                          ? "bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500 shadow-md"
                          : "bg-secondary text-white hover:bg-secondary/90 focus-visible:ring-secondary"
                      }`}
                    >
                      {p.ctaLabel}
                    </Link>
                  </div>
                );
              })}
            </div>
            
            <p className="mt-12 text-center text-xs font-semibold text-muted-foreground max-w-2xl mx-auto">
              Credit top-ups start at ₹10 and never expire. See our Refund Policy for refund eligibility.
            </p>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <Testimonials />

        {/* FAQ */}
        <section className="py-10 sm:py-16 bg-[#FFFDF9] border-t border-border/50" aria-labelledby="faq-title">
          <div className="container mx-auto max-w-3xl px-5 sm:px-8">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <HelpCircle className="h-4 w-4" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]">Questions</span>
            </div>
            <h2 id="faq-title" className="text-3xl font-extrabold tracking-tight text-secondary sm:text-4xl">
              Everything you're wondering
            </h2>
            <dl className="mt-10 divide-y divide-border/60 border-t border-border/60">
              {FAQS.map((f) => (
                <details key={f.q} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-base font-bold text-secondary outline-none">
                    {f.q}
                    <span className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45 group-open:bg-primary/10 group-open:text-primary">
                      <X className="h-4 w-4 rotate-45" />
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground pr-10">{f.a}</p>
                </details>
              ))}
            </dl>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-slate-900 py-12 sm:py-20 text-white relative overflow-hidden text-center" aria-labelledby="final-title">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 pointer-events-none" />
          <div className="container mx-auto max-w-3xl px-5 sm:px-8 relative z-10">
            <h2 id="final-title" className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">
              Ready to hear yourself<br/>speak with confidence?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              No signup. No card. Start with a private AI practice session.<br/>The only way to stop freezing is to start speaking.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <PrimaryLink
                href="/english-guru"
                onClick={() => {
                  track("home_cta_clicked", { cta: "start_english_guru", placement: "footer" });
                  trackFunnel("cta_clicked", { cta: "start_english_guru", placement: "footer" });
                }}
                className="w-full sm:w-auto"
              >
                Start Speaking Free — 15 Minutes <ArrowRight className="h-5 w-5" />
              </PrimaryLink>
            </div>
            <p className="mt-6 text-xs font-semibold text-slate-400">
               Then top up from ₹10 only when you need more practice
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
