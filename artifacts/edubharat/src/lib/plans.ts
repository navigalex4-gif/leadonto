// Single source of truth for consumer pricing.
// Used by /pricing (src/pages/pricing.tsx) and the home pricing teaser
// (src/pages/home.tsx). Never hard-code prices in two places.
//
// This file intentionally does not touch the credits API (src/lib/use-credits.ts).
// Credits stay as the "pay-as-you-go" bolt-on at 1 credit = ₹1. Subscriptions
// are surfaced here for the frontend; the backend recurring-payments route is
// tracked as P1 work (see the README that ships with this file).

export type PlanId = "free" | "practice" | "career" | "sprint" | "credits";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  cadence?: "mo" | "yr" | "once";
  tagline: string;
  ctaLabel: string;
  /** Where the CTA sends the user. Uses existing routes only. */
  ctaHref: string;
  /** Whether to include this card on the homepage teaser (3 cards max). */
  showOnHome: boolean;
  /** Short bullets used on the homepage teaser. */
  homeBullets: string[];
  /** Full bullets used on the /pricing page. */
  fullBullets: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "₹0",
    tagline: "Start without paying.",
    ctaLabel: "Start Free",
    ctaHref: "/english-guru",
    showOnHome: true,
    homeBullets: [
      "15 min guest practice — no signup",
      "2 free mock interviews as guest",
      "20 credits on signup",
    ],
    fullBullets: [
      "15 minutes of live English Guru conversation as a guest",
      "2 AI mock interviews as a guest (no card)",
      "20 credits (≈ 4 hours) when you create a free account",
      "Free forever: lessons, grammar, writing, jobs, news",
    ],
  },
  {
    id: "practice",
    name: "Practice",
    priceLabel: "₹199",
    cadence: "mo",
    tagline: "For daily English practice.",
    ctaLabel: "Start Practice",
    ctaHref: "/credits?plan=practice",
    highlight: true,
    showOnHome: true,
    homeBullets: [
      "Unlimited English Guru sessions",
      "8 mock interviews / month",
      "Fluency Score + Mistake Book",
    ],
    fullBullets: [
      "Unlimited English Guru live conversations",
      "8 role-based mock interviews / month",
      "Fluency Score across A1 → C2",
      "Mistake Book with spaced repetition",
      "Cancel anytime",
    ],
  },
  {
    id: "career",
    name: "Career",
    priceLabel: "₹499",
    cadence: "mo",
    tagline: "For serious job seekers.",
    ctaLabel: "Start Career",
    ctaHref: "/credits?plan=career",
    showOnHome: true,
    homeBullets: [
      "Everything in Practice",
      "Unlimited mock interviews",
      "Resume Intelligence Pro",
    ],
    fullBullets: [
      "Everything in Practice",
      "Unlimited role-based mock interviews",
      "Resume Intelligence Pro (ATS + job match)",
      "Rozgar Samachar — personalised jobs feed",
      "Priority feedback on your practice sessions",
      "Cancel anytime",
    ],
  },
  {
    id: "sprint",
    name: "Placement Sprint",
    priceLabel: "₹1,499",
    cadence: "once",
    tagline: "4-week guided placement prep.",
    ctaLabel: "Start Sprint",
    ctaHref: "/credits?plan=sprint",
    showOnHome: false,
    homeBullets: [],
    fullBullets: [
      "Everything in Career for 4 weeks",
      "Daily 15-min practice plan",
      "Certified completion badge (shareable on LinkedIn)",
      "One-time payment — no auto-renew",
    ],
  },
  {
    id: "credits",
    name: "Pay as you go",
    priceLabel: "₹1 / credit",
    tagline: "For occasional practice.",
    ctaLabel: "Buy credits",
    ctaHref: "/credits",
    showOnHome: false,
    homeBullets: [],
    fullBullets: [
      "For learners who don't want a subscription",
      "1 credit = 12 minutes of live conversation",
      "Credits never expire",
      "Minimum top-up ₹10 (₹99 recommended)",
    ],
  },
];

export function getPlan(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/**
 * Real testimonials are populated by the marketing team once consent is
 * collected. Any entry without `consent: true` is filtered out at render time.
 * Do not add placeholder / invented entries — the homepage <Testimonials />
 * block hides itself when the list is empty.
 */
export type Testimonial = {
  id: string;
  name: string;
  role: string;
  city: string;
  quote: string;
  photo?: string;
  consent: boolean;
};

export const TESTIMONIALS: Testimonial[] = [
  // Example structure — replace with real entries.
  // {
  //   id: "priya-hyd-2026",
  //   name: "Priya S.",
  //   role: "BBA Final Year",
  //   city: "Hyderabad",
  //   quote: "The Hindi bridge helped me stop freezing. I got placed at a KPO in my second campus interview.",
  //   photo: "/testimonials/priya-hyd.jpg",
  //   consent: true,
  // },
];
