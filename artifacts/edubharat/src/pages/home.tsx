import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Newspaper, ArrowRight, Sparkles, CheckCircle2, Star,
  MessageCircle, Wrench, Map, Mic, FileText, TrendingUp, Building2, Timer, LogIn,
} from "lucide-react";
import { TUTORS } from "@/lib/tutors";
import { HomeMeta } from "@/components/page-meta";
import { useContent } from "@/lib/use-content";
import { track } from "@/lib/analytics";

const FEATURED_TUTORS = TUTORS.slice(0, 3);

const PROOF_POINTS = [
  "Native-language support — Hindi, Tamil, Telugu & 10 more",
  "Voice-powered practice — speak, listen, improve",
  "Live jobs personalised by experience & location",
  "CEFR English roadmap from A1 to C2",
];

const FLUENCY_TOOLS = [
  { icon: MessageCircle, title: "English Guru",  desc: "6 AI tutors · live conversation · 12+ Indian languages", href: "/english-guru"     },
  { icon: Wrench,         title: "Tools Pro",     desc: "Grammar Fix · Write Better · Vocabulary · Pronunciation", href: "/tools-pro"       },
  { icon: Map,            title: "My Journey",    desc: "CEFR roadmap A1→C2 · spaced repetition · mastery badges", href: "/learning-journey" },
];

const CAREER_TOOLS = [
  { icon: Mic,      title: "Interview Ace",    desc: "12 interview types · AI feedback · voice practice",        href: "/interview-ace"       },
  { icon: Newspaper,title: "Rozgar Samachar",  desc: "Live job feed · salary insights · career news from India", href: "/rozgar-samachar"     },
  { icon: FileText, title: "Resume",           desc: "ATS score · keyword gaps · 3 actionable improvements",     href: "/resume-intelligence"  },
];

export default function Home() {
  const heroBadge    = useContent("home.hero.badge",       "AI-powered career platform for India");
  const heroSubtitle = useContent("home.hero.subtitle",    "Lead Onto gives every Indian learner a personal AI mentor — for spoken English, mock interviews, and live career updates.");
  const ctaPrimary   = useContent("home.hero.ctaPrimary",  "Start Learning Free");
  const ctaSecondary = useContent("home.hero.ctaSecondary","Browse Jobs");

  return (
    <>
      <HomeMeta />
      <div className="flex flex-col w-full">

        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-background pt-5 pb-10 sm:pt-10 sm:pb-14 lg:pt-16 lg:pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-background to-blue-50 pointer-events-none" />
          <div className="container mx-auto px-4 relative">
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">

              {/* Left copy */}
              <div className="max-w-2xl animate-in slide-in-from-bottom-8 duration-700">

                {/* ── Mobile-only compact hero (fits in first viewport) ──────── */}
                <div className="md:hidden">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3 border border-primary/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{heroBadge}</span>
                  </div>
                  <h1 className="text-3xl font-display font-extrabold tracking-tight text-secondary mb-2.5 leading-[1.08]">
                    Master English.<br />
                    <span className="text-primary">Get the Job.</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Your personal AI mentor for spoken English, mock interviews and live Indian job updates.
                  </p>
                  {/* CTA row — sign-in always above the fold */}
                  <div className="flex flex-col gap-2 mb-4">
                    <Link href="/communication-check" className="w-full" onClick={() => track("home_cta_clicked", { cta: "communication_check", placement: "mobile_hero" })}>
                      <Button size="lg" className="h-12 w-full px-5 text-sm font-bold shadow-lg shadow-primary/20">
                        Try Free 90-Second Check
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/english-guru" className="w-full" onClick={() => track("home_cta_clicked", { cta: "start_learning", placement: "mobile_hero" })}>
                        <Button size="default" variant="outline" className="h-10 w-full text-sm font-semibold">
                          Start Learning
                        </Button>
                      </Link>
                      <Link href="/login" className="w-full" onClick={() => track("home_cta_clicked", { cta: "sign_in", placement: "mobile_hero" })}>
                        <Button size="default" variant="secondary" className="h-10 w-full text-sm font-semibold">
                          <LogIn className="w-3.5 h-3.5 mr-1.5" />
                          Sign In
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {/* Compact proof points */}
                  <ul className="grid grid-cols-1 gap-1.5 mb-3">
                    {PROOF_POINTS.slice(0, 3).map(p => (
                      <li key={p} className="flex items-center gap-2 text-xs text-secondary">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Link href="/rozgar-samachar" className="text-xs text-muted-foreground/75 hover:text-secondary">Browse Jobs</Link>
                    <Link href="/b2b/login" className="text-xs text-muted-foreground/65 hover:text-violet-700">B2B Portal →</Link>
                  </div>
                </div>

                {/* ── Desktop / tablet hero ──────────────────────────────────── */}
                <div className="hidden md:block">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-5 border border-primary/20">
                    <Sparkles className="w-4 h-4" />
                    <span>{heroBadge}</span>
                  </div>
                  <h1 className="max-w-xl text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-secondary mb-5 leading-[1.05]">
                    Master English.<br />
                    Ace Interviews.<br />
                    <span className="text-primary">Get the Job.</span>
                  </h1>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed max-w-xl">
                    {heroSubtitle}
                  </p>
                  <p className="max-w-xl border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed text-muted-foreground/90 mb-6">
                    "97% of HR decision-makers in India say English proficiency is more important today than it was five years ago, and 87% say the growing use of AI has increased the need for strong English skills." — ETS, TOEIC Global English Skills Report 2026
                  </p>
                  <ul className="space-y-2 mb-8">
                    {PROOF_POINTS.map(p => (
                      <li key={p} className="flex items-center gap-2 text-sm text-secondary">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/english-guru" onClick={() => track("home_cta_clicked", { cta: "start_learning", placement: "desktop_hero" })}>
                      <Button size="lg" className="h-12 px-7 text-base font-bold shadow-lg shadow-primary/20">
                        {ctaPrimary}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/rozgar-samachar">
                      <Button size="lg" variant="outline" className="h-12 px-7 text-base font-semibold">
                        {ctaSecondary}
                      </Button>
                    </Link>
                  </div>
                  <Link
                    href="/b2b/login"
                    className="inline-flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-violet-700 transition-colors group"
                  >
                    <Building2 className="w-4 h-4 group-hover:text-violet-600 transition-colors" />
                    Are you hiring?
                    <span className="font-semibold text-violet-600 group-hover:underline">Open B2B Portal →</span>
                  </Link>
                </div>
              </div>

              {/* Right — AI teacher showcase */}
              <div className="relative animate-in slide-in-from-right-8 duration-1000 delay-150">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-blue-100/60 rounded-[2.5rem] blur-3xl pointer-events-none" />
                <Link
                  href="/communication-check"
                  className="group relative mb-10 block overflow-hidden rounded-[1.75rem] border border-orange-200/80 bg-white/90 p-1 shadow-xl shadow-orange-200/30 transition-all hover:-translate-y-1 hover:border-orange-300 hover:shadow-2xl hover:shadow-orange-200/45 sm:mb-12"
                >
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-orange-400 via-amber-300 to-violet-500" />
                  <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-orange-50 via-amber-50/70 to-violet-50 p-4 sm:p-5">
                    <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-orange-200/35 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-300/50">
                        <Timer className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                         <div className="flex flex-wrap items-center gap-2">
                           <p className="text-xs font-extrabold uppercase tracking-wider text-orange-700">Free 90-Second Communication Check</p>
                         </div>
                        <h2 className="mt-1.5 text-base font-extrabold leading-snug text-secondary sm:text-lg">
                           How Strong Are Your Communication &amp; Confidence Skills?
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                           Get quick feedback on your communication, confidence &amp; interview skills.
                        </p>
                        <span className="mt-3 inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-orange-300/40 transition-transform group-hover:translate-x-1 sm:text-sm">
                           Try My Free 90-Second Check <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="relative rounded-[2rem] border bg-card shadow-2xl p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meet Your AI Teachers</p>
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1 text-yellow-500" />
                      AI-Powered
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {FEATURED_TUTORS.map(tutor => (
                      <Link key={tutor.id} href="/english-guru" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors border border-border/50 cursor-pointer">
                        <div className="relative">
                          <img
                            src={tutor.imageSrc} alt={tutor.name} width={64} height={64}
                            className="w-16 h-16 rounded-full object-cover object-top border-2 border-white shadow-md"
                            loading="lazy" decoding="async"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground text-[8px] font-extrabold rounded-full px-1 py-0.5 leading-none border border-white">AI</span>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-secondary leading-tight">{tutor.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{tutor.role}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">+ 3 more AI teachers — choose who teaches you</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { label: "Tutors",     value: "6 AI"  },
                      { label: "Languages",  value: "12+"   },
                      { label: "Job Sources",value: "Live"  },
                    ].map(card => (
                      <div key={card.label} className="rounded-xl border bg-muted/30 p-3 text-center">
                        <p className="text-xs font-bold text-secondary">{card.value}</p>
                        <p className="text-[10px] text-muted-foreground">{card.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Two Product Suites ──────────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl lg:text-4xl font-display font-bold text-secondary mb-4">
                Two focused suites. One platform.
              </h2>
              <p className="text-lg text-muted-foreground">
                Mastering English and growing your career — built for every Indian learner.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">

              {/* ── Fluency Suite ─────────────────────────── */}
              <div className="rounded-3xl border border-orange-200/70 bg-gradient-to-br from-orange-50 via-amber-50/50 to-background p-7 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200/60">
                      Fluency Suite
                    </span>
                  </div>
                  <h3 className="text-2xl font-display font-bold text-secondary leading-tight mb-2">
                    Speak English with confidence.<br />
                    <span className="text-orange-600">Learn in your own language.</span>
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Practice naturally with native-language support in Hindi, Tamil, Telugu and 10 more Indian languages.
                    Track your CEFR progress from A1 to C2 and build lasting fluency through daily habit.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {FLUENCY_TOOLS.map(({ icon: Icon, title, desc, href }) => (
                    <Link key={title} href={href} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-orange-100 hover:border-orange-200 transition-all group cursor-pointer">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-secondary">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>

                <Link href="/english-guru">
                  <Button className="w-full h-11 font-bold bg-orange-500 hover:bg-orange-600 text-white text-sm">
                    Start English Journey
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* ── Career Suite ──────────────────────────── */}
              <div className="rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background p-7 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200/60">
                      Career Suite
                    </span>
                  </div>
                  <h3 className="text-2xl font-display font-bold text-secondary leading-tight mb-2">
                    Get interview-ready.<br />
                    <span className="text-blue-600">Land the right job.</span>
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Everything personalised to your age, experience and location — from mock interview coaching
                    and AI feedback to live job feeds and resume optimisation for the Indian job market.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {CAREER_TOOLS.map(({ icon: Icon, title, desc, href }) => (
                    <Link key={title} href={href} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-blue-100 hover:border-blue-200 transition-all group cursor-pointer">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-secondary">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>

                <Link href="/interview-ace">
                  <Button className="w-full h-11 font-bold bg-blue-600 hover:bg-blue-700 text-white text-sm">
                    Start Interview Prep
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Teacher Gallery ──────────────────────────────────────────────── */}
        <section className="py-12 bg-background border-t">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-secondary mb-2">Your AI Teaching Team</h2>
              <p className="text-muted-foreground text-sm">Each teacher specialises in a different aspect of English and career development</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {TUTORS.map((tutor, idx) => (
                <Link key={tutor.id} href="/english-guru">
                  <div className="flex flex-col items-center gap-3 p-4 rounded-2xl border bg-card hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
                    <div className="relative">
                      <img
                        src={tutor.imageSrc} alt={tutor.name} width={80} height={80}
                        className="w-20 h-20 rounded-full object-cover object-top border-3 shadow-md group-hover:border-primary/60 transition-colors"
                        style={{ border: `3px solid ${tutor.accentColor}30` }}
                        loading={idx < 3 ? "eager" : "lazy"} decoding="async"
                      />
                      <span
                        className="absolute -bottom-1 -right-1 text-white text-[8px] font-extrabold rounded-full px-1.5 py-0.5 leading-none shadow-sm"
                        style={{ backgroundColor: tutor.accentColor }}
                      >AI</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-secondary leading-tight">{tutor.name}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{tutor.role}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/english-guru">
                <Button className="font-bold px-8">
                  Choose Your Teacher
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
