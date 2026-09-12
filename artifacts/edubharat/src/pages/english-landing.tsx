import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Languages,
  MessageCircle,
  Mic2,
  Sparkles,
  Volume2,
} from "lucide-react";
import { PageMeta } from "@/components/page-meta";
import { TUTORS } from "@/lib/tutors";
import { INDIAN_LANGUAGES } from "@/lib/constants";
import { track, trackFunnel } from "@/lib/analytics";

const FEATURED_TUTORS = TUTORS.slice(0, 4);

function StartLink({
  children,
  href = "/english-guru/app",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        track("english_guru_cta_clicked", { placement: "landing" });
        trackFunnel("cta_clicked", { cta: "start_english_guru", placement: "english_guru_landing" });
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F97316] px-5 text-sm font-extrabold text-white shadow-md shadow-orange-200/40 transition-all hover:-translate-y-0.5 hover:bg-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

function QuietLink({
  children,
  href,
  className = "",
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold text-secondary transition-colors hover:border-secondary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

function TeacherCard({ tutor }: { tutor: (typeof FEATURED_TUTORS)[number] }) {
  return (
    <Link
      href="/english-guru/app"
      className="group rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={`Practise with ${tutor.name}`}
    >
      <div className="flex items-center gap-3">
        <img
          src={tutor.imageSrc}
          alt=""
          width={52}
          height={52}
          loading="lazy"
          className="h-13 w-13 rounded-2xl object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-secondary">{tutor.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{tutor.role}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tutor.languages.map((language) => (
          <span key={language} className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
            {language}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold text-orange-700 transition-colors group-hover:text-orange-800">
        Practise with {tutor.name.split(" ")[0]} <ArrowRight className="ml-1 inline h-3 w-3" />
      </p>
    </Link>
  );
}

export default function EnglishLanding() {
  const featuredTutor = TUTORS.find((tutor) => tutor.id === "priya") ?? TUTORS[0];

  return (
    <div className="english-landing-shell min-w-0 overflow-hidden">
      <PageMeta
        title="English Guru — Speak with Confidence"
        description="Practise spoken English with an AI coach that helps in Hindi, Tamil, Telugu, Bengali and other Indian languages when you get stuck."
        canonicalUrl="https://leadonto.com/english-guru"
      />

      <section className="relative isolate overflow-hidden bg-[#FFFDF9] pb-10 pt-8 sm:pb-14 sm:pt-12 lg:pb-16 lg:pt-14" aria-labelledby="english-guru-title">
        <div className="home-grid-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] opacity-50" />
        <div className="pointer-events-none absolute -right-40 top-10 -z-10 h-72 w-72 rounded-full bg-orange-100 blur-3xl" />
        <div className="container mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C2410C]">
              🇮🇳 Hindi · Tamil · Telugu · Bengali · Marathi + 8 more
            </p>
            <h1 id="english-guru-title" className="max-w-xl text-[clamp(1.75rem,4vw,2.7rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#111827]">
              Stop freezing in English. Start speaking in <span className="text-[#C2410C]">10 seconds.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#596273] sm:text-lg">
              Practise real conversations with an AI teacher who switches to your mother tongue the second you get stuck — then brings you right back to English.
            </p>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#596273]" aria-label="English Guru benefits">
              <li className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />15 minutes free</li>
              <li className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />No signup</li>
              <li className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />No judgement</li>
              <li className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />Works on 3G</li>
            </ul>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <StartLink>
                <Mic2 className="h-4 w-4" />
                Start speaking free
                <ArrowRight className="h-4 w-4" />
              </StartLink>
              <QuietLink href="/">
                <ArrowRight className="h-4 w-4 rotate-180 text-primary" />
                Back to home
              </QuietLink>
            </div>
            <p className="mt-3 text-xs font-semibold text-[#596273]">No classes. No schedule. Just a safe place to practise.</p>
          </div>

          <div className="mx-auto w-full max-w-md rounded-2xl border border-[#F97316]/35 bg-card p-5 shadow-[0_18px_55px_-30px_rgba(249,115,22,.42)] sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div className="flex items-center gap-3">
                <img src={featuredTutor.imageSrc} alt="" width={48} height={48} className="h-12 w-12 rounded-2xl object-cover" />
                <div>
                  <p className="text-sm font-extrabold text-secondary">{featuredTutor.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{featuredTutor.role}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> LIVE
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-orange-700">AI coach</p>
                <p className="mt-1 text-sm text-secondary">“Tell me about your last job. What did you do there?”</p>
              </div>
              <div className="ml-8 rounded-xl border border-secondary bg-secondary p-3 text-white">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60">You</p>
                <p className="mt-1 text-sm">“I was working in… sorry, I don’t know how to say it.”</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">AI coach · helps in Hindi</p>
                <p className="mt-1 text-sm text-secondary">“Aap kehna chahte ho: <strong>Our team had a coordination problem.</strong> Bolo mere saath.”</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-orange-700">
                <BadgeCheck className="h-4 w-4" /> Speaks your language
              </span>
              <StartLink className="min-h-8 px-3 py-1 text-xs shadow-none">Try it free</StartLink>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-orange-200/70 bg-[#FFF8F0] py-6 sm:py-8" aria-label="English Guru highlights">
        <div className="container mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 text-center sm:grid-cols-4 sm:px-8">
          <div><p className="text-2xl font-extrabold text-secondary">{INDIAN_LANGUAGES.length}+</p><p className="text-xs text-muted-foreground">Indian languages supported</p></div>
          <div><p className="text-2xl font-extrabold text-secondary">10 sec</p><p className="text-xs text-muted-foreground">To your first prompt</p></div>
          <div><p className="text-2xl font-extrabold text-secondary">Spoken</p><p className="text-xs text-muted-foreground">Practice, not worksheets</p></div>
          <div><p className="text-2xl font-extrabold text-secondary">3G</p><p className="text-xs text-muted-foreground">Audio-light on mobile</p></div>
        </div>
      </section>

      <section className="bg-background py-8 sm:py-12" aria-labelledby="how-it-works-title">
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Three taps to your first conversation</p>
            <h2 id="how-it-works-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">Speak first. Get help. Try again.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">It is a conversation, not a test — built for the exact moment your confidence gets stuck.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: MessageCircle, title: "Just start talking", text: "Speak about your work, goals, interviews or everyday life — in English, your language, or a mix." },
              { icon: Languages, title: "Get a bridge, not a lecture", text: "When you get stuck, your coach explains the idea in a language you understand." },
              { icon: Volume2, title: "Say the next sentence", text: "Hear a clear English version, say it back, and keep the conversation moving." },
            ].map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="rounded-2xl border border-border bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Icon className="h-5 w-5" /></span>
                  <span className="text-xs font-extrabold text-primary">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-base font-extrabold text-secondary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/70 bg-card/40 py-8 sm:py-12" aria-labelledby="teachers-title">
        <div className="container mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Your English coaches</p>
              <h2 id="teachers-title" className="text-2xl font-extrabold leading-tight tracking-tight text-secondary sm:text-3xl">Choose the voice that suits you.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Every coach has a clear specialty and an Indian English voice. Switch anytime as your goals change.</p>
            </div>
            <Link href="/english-guru/app" className="text-sm font-extrabold text-orange-700 hover:text-orange-800">See all coaches <ArrowRight className="ml-1 inline h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_TUTORS.map((tutor) => <TeacherCard key={tutor.id} tutor={tutor} />)}
          </div>
        </div>
      </section>

      <section className="bg-[#FFFDF9] py-8 sm:py-12" aria-labelledby="english-guru-final-title">
        <div className="container mx-auto max-w-3xl px-5 text-center sm:px-8">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <h2 id="english-guru-final-title" className="mt-3 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">Your next English conversation starts in 10 seconds.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">No signup. No card. No one listening but your teacher. The only way past the freeze is to start speaking.</p>
          <StartLink className="mt-6">Start speaking free <ArrowRight className="h-4 w-4" /></StartLink>
        </div>
      </section>
    </div>
  );
}