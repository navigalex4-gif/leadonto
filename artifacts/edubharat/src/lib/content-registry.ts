// ── Editable content registry ────────────────────────────────────────────────
// Central list of text strings that admins can override from the CMS editor.
//
// IMPORTANT: pages read their text with `useContent(key, fallbackDefault)`, and
// the inline fallback is the real source of truth for display. This registry is
// what the ADMIN EDITOR uses to discover which keys exist, their labels, page
// grouping, and default text. Keep each `defaultValue` in sync with the inline
// fallback used on the page. Adding a page's strings here is a mechanical,
// parallelisable step — new keys can be appended without touching existing ones.

export type ContentEntry = {
  key: string;
  page: string;
  label: string;
  defaultValue: string;
  multiline?: boolean;
};

export const CONTENT_REGISTRY: ContentEntry[] = [
  // ── Home / landing hero ──────────────────────────────────────────────────
  { key: "home.hero.eyebrow",     page: "Home", label: "Hero eyebrow",     defaultValue: "Your next opportunity starts with how you communicate." },
  {
    key: "home.hero.subheadline",
    page: "Home",
    label: "Hero subheadline",
    defaultValue: "Real-world English, the right words for every situation, local-language support, and role-based interview practice — built to help you seize your next opportunity.",
    multiline: true,
  },
  { key: "home.hero.startCta",     page: "Home", label: "Primary button",   defaultValue: "Start Free" },
  { key: "home.hero.checkCta",     page: "Home", label: "Secondary button", defaultValue: "Take the 90-Second Check" },

  // ── Buy Credits page ─────────────────────────────────────────────────────
  { key: "credits.hero.title", page: "Buy Credits", label: "Hero title", defaultValue: "Lead Onto Credits" },
  {
    key: "credits.hero.subtitle",
    page: "Buy Credits",
    label: "Hero subtitle",
    defaultValue: "1 credit = ₹1. Pay via UPI — GPay, PhonePe, Paytm, or any UPI app. Credits never expire.",
    multiline: true,
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  {
    key: "footer.brandStatement",
    page: "Footer",
    label: "Brand tagline",
    defaultValue: "Helping India’s next generation know what to say, how to say it, and how to prepare for the opportunities ahead.",
    multiline: true,
  },
  { key: "footer.contact.email", page: "Footer", label: "Contact email shown in footer", defaultValue: "email@leadonto.com" },

  // ── Legal pages (shared keys) ─────────────────────────────────────────────
  { key: "legal.company.name",   page: "Legal",  label: "Company name",                   defaultValue: "Lead Onto" },
  { key: "legal.jurisdiction",   page: "Legal",  label: "Governing jurisdiction (courts)", defaultValue: "Mumbai, Maharashtra, India" },
  { key: "legal.contact.email",  page: "Legal",  label: "Legal / T&C contact email",      defaultValue: "email@leadonto.com" },

  // ── About Us page ─────────────────────────────────────────────────────────
  {
    key: "about.mission",
    page: "About Us",
    label: "Mission statement (hero paragraph)",
    defaultValue: "We believe every young Indian, whether from a metro city or a small town, deserves access to world-class career preparation. Lead Onto makes this possible through AI.",
    multiline: true,
  },

  // ── Contact Us page ──────────────────────────────────────────────────────
  { key: "contact.email",         page: "Contact Us", label: "General support email",  defaultValue: "email@leadonto.com" },
  { key: "contact.billing.email", page: "Contact Us", label: "Billing / payment email", defaultValue: "email@leadonto.com" },
  { key: "contact.privacy.email", page: "Contact Us", label: "Privacy / data email",   defaultValue: "email@leadonto.com" },
  { key: "contact.response.time", page: "Contact Us", label: "Response time shown to users", defaultValue: "2–3 business days" },
];

/** Distinct page groups, in first-seen order (for the editor's section list). */
export const CONTENT_PAGES: string[] = Array.from(new Set(CONTENT_REGISTRY.map((e) => e.page)));
