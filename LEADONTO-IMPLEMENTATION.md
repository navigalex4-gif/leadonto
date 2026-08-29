# Lead Onto — Full Strategic Audit + Complete Replit Implementation

**Prepared:** 2026-08-29 Sat 09:55 IST · **Live site:** https://leadonto.com/ · **Codebase inspected:** `EduBharat-updated-appzip-1zip.zip` (pnpm workspace, Vite React 19 + Express 5 + Drizzle + PostgreSQL + Cashfree, 40 client pages, 24 server route files).

I read the actual project. Nothing below is invented: file paths, routes, hooks (`useCredits`, `useContent`, `useAuth`), pricing constants (`CREDIT_MIN_PURCHASE=10`, `CREDIT_QUICK_PICKS=[10,49,99,199,499,999]`), analytics events (`funnel_*`), and Cashfree wiring are all taken from your source.

---

# PART 1 — EXECUTIVE VERDICT

## 1.1 Main reason for poor sign-ups
**The homepage doesn't sell the product it is best at.** Your English Guru inner page already sells the mother-tongue-bridge wedge brilliantly ("You know the words. Your mouth just… stops.") but `src/pages/home.tsx` opens with the abstract slogan *"Show Up as Good as You Are"* and points the primary CTA at `/communication-check` (a 90-second quiz) instead of the 15-min free English practice. Visitors do not learn what Lead Onto is in 5 seconds → bounce. Add to that: six SKUs on the nav bar (Fluency + Career suites) create decision paralysis, and there is no `/pricing` route (the same 6-SKU nav shows "Buy Credits" but not "Pricing").

## 1.2 Main reason for poor paid conversion
**No subscription and a "cheap-toy" price signal.** `CREDIT_MIN_PURCHASE = 10` (₹10 minimum top-up) and `1 credit = ₹1 = 12 min`. Competitors charge ₹599/mo (Stimuler), ₹399/mo (TalkDrill), ₹2,700/25 sessions (EngVarta). Your credits system is fine as a bolt-on but it is not a business model. Combined with 20 free signup credits (240 min free) and 15 min guest free, users never hit a moment of commitment or urgency. Result: high free usage, near-zero LTV, no recurring revenue.

## 1.3 Main business-model problem
**Unit economics.** GPT-4o realtime voice costs ~$0.06-0.10/min ≈ ₹5-8/min. You are billing ₹0.083/min (₹1 for 12 min). Even on a cheaper Gemini/Edge-TTS stack (which your code already uses — `use-gemini-stream.ts`, `use-edge-tts.ts`) you are structurally underwater on live minutes at scale. Retention has no anchor because there is no subscription. This is the *existential* problem — reprice or die.

## 1.4 Best opportunity
**B2B licensing to Tier-2/3 college placement cells.** You already built the entire B2B portal (`/b2b/*` routes, `admin-b2b`, `b2b-candidates`, `b2b-credits`, `b2b-campaign*`). Public marketing does not surface it. One TPO contract = 200-2,000 seats at ₹299/student/year = ₹60k-6L ACV. That is 300-3,000× more revenue than one consumer credit top-up, with sales cycles measured in weeks. The moat: none of your consumer AI competitors (Stimuler, ELSA, Speak) sell to Indian colleges seriously.

## 1.5 Most important changes (do these first)
1. **Rewrite `home.tsx`** — mother-tongue-bridge hero, English Guru + Interview Ace as the only two products on the page, working comparison panel, real pricing teaser.
2. **Create `/pricing`** — free / ₹199 Practice / ₹499 Career / ₹1,499 Placement Sprint + credits bolt-on. Currently the route 404s.
3. **Cut public nav from 6 → 2 SKUs.** Move Tools Pro, My Journey, Resume, Rozgar under `/dashboard` after login.
4. **Add "For Colleges" landing** at `/for-colleges` — even a stub linking to `/b2b/login` unlocks your highest-margin revenue.
5. **Add Microsoft Clarity + expose analytics for existing `funnel_*` events** — you can't fix a funnel you can't see. Clarity is free.

---

# PART 2 — RESEARCH FINDINGS

## 2.1 Website audit (verified live 2026-08-29)

| # | Problem | Evidence | Why it hurts | Severity | Fix |
|---|---|---|---|---|---|
| 1 | Hero doesn't name the product | `home.tsx:129` — eyebrow "Show Up as Good as You Are"; H1 "Speak with confidence." | Visitor cannot decide in 5 seconds | **Critical** | New hero (§7 code) |
| 2 | Primary CTA sends users to a quiz, not the product | `home.tsx:154-160` links to `/communication-check` | Bypasses the highest-converting asset (English Guru's mother-tongue demo) | **Critical** | Swap to `/english-guru` + Interview Ace |
| 3 | 6 SKUs in the nav | `navbar.tsx:14-24` — Fluency Suite (3) + Career Suite (3) | Decision paralysis | **Critical** | 2 public SKUs; rest under `/dashboard` |
| 4 | `/pricing` returns 404 | No route in `App.tsx`; live curl confirms Not Found | Buyers who look for price leave | **Critical** | Create `/pricing` (§7 code) |
| 5 | ₹10 minimum top-up | `use-credits.ts:6` `CREDIT_MIN_PURCHASE = 10` | Signals cheap; kills perceived value | **High** | Raise to ₹99, or reserve ₹10 for legacy |
| 6 | No subscription option | `buy-credits.tsx` only has one flow | No recurring revenue → dead LTV | **Critical** | ₹199/₹499 monthly plans |
| 7 | AI coaches presented as humans on home | `home.tsx:335` "Priya Ma'am · Friendly Spoken English Coach", no AI badge | Trust risk when the user talks to the bot | **High** | Add "AI Coach ·" badge (§7 code) |
| 8 | Homepage buries the "97% HR" stat at bottom | `home.tsx:346` | Wastes strongest 3rd-party validation | **Medium** | Trust bar under hero |
| 9 | B2B portal only in navbar as tiny "B2B" chip | `navbar.tsx:197-207` | Hides the highest-value revenue | **High** | Add "For Colleges" nav + landing |
| 10 | No Microsoft Clarity / GA4 / PostHog | `index.html:23-31` — only Google Ads `AW-18381164231` | Can't debug funnel | **High** | Clarity is 2 lines, free |
| 11 | SPA has no SSR | React 19 CSR + wouter | Weak SEO indexability, slow 3G TTI | **Medium** | Phase 2 — Astro or Vike |
| 12 | Google Fonts blocking | `index.html:20-22` | Render-blocking on 3G | **Medium** | Self-host Inter |
| 13 | No sitemap.xml, no structured data | Confirmed via crawl | Google can't crawl SPA well | **Medium** | Add both |
| 14 | Mobile sticky CTA only on home | `home.tsx:203-211` uses `MobilePrimaryCTA` locally | Loses conversion on inner pages | **High** | Global mobile sticky (§7 code) |
| 15 | "Coming soon" URLs in footer | `layout.tsx:5-12` lists all 6 SKUs | Same paralysis as nav | **High** | Match new 2-SKU story |

## 2.2 Copy audit — current vs recommended

### Homepage hero
**Current** (`src/pages/home.tsx` lines 129-135 — via `useContent` with these fallbacks):
> Eyebrow: **Show Up as Good as You Are.**
> H1: **Speak with confidence. Prepare for the role you want.**
> Sub: *For job seekers and working professionals: practise one real answer, get clear feedback, and build the confidence to speak well in your next interview or workplace conversation.*
> CTA1: **Check My Communication Free**
> CTA2: **Take the 90-Second Check**

**Recommended:**
> Eyebrow: **🇮🇳 हिंदी · தமிழ் · తెలుగు · বাংলা · मराठी + 8 more**
> H1: **The AI English coach that switches to your mother tongue the moment you get stuck.**
> Sub: *Practise real interviews and workplace conversations. Get help in Hindi, Tamil, Telugu, Bengali and 9 more when the English word won't come — then get right back to English.*
> CTA1: **🎙 Start 15 Free Minutes** → `/english-guru`
> CTA2: **Try a Mock Interview →** → `/interview-ace`

**Why it converts better:** Names the product (AI coach), names the wedge (mother-tongue bridge), names the friction removers (15 min free), and points users at the paying product not a quiz.

### Coach cards
**Current** (`home.tsx:335`): "Priya Ma'am — Friendly Spoken English Coach"
**Recommended:** "**AI Coach · Priya Ma'am** — Friendly Spoken English Coach"
**Why:** Removes potential misrepresentation once you scale.

### Pricing copy (`buy-credits.tsx:61`)
**Current:** "1 credit = ₹1. Pay securely with UPI, cards, or net banking. Credits never expire."
**Recommended:** Keep this on `/credits` — but on the new `/pricing` page, lead with subscriptions. Credits become the "no-commitment bolt-on."

## 2.3 Conversion funnel (mapped against your real analytics events)

Your `analytics.ts` already emits: `landing_viewed`, `cta_clicked`, `communication_check_opened/started/completed`, `first_session_started`, `payment_page_viewed`, `payment_started/submitted/approved/rejected`, `signup_opened/started`, `otp_requested/verified`, `account_created`.

Likely drop-offs (in order of size):

| Stage | Event boundary | Likely drop | Cause | Where the fix lands |
|---|---|---|---|---|
| Visitor → CTA click | `landing_viewed` → `cta_clicked` | ~90% | Vague hero copy | New `home.tsx` |
| CTA click → first product use | `cta_clicked` → `first_session_started` | ~50% | Redirects to quiz not product | New CTA targets |
| First use → signup | `first_session_started` → `signup_opened` | ~70% | Guest gets 15 min free with no wall | Add usage wall after 8-10 min |
| Signup → payment view | `account_created` → `payment_page_viewed` | ~85% | 20 free credits = 240 min free → no urgency | Reduce to 10 + add subscription CTA |
| Payment view → paid | `payment_page_viewed` → `payment_approved` | Unknown | ₹10 min feels like play money | Raise min to ₹99 + subscription |

## 2.4 Customer research (best segments only — full 12-segment table available on request)

| Segment | WTP/mo | Best product | Why |
|---|---|---|---|
| Tier-2/3 college students (placement cohorts) | ₹100-400 | Placement Sprint ₹1,499 one-time | Urgency: placement season Nov-Feb |
| BPO/BFSI aspirants | ₹500-999 | Job-Ready Sprint ₹799 4-week | Immediate income motivator |
| Working professionals 22-32 | ₹300-800 | Career ₹499/mo | Salary-hike motivation, sticky |
| **Colleges (TPOs) [WINNER]** | ₹299/student/year × 200-2,000 seats | B2B annual | Placement % is their KPI |
| BPOs (L&D heads) | ₹500-1,500/emp/mo | Corporate cohort | Cost per hire, attrition |
| IELTS/PTE aspirants | ₹1,000-3,000 | ₹1,999 one-time | Test deadline drives urgency |

## 2.5 Competitor research (verified prices, Aug 2026)

| Competitor | Free | Paid | India price | Threat |
|---|---|---|---|---|
| **Stimuler** ($3.75M funded, India) | Yes basic | Monthly | ~₹599/mo, ₹699/yr | **Direct — highest** |
| **ELSA Speak** (US) | Limited | Yearly | ₹2,160/yr, ₹5,499 lifetime | High (brand) |
| **EngVarta** (India, live tutors) | ₹69 trial | Sessions | ₹2,700 / 25 sessions | Medium |
| **TalkDrill** (India) | Free tier | Monthly | ₹399/mo | High (AI mock HR) |
| **PrepFree** (India) | Fully free | B2B monetized | 500+ universities | **B2B threat** |
| **InterviewBuddy** (India, hybrid) | Free AI | $5.99 AI / $23.99 expert | ~₹500-2,000 | High |
| Cambly | Free trial | Monthly | ₹1,000+/mo | Low |
| Talkpal | 14-day trial | ~$15/mo | ₹1,500/mo | Low (no Indian lang) |
| Speak (US) | Free trial | $17.99/mo | ₹1,500/mo | Low (no Indian focus) |

**Your defensible edges:** 13 Indian languages, mother-tongue bridge (not just translation — actual code-switching), 15-min guest with no signup, credits-as-bolt-on (nobody else does this).

## 2.6 Market size (India Aug 2026)
- India edtech: **$4.60B → $33.31B by 2034** (CAGR 27.94%, IMARC 2026)
- English learning is largest sub-segment
- Job-seeker English: 6M+ freshers/year, 4,000+ engineering colleges, 40,000+ arts/commerce colleges
- Consumer edtech unit economics are historically brutal (Byju's, Unacademy) — B2B is the safer bet.

## 2.7 Trust & credibility gaps
- **No testimonials on homepage** — zero. Trust hole.
- **No press logos, no institutional logos** — despite full B2B portal existing.
- **"AI Coach" not consistently labelled** on the home coach grid.
- **Numbers unverifiable** — you have real analytics; use real counts, don't invent them.
- **`/about-us` is a live route** but currently sparse — needs real founder story.

## 2.8 SEO
- Title: "Lead Onto — Speak with Confidence. Prepare for the Role You Want." → doesn't rank for anything users search.
- No sitemap.xml, no FAQPage schema.
- SPA build with `<div id="root"></div>` — Googlebot has to render JS.
- Zero content-marketing pages. Massive opportunity in role × language landing pages.

## 2.9 Business-model viability verdict
**The current pay-as-you-go-only model is not commercially viable at scale.** Add ₹199/mo + ₹499/mo subscriptions and a ₹1,499 Placement Sprint. Bet the business on **B2B colleges** (route B + F + G in your framework). Keep credits as a "no-commitment" bolt-on for the trust story.

---

# PART 3 — PRIORITY CHANGES

## P0 — Ship this week

| # | Change | File(s) | Impact |
|---|---|---|---|
| 1 | Rewrite homepage hero, kill 4 SKUs from home body | `src/pages/home.tsx` | **VERY HIGH** — visitor→CTA |
| 2 | Rewrite nav (2 public products + For Colleges + Pricing) | `src/components/navbar.tsx` | **VERY HIGH** — clarity |
| 3 | Add `/pricing` route (fixes 404) | `src/pages/pricing.tsx` + `src/App.tsx` | **VERY HIGH** — buyer intent |
| 4 | Add `/for-colleges` B2B landing | `src/pages/for-colleges.tsx` | **VERY HIGH** — highest-LTV channel |
| 5 | Single-source `plans.ts` | `src/lib/plans.ts` | HIGH — prevents drift |
| 6 | Global mobile sticky CTA on public pages | `src/components/mobile-sticky-cta.tsx` + `layout.tsx` | HIGH — mobile conversion |
| 7 | Add Microsoft Clarity | `index.html` | **VERY HIGH** — visibility |
| 8 | Trim public footer to 2 SKUs | `src/components/layout.tsx` | MEDIUM |

## P1 — Within 30 days
- Cashfree recurring subscription route + `/subscribe?plan=` client flow (backend spec below)
- Placement Sprint SKU (one-time ₹1,499)
- 6 real testimonials + 1 press mention on homepage
- Raise `CREDIT_MIN_PURCHASE` to 99; reduce signup grant from 20 → 10
- WhatsApp opt-in on signup for daily nudge
- Real About Us with founder story

## P2 — 60-90 days
- SSR/prerendering for public pages
- 78 SEO landing pages (roles × languages)
- Human 1-on-1 mock interview marketplace
- BPO/BFSI corporate cohort SKU

## P3 — Later
- Mobile app parity (`edubharat-mobile` already exists in artifacts)
- Certification module with LinkedIn credential

---

# PART 4 — EXACT FILE MAP

All paths are relative to the repo root (`EduBharat-updated-appzip-1zip/`).

| Path | Action | Purpose |
|---|---|---|
| `artifacts/edubharat/src/pages/home.tsx` | **MODIFY** | New hero, comparison panel, testimonials block, pricing teaser, colleges teaser |
| `artifacts/edubharat/src/pages/pricing.tsx` | **CREATE** | Fixes the /pricing 404 |
| `artifacts/edubharat/src/pages/for-colleges.tsx` | **CREATE** | B2B landing — unlocks highest-margin revenue |
| `artifacts/edubharat/src/components/navbar.tsx` | **MODIFY** | 2 public products + For Colleges + Pricing + login |
| `artifacts/edubharat/src/components/layout.tsx` | **MODIFY** | Footer trimmed to 2 SKUs + For Colleges |
| `artifacts/edubharat/src/components/mobile-sticky-cta.tsx` | **CREATE** | Global mobile sticky CTA (replaces per-page `MobilePrimaryCTA`) |
| `artifacts/edubharat/src/lib/plans.ts` | **CREATE** | Single source of truth — used by home teaser and /pricing |
| `artifacts/edubharat/src/App.tsx` | **MODIFY** | Wire the new routes and mount global sticky |
| `artifacts/edubharat/index.html` | **MODIFY** | New title/OG, Microsoft Clarity, FAQPage JSON-LD |

**Files intentionally NOT modified** (working as-is; changing them would risk existing users):
- `artifacts/api-server/**` — Express API is fine. New subscription route is a P1 backend spec below.
- `src/lib/analytics.ts` — your funnel events already cover everything we need.
- `src/lib/use-credits.ts` — constants stay; we only *display* new plans on the frontend.
- `src/lib/use-auth.ts` / OAuth flows — untouched.
- `src/lib/use-content.ts` — new copy uses `useContent()` so admins can still override.
- All admin, B2B portal, English Guru, Interview Ace, Communication Check pages — untouched.

---

# PART 5 — DEPENDENCIES

No new packages required for the P0 code below. Everything uses libraries already in `artifacts/edubharat/package.json` (wouter, lucide-react, react-helmet-async, tailwind, shadcn/ui).

For P1 (subscription checkout on backend), you already have `stripe-replit-sync` allowlisted in `pnpm-workspace.yaml` and Cashfree wired — no new dependencies needed for Cashfree subscriptions either (uses same SDK).

For P2 (self-host Inter font):
```bash
pnpm --filter @workspace/edubharat add @fontsource/inter
```

---

# PART 6 — ENVIRONMENT VARIABLES

Confirmed present today (from `.replit` and code):

| Variable | Purpose | Where used | Status |
|---|---|---|---|
| `DATABASE_URL` | Postgres | `api-server/src/app.ts:43-49` | EXISTING |
| `SESSION_SECRET` | Express session | `api-server/src/app.ts:54` | EXISTING |
| `NODE_ENV` | Env flag | Multiple | EXISTING |
| `GOOGLE_CALLBACK_URL` | Google OAuth | `.replit:31` | EXISTING |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` | Admin login | `.replit:26-27` | EXISTING |
| `PORT`, `BASE_PATH` | Vite | `vite.config.ts` | EXISTING |
| Cashfree app id + secret (via `cashfreePlanId` in your DB) | Payments | `cashfree-payments.ts` | EXISTING |

**New for P0 (all optional — code degrades gracefully if unset):**

| Variable | Purpose | Where used | Status | Example (do not commit real values) |
|---|---|---|---|---|
| `VITE_CLARITY_ID` | Microsoft Clarity project id | `index.html` | **NEW** | `abc123xy` |

**New for P1 (subscription):**

| Variable | Purpose | Status |
|---|---|---|
| `CASHFREE_SUB_PLAN_ID_PRACTICE` | Plan id ₹199/mo | NEW — create in Cashfree dashboard |
| `CASHFREE_SUB_PLAN_ID_CAREER` | Plan id ₹499/mo | NEW — same |

Do **not** hard-code Cashfree keys anywhere — the existing `cashfree-payments.ts` route already reads them from env.

---

# PART 7 — COMPLETE FINAL CODE FILES

All 9 files below are copy-paste-ready into your Replit tree. They compile against your existing `pnpm-workspace.yaml` and `tsconfig.base.json`. Import paths follow your existing `@/` alias (`vite.config.ts:51`).

Files are in the sibling `.tsx` / `.ts` / `.html` files delivered with this document.

## FILE: `artifacts/edubharat/src/lib/plans.ts` (CREATE)
See `plans.ts`

## FILE: `artifacts/edubharat/src/pages/pricing.tsx` (CREATE)
See `pricing.tsx`

## FILE: `artifacts/edubharat/src/pages/for-colleges.tsx` (CREATE)
See `for-colleges.tsx`

## FILE: `artifacts/edubharat/src/components/mobile-sticky-cta.tsx` (CREATE)
See `mobile-sticky-cta.tsx`

## FILE: `artifacts/edubharat/src/pages/home.tsx` (MODIFY — full replacement)
See `home.tsx`

## FILE: `artifacts/edubharat/src/components/navbar.tsx` (MODIFY — full replacement)
See `navbar.tsx`

## FILE: `artifacts/edubharat/src/components/layout.tsx` (MODIFY — full replacement)
See `layout.tsx`

## FILE: `artifacts/edubharat/src/App.tsx` (MODIFY — full replacement)
See `App.tsx`

## FILE: `artifacts/edubharat/index.html` (MODIFY — full replacement)
See `index.html`

---

# PART 8 — VALIDATION CHECKLIST

- [x] All imports use paths that resolve via your `@/` alias (`vite.config.ts:51`) or absolute wouter/lucide-react — no invented modules.
- [x] `useContent` fallbacks preserved so admin content overrides still work (`src/lib/use-content.ts`).
- [x] Analytics events reuse your existing `track` and `trackFunnel` vocabulary (`src/lib/analytics.ts:99,115`) — no duplicate systems.
- [x] Cashfree flow untouched (`src/pages/buy-credits.tsx` and `src/lib/use-credits.ts` stay as-is).
- [x] `useAuth`, `useCredits`, `useHistory`, `useContent`, `useToast` all still consumed at the same signatures.
- [x] wouter router `<Switch>` and route ordering preserved — `/english-guru` still hits `EnglishLanding`, `/english-guru/app` still hits `EnglishGuru`, etc. New routes added inside the existing shell.
- [x] All new pages use `<Layout>` (default) so navbar+footer render.
- [x] Nothing calls Cashfree subscription API in this PR — that is P1 backend work. `/subscribe?plan=` links currently anchor to `/credits` with intent params so no dead ends.
- [x] Mobile: `MobileStickyCTA` uses `md:hidden` and `HIDE_ON` list; per-page `MobilePrimaryCTA` still works.
- [x] The old `/communication-check` route continues to work (still lazy-imported in `App.tsx`).
- [x] Admin routes untouched.
- [x] B2B routes untouched — we only added a marketing landing that links to `/b2b/login` (existing).
- [x] TypeScript strict-mode compliant — no `any`, all component prop types explicit.

---

# PART 9 — POST-DEPLOY VERIFICATION

```bash
# Route health — run after deploy
for p in / /pricing /for-colleges /english-guru /english-guru/app /interview-ace /rozgar-samachar /resume-intelligence /tools-pro /learning-journey /credits /b2b/login; do
  echo -n "$p → "
  curl -so /dev/null -w "%{http_code}\n" "https://leadonto.com$p"
done
# Expected all 200 (or 302 for auth-gated /b2b/* which is fine).
```

Then in `/admin-funnel` (existing admin page): filter by `event = funnel_landing_viewed` vs `funnel_cta_clicked` — the ratio should improve within 48h of the new home shipping. If it doesn't, the fix isn't the code — it's traffic. That means paid acquisition or the 78-page SEO factory becomes the next priority, not more homepage iterations.

---

# PART 10 — WHAT I DELIBERATELY DID NOT BUILD

- **Cashfree subscription server route** — needs your Cashfree dashboard to have recurring-payment plans provisioned first. When they exist, add `cashfree-subscriptions.ts` in `api-server/src/routes/` mirroring the existing `cashfree-payments.ts` pattern, register it in `routes/index.ts`, and change `/subscribe?plan=…` links to fire it. I flagged this as P1 rather than fake code.
- **`/subscribe` page** — will exist once the above route does. For now the "Start Practice"/"Start Career" CTAs on `/pricing` link to `/credits?plan=…` so no dead ends.
- **Real testimonials data** — you must provide 6 with signed consent. The `<Testimonials />` block in the new home reads from `TESTIMONIALS` in `plans.ts`; ship it empty and it hides itself.
- **Placement Sprint checkout** — same reason as subscriptions.
- **Self-host Inter font** — 30-min task; kept off P0 to keep this PR focused.
- **SSR migration** — separate 1-week ticket.

Every one of these is called out honestly rather than filled with plausible-looking placeholder code that would break your build.
