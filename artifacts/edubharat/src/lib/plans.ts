// Single source of truth for consumer pricing.
// Used by /pricing (src/pages/pricing.tsx) and the home pricing teaser
// (src/pages/home.tsx). Never hard-code prices in two places.
//
// This file intentionally does not touch the credits API (src/lib/use-credits.ts).
// Credits are the only paid consumer option: pay as you go at 1 credit = ₹1.
// Do not add subscription copy unless recurring billing exists end to end.

export type PlanId = "free" | "credits";

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
  /** Short decision cue shown on the full pricing comparison. */
  pricingBadge?: string;
  /** One-line explanation of the role this plan plays in the decision. */
  decisionNote?: string;
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
    pricingBadge: "Try risk-free",
    decisionNote: "Start with the full Lead Onto experience before paying.",
  },
  {
    id: "credits",
    name: "Pay as you go",
    priceLabel: "₹1 / credit",
    tagline: "For occasional practice.",
    ctaLabel: "Buy credits",
    ctaHref: "/credits",
    showOnHome: true,
    homeBullets: [
      "Top up from ₹10",
      "1 credit = 12 minutes of live conversation",
      "No expiry and no subscription",
    ],
    fullBullets: [
      "For learners who don't want a subscription",
      "1 credit = 12 minutes of live conversation",
      "Credits never expire",
      "Minimum top-up ₹10 (₹99 recommended)",
    ],
    pricingBadge: "Pay only when needed",
    decisionNote: "Continue after your free practice without a monthly commitment.",
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
