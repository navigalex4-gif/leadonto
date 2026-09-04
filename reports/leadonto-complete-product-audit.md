# LeadOnto Complete Product, UX, AI, Mobile and Conversion Audit

**Audit date:** 5 September 2026  
**Production site tested:** https://leadonto.com  
**Scope:** Product usefulness, end-to-end journeys, AI authenticity, mobile UX, signup, engagement, retention, monetization, and technical implementation  
**Audit stance:** Evidence-first. A rendered result was not treated as proof of intelligence or personalization.

---

## 1. Executive verdict

LeadOnto is **not a fake or purely templated AI product**. The strongest tested experiences—English Guru, Tools Pro Grammar Fix, and the evidence extraction inside Resume Intelligence—responded materially to the user's actual input. English Guru correctly carried a prior coral-bleaching sentence into a Hindi follow-up, and Tools Pro distinguished an already-correct sentence from one containing three specific errors.

The product is nevertheless **unevenly intelligent**:

- English Guru can feel genuinely contextual and useful.
- Tools Pro performs focused transformations well.
- Resume Intelligence extracts evidence well, but its headline score was identical for two very different weak resumes.
- Interview Ace has strong prompt and scorecard architecture, but its live interview output was not verifiable in the audit browser because microphone permission was unavailable. Its failure path can still generate neutral 3/5 scores without adequate evidence.
- Communication Check has an especially serious authenticity risk: on AI failure it can generate plausible-looking numeric scores from word count and number of answered prompts rather than actual communication quality.
- Learning Journey relies heavily on hardcoded lessons and self-reported scores, so progress does not reliably prove mastery.
- Rozgar displayed a real, current Adzuna listing and used profile inputs, but it still behaves more like a filtered feed than a decision-support product.

### Overall product score: **6.1/10**

This is weighted toward the flagship, live-tested experiences. The unweighted service average is lower because several secondary products have weak evidence integrity.

### Strongest current asset

**English Guru's context-aware correction and native-language help.**

### Largest trust risk

**Numbers that look diagnostic but are not reliably derived from demonstrated performance.**

### Largest commercial risk

**LeadOnto gives useful isolated outputs, but does not yet turn them into one durable career-readiness journey that clearly explains why a user should create an account, return tomorrow, or pay.**

### Single strongest product strategy

LeadOnto should own the **evidence-backed career readiness loop for Indian students and early-career candidates**:

> Assess my real communication and job readiness → identify evidence-based gaps → give me today's practice → rehearse the actual interview → improve my resume → show the three jobs I should act on → track whether I am getting more ready.

The differentiator is not “many AI tools.” It is the shared evidence and progression across those tools.

---

## 2. What was actually verified

### Verification legend

- **Verified live:** Tested on the published site with real browser interaction.
- **Verified in code:** Confirmed from the implementation and data flow.
- **Partially verified:** Some journey steps worked, but a required capability was unavailable.
- **Not verified:** No claim is made about the behavior.

### Test limitations

The following were intentionally not completed:

- No Cashfree payment was made.
- No OTP email was sent.
- No Google OAuth flow was completed.
- Interview Ace's live interview room could not be entered because the audit browser did not grant microphone access.
- Communication Check could not begin for the same microphone reason.
- No real iOS or Android device was available; mobile web was tested at 390×844, and native risks were assessed from the Expo implementation.
- No production database or private user records were inspected.

These are labeled **not verified**, not assumed to work or fail.

---

## 3. End-to-end journey findings

| Journey | Status | Evidence | Main issue |
|---|---|---|---|
| Homepage → English Guru landing → app | Verified live | “Start 15 Free Minutes” reached the app; guest allowance and composer rendered | One extra landing step before value; account benefit is not framed strongly |
| English correction | Verified live | “She go…” became “She goes…” and “explain” became “explains” | One turn cleared without a visible response before succeeding on retry |
| English advanced/context input | Verified live | Physics input received a physics/research-specific response | Needs a reliable visible recovery state when a send fails |
| “Explain this in Hindi” | Verified live | Returned Hindi for the prior coral-bleaching context | Hindi punctuation/readability could be more polished |
| Interview Ace setup | Verified live | HR selected Raj Sir; Software selected Vikram Sir; experience gating worked | Copy says “HR Interview interview”; live room blocked by mic |
| Interview Ace live questions/report | Not verified | Microphone permission unavailable | Must be retested on real phones and social-app browsers |
| Communication Check setup | Partially verified | Role, city, experience retained; clear mic error shown | No text fallback; scoring/output not live-verified |
| Resume analysis | Verified live | Extracted resume-specific skills, education and experience | Different weak resumes both received 15/100 |
| Tools Pro Grammar Fix | Verified live | Correct input was left unchanged; incorrect input received three exact fixes | Useful but weakly connected to a larger progression loop |
| Rozgar onboarding/feed | Verified live | Kerala/Fresher profile produced a Kochi Adzuna job and 58% fit | One result is not enough; fit rationale is not decision-grade |
| Learning Journey | Partially verified | Guest dashboard and first quiz answer worked | Completion/mastery not tested; code uses self-reported scoring |
| Progress | Verified live | Guest XP and sessions visible with “Sign in to sync” | Value is fragmented and not a strong next-action system |
| Saved | Verified live | Empty state rendered with save guidance | No compelling guest-to-account bridge |
| Pricing → credits → login | Verified live | Pricing explained guest access and credits; credits gated to account creation | Outcome economics are still difficult to compare |
| OTP/Google signup | Not verified | Controls rendered only | Completion and return-to-value preservation not tested |
| Cashfree checkout/recovery | Not verified | No transaction performed | Technical delayed-payment handling exists, but real journey remains unverified |

### Important live defects and friction

1. `/tools` returns a real 404; the correct product path is `/tools-pro`.
2. Several product routes visibly sit on a skeleton for roughly 2.5 seconds before rendering.
3. One English Guru submission cleared the composer without a visible reply and required a retry.
4. An earlier English Guru attempt generated a browser-visible 401 resource failure before a subsequent send succeeded.
5. Interview Ace displays grammatically awkward setup copy: “Select your experience level for this HR Interview interview.”
6. Microphone-first products have no equivalent text-based diagnostic path when permission is denied.

---

## 4. Real AI versus templated output

| Service | Test performed | Output quality | Personalized? | Templated/generic risk | Evidence | Severity |
|---|---|---:|---|---|---|---|
| English Guru | Poor grammar about coral bleaching | High | Yes | Low in successful path; medium in local fallback path | Corrected exact verbs and asked a domain-specific follow-up | P1 reliability |
| English Guru | Advanced quantum-entanglement sentence | High | Yes | Low | Recognized it as a physics/research-style input instead of forcing beginner correction | P2 |
| English Guru | Beginner dog/pizza sentence | High when delivered | Yes | Low | Corrected `eat → ate` and `I very happy → I was very happy` | P1 reliability because first send required retry |
| English Guru | “Explain this in Hindi” | High | Yes | Low | Reused the immediately preceding coral-bleaching referent | P2 polish |
| Tools Pro | Already-correct grammar sentence | High | Yes | Low | Explicitly said the sentence was already correct and did not invent a fix | P3 |
| Tools Pro | Incorrect grammar sentence | High | Yes | Low | Corrected `present`, `finding`, and `investor` specifically | P3 |
| Resume Intelligence | Marine biologist resume → software target | Mixed | Yes for extraction | Medium for score/recommendation | Extracted Python, field sampling and reef ecology, but scored 15/100 | P1 |
| Resume Intelligence | Customer-service fresher → same software target | Mixed | Yes for extraction | Medium for score/recommendation | Extracted MS Office, teamwork and B.A.; also scored 15/100 | P1 |
| Interview Ace | Setup mappings | Good | Yes | N/A | HR→Raj, Software→Vikram | P2 |
| Interview Ace | Live questions and report | Not verified live | Unknown | High-risk failure path verified in code | Missing model ratings become neutral 3/5 ratings | P0/P1 |
| Communication Check | Live assessment | Not verified live | Unknown | High-risk failure path verified in code | Failure score derives mainly from word/answer count and fixed offsets | P0 |
| Learning Journey | Quiz/progress | Low evidence integrity | Limited | High | Lessons are largely hardcoded and score submission is self-reported | P1 |
| Rozgar | Kerala/Fresher feed | Moderate | Partially | Medium | Real Adzuna item and profile fit shown, but external feed is not itself AI reasoning | P1 |

### Authenticity conclusion

#### Genuinely input-derived

- English Guru successful conversation turns
- Dedicated native-language referent handling
- Tools Pro grammar transformations
- Resume skill, education and experience extraction
- Rozgar's basic location/experience filtering

#### Input-derived but insufficiently validated

- Resume ATS score and generated gaps
- Interview competency ratings and hiring-style recommendation
- Tools Pro free-form advice outside narrow grammar corrections
- Rozgar fit percentage and “why fit” reasoning

#### Templated or non-diagnostic

- English Guru opening banks and local recovery lines
- Interview fallback question banks
- Interview neutral 3/5 report fallback
- Communication Check word-count fallback scores
- Learning Journey hardcoded exercise bank and self-reported mastery

---

## 5. Technical root-cause findings

### P0: Communication Check can create fake precision

`artifacts/api-server/src/routes/communication-check.ts:48-79` computes fallback scores from total words and answered-turn count, then derives dimensions using fixed offsets and clamps. Provider errors/timeouts are swallowed around `:177-210`, after which the fallback is persisted/displayed around `:224-240`.

**Why this matters:** A 62/100 communication score appears authoritative even when it may only mean “the user spoke enough words.”

**Required change:** Never emit diagnostic dimensions when evidence scoring fails. Return `assessmentUnavailable`, preserve the answers, and offer retry. If a partial result is necessary, display descriptive observations without a number.

### P0/P1: Interview Ace defaults missing evidence to average performance

`artifacts/edubharat/src/pages/interview-ace.tsx:502-521` assigns 3/5 to covered competencies when scoring is interrupted. Parsing around `:544-599` also inserts 3 when a model rating is absent.

**Why this matters:** Missing evidence becomes an average candidate score instead of “not assessed.”

**Required change:** Competencies need `rating | null`, `evidence[]`, and `confidence`. Overall/recommendation must not compute when required evidence is missing.

### P1: Interview ratings are not programmatically tied to transcript evidence

The report prompt asks for ratings and comments, but no validator requires a quote/span from the candidate's answer before accepting a competency score.

**Required change:** Every rating must cite one or more answer IDs and exact evidence snippets. Reject or regenerate unsupported ratings.

### P1: Resume output is passed through without a discriminating rubric

`artifacts/api-server/src/routes/resume.ts:437-557` supplies real resume text to the model, but accepts generated skills/gaps/score without strong schema, range, or evidence validation. The two very different live-tested resumes both scored 15/100.

**Required change:** Compute the headline score deterministically from explicit rubric components: contact completeness, role evidence, quantified impact, required skills, projects, education, ATS readability, and recency. Show the component calculation.

### P1: Learning Journey measures self-report rather than demonstrated mastery

`artifacts/edubharat/src/pages/learning-journey.tsx:526-573` submits the user's selected score; extensive lesson/exercise content is hardcoded later in the file.

**Required change:** Score actual answers, spoken attempts, and spaced-review performance. Do not let the learner set their own mastery percentage.

### P1: Rozgar is an aggregation layer, not yet decision intelligence

`artifacts/api-server/src/routes/rozgar.ts` builds Google News/RSS queries, cleans feed records and caches them. The frontend can fall back between structured job search and the live feed.

**Required change:** Separate verified job facts from AI interpretation. Rank the top three opportunities against profile evidence, show match/mismatch reasons, and never infer unavailable salary or qualification facts.

### P2: English Guru context is strong but distributed across client fallbacks

The client builds recent history and referent context, while the shared API can inspect only the latest `Student:` line for some language policy decisions. Numerous local fallback branches improve availability but can produce a less intelligent experience.

**Required change:** Send a structured conversation object with authoritative referents, learner profile, difficulty, corrections already taught, and current learning objective. Track whether the response came from the model or a fallback.

---

## 6. English Guru and Live Conversation audit

### What works

- Corrects the learner's actual sentence rather than producing generic grammar advice.
- Can handle advanced content without forcing it into a beginner lesson.
- Retains immediate context for “Explain this in Hindi.”
- Mobile web at 390×844 showed an unclipped single-column conversation workspace.
- Guest trial messaging is clear and low-friction.
- Voice latency instrumentation exists.

### What prevents an exceptional experience

1. A failed send can look like the user's message disappeared.
2. Recovery/fallback responses can feel scripted.
3. Progress is XP-driven but not yet a visible “skill learned today” record.
4. Native-language help is useful, but the transition back to English practice is not always productized.
5. It does not consistently close a session with a memorable personalized takeaway and tomorrow's challenge.
6. Native Expo versions do not provide equivalent voice behavior; users are told to type.

### Recommended new experience

Each live session should maintain a small “coach brain”:

- Today's speaking goal
- Mistakes observed with exact examples
- Corrections already taught
- Vocabulary introduced
- Difficulty estimate
- User interests/topics
- Unfinished challenge

At the end:

> “Today you fixed past tense twice, used ‘stakeholder’ naturally, and spoke for 4m 20s. Tomorrow: tell me a 60-second story using ‘because’, ‘although’, and ‘finally’.”

That is a stronger return trigger than XP alone.

---

## 7. Interview Ace audit

### Verified strengths

- Role-to-interviewer mapping is now coherent.
- Experience is an explicit choice rather than silently inferred.
- The implementation contains role-specific question frameworks and breadth controls.
- Prompts instruct the interviewer to react to actual answers and avoid generic praise.
- There is a structured nine-competency scorecard and deterministic weighting.
- Timeouts inject recovery questions instead of leaving the candidate stranded.

### Critical concerns

- Live question quality and feedback authenticity were not browser-verified because mic access was blocked.
- No text-only fallback allows a candidate to evaluate the product when mic permission fails.
- Neutral 3/5 values can be generated from missing evidence.
- Scores are accepted without mandatory transcript citations.
- A fixed full-screen shell plus hidden overflow is risky under mobile browser chrome and keyboard resizing.
- Credit exhaustion can interrupt an active interview.
- “Selected / Not Selected” presentation may overstate certainty when evidence quality is low.

### Required Interview Ace standard

Every competency result must contain:

1. Rating or `notAssessed`
2. Confidence
3. Exact answer quote
4. What the quote demonstrates
5. What was missing
6. A rewritten stronger answer using only facts the candidate actually supplied

### Ideal report example

Bad:

> Improve confidence and clarity.

Good:

> In your answer to the delayed-project question, you said “we completed it somehow,” but did not explain your action, deadline, or result. This prevents the interviewer from judging ownership. A stronger structure is: situation → your decision → measurable outcome.

---

## 8. Communication Check audit

### Verified

- Role, location and experience inputs are captured.
- The microphone error message is clear.
- The result prompt in code asks for evidence.

### Not verified

- Real prompt sequence
- Speech transcription quality
- Score accuracy
- Feedback authenticity
- Result-to-signup CTA behavior

### Primary recommendation

Remove numeric fallback assessment entirely. If AI evidence scoring fails:

- Preserve transcript
- Show “We couldn't score this reliably”
- Let the user retry analysis without repeating speech
- Provide only non-scored facts that are directly computable, such as speaking duration and detected transcript length

This is the highest-trust fix in the product.

---

## 9. Resume Intelligence audit

### What works

- Resume text is genuinely supplied to the model.
- Extracted skills, education and experience changed with the input.
- The software-engineering gaps were directionally relevant for both non-software resumes.
- The user receives value before signup.

### What does not yet feel trustworthy

- Both very different weak resumes received exactly 15/100.
- The score is not explained as a transparent calculation.
- Model-generated gaps and recommendations are not required to cite resume evidence.
- Giving a full analysis before signup weakens the reason to create an account.

### Recommended score design

Show six components rather than one opaque number:

| Component | Example evidence |
|---|---|
| Role alignment | 1 of 8 target skills demonstrated |
| Impact evidence | 0 quantified outcomes |
| Experience relevance | 3 months, not role-related |
| Project evidence | No software project found |
| ATS structure | Contact and education present |
| Credibility | No invented claims detected |

Then calculate the overall score deterministically from those components.

---

## 10. Rozgar Samachar audit

### Verified live result

Profile:

- Asha Menon
- Kerala
- Private Job
- Fresher

Result:

- One live Adzuna listing
- Relationship Management Executive
- Kochi, Ernakulam
- 58% profile fit
- External Adzuna application URL

### Assessment

This proves the feed can be live and location-aware. It does not prove that 58% is meaningful or that the listing is the best opportunity for that user.

### Recommended transformation

Replace “feed of opportunities” as the primary value with:

> **The three opportunities you should act on this week**

For each:

- Verified source and posting age
- Why it matches, tied to profile evidence
- What is missing
- Estimated effort to become eligible
- Resume version to use
- Interview practice to run
- Deadline and next action

Never let AI invent salary, qualification, vacancy count, employer facts, or deadline.

---

## 11. Tools Pro, Learning Journey, Progress and Saved

### Tools Pro

Focused tools are useful and input-sensitive, especially Grammar Fix. However, they currently feel like isolated utilities that users could replace with a general chatbot.

**Connect every tool result to progression:**

- Save the mistake pattern
- Add it to tomorrow's practice
- Show whether the learner repeats the error
- Let the user hear and practise the corrected sentence

### Learning Journey

The product has structure, levels, quizzes and spaced-review ideas, but self-reported scoring damages mastery credibility.

**Replace:** “Rate yourself 0–100”  
**With:** automatically scored answers, spoken evidence, retry history, and review intervals.

### Progress

The current guest view shows XP, sessions and sync messaging. It needs to answer:

1. What improved?
2. What is still weak?
3. What should I do next?
4. Am I closer to a job outcome?

### Saved

The empty state is functional but passive. Saved items should become a working career folder:

- Best corrected sentences
- Interview answers to improve
- Resume versions
- Shortlisted jobs
- Next actions and deadlines

---

## 12. Mobile UX audit

### Positive live evidence

- Homepage, English Guru, Interview setup, pricing and login stacked correctly at 390×844.
- No visible horizontal overflow appeared in the tested paths.
- The homepage sticky CTA remained discoverable.
- HR/Raj mapping and experience gating fit the mobile viewport.

### Major mobile risks

| Priority | Problem | Why it matters | Recommended UX | Expected impact |
|---|---|---|---|---|
| P0 | Interview shell uses fixed positioning, hardcoded top offset and hidden overflow | iOS/Android browser chrome or keyboard can cover composer/hang-up controls | Use `100dvh`, safe-area insets, visual viewport handling, and one explicit scroll root | Fewer abandoned interviews |
| P1 | Native Expo voice products tell users to type | Contradicts the voice-first promise | Add native speech recognition/recording or clearly position mobile artifact as companion-only until parity | Higher trust and mobile activation |
| P1 | Communication and Interview have no text fallback when mic is denied | Users cannot reach value in restricted browsers | Offer “Continue with typed answer” while explaining scoring limitations | More first-value completions |
| P1 | Native Interview buttons share one non-wrapping row | Narrow devices can crowd Microphone and Submit | Stack or give equal flex width with 48px minimum height | Fewer missed taps |
| P1 | Global sticky CTA lacks bottom safe-area padding | Home indicator can overlap the action | Add `env(safe-area-inset-bottom)` and matching content padding | Safer mobile conversion |
| P2 | Generic Expo screens are not keyboard-aware | Multiline composer can be obscured | Use the existing keyboard-aware wrapper on login, English and Interview | Lower input frustration |
| P2 | Some chips are below ideal touch size | Harder for users with large fingers | Minimum 44×44px visible target | Better accessibility |
| P2 | Long fixed modals lack clear max-height scrolling | Actions can fall below short screens | `max-height: calc(100dvh - safe areas)` with internal scroll and sticky actions | Fewer trapped states |
| P2 | Closed drawer remains mounted off-screen | Screen-reader/focus edge cases | Apply inert/aria-hidden and remove from tab order when closed | Better accessibility |
| P2 | Expo declares an `interviews` route without a matching screen file | Deep link can fail | Remove declaration or add a redirect to `/interview-ace` | Fewer dead links |

---

## 13. Landing-page and CTA audit

| Page | Current CTA | Destination | Problem | Recommended CTA | Expected effect |
|---|---|---|---|---|---|
| Homepage | Start 15 Free Minutes | `/english-guru` landing | Extra step before live value; outcome is vague | “Try a 90-second speaking challenge” → app | Faster activation |
| English landing | Start speaking free | `/english-guru/app` | Strong trial, weak account-benefit framing | Keep CTA; add “Your corrections can be saved after the session” | More post-value signup |
| Interview Ace | Begin | Live interview | Requires mic and experience; no preview fallback | “Test mic & begin” plus “Try with typing” | More successful starts |
| Communication Check | Start my free check | Mic flow | Hard blocker when permission unavailable | “Start 90-second check” + typed fallback | More completed assessments |
| Resume Intelligence | Analyze/scan | Result | Full value with little account reason | “Analyze free”; after result: “Save this baseline and improve it” | Contextual signup |
| Rozgar | Browse jobs | Profile gate/feed | Feed framing, not outcome framing | “Show my top 3 opportunities” | Higher action intent |
| Tools Pro | Run tool | Result | Utility dead-end | “Fix this and add it to my practice” | Better retention |
| Learning Journey | Continue/start lesson | Lesson | Progress can be self-reported | “Complete today's 5-minute skill” | Clear daily habit |
| Progress | Sign in to sync | Login | Generic sync promise | “Save these 3 sessions and continue on any phone” | More account creation |
| Saved | Explore tools | Product pages | Empty state lacks purpose | “Create your first career folder item” | More saving behavior |
| Pricing | Create account/top up | Login/credits | Credits not translated into enough outcomes | “₹49 gives ~588 live minutes or up to 9 full interviews” | Better comprehension |
| `/tools` | None | 404 | Dead route | Redirect to `/tools-pro` | Prevent navigation loss |

---

## 14. Signup conversion analysis

### Why a visitor may not sign up

1. The guest product already gives useful outputs.
2. “Sync” is weaker than “do not lose this personalized result.”
3. The value of 20 credits is not translated into concrete outcomes at the decision moment.
4. Progress is spread across XP, sessions, reports, tools and saved items rather than one readiness profile.
5. The free offer uses several units: minutes, mock interviews and credits.
6. Login asks for identity after value, but does not always show exactly what will be preserved.
7. Resume and Tools results do not create an urgent next step.
8. A user can browse Rozgar without seeing a compelling account-only advantage.

### Ideal first-session funnel

1. Visitor chooses a goal: speak better, pass an interview, improve resume, or find a job.
2. LeadOnto gives a 90-second diagnostic or focused task.
3. Result names one specific strength and one evidence-based gap.
4. Product shows a three-step readiness plan generated from that evidence.
5. CTA: “Save this plan and keep your result.”
6. Google/OTP signup preserves the result and imports guest progress.
7. User lands on “Today's next action,” not a generic dashboard.
8. Completion updates readiness evidence.
9. Payment appears only when the user wants more practice, deeper simulation, or repeated analysis.

### Exact signup message after value

> Save your coral-bleaching correction, today's speaking score, and tomorrow's 60-second challenge. Create your free account and get 20 credits.

This is stronger than “Sign in to sync.”

---

## 15. Engagement and retention analysis

### What would make a user return tomorrow

- One unfinished, personalized 5-minute task
- Reminder of the exact mistake to fix
- A streak tied to completed evidence, not page visits
- A coach that remembers yesterday's topic and challenge
- A visible improvement comparison

### What would make a user return next week

- Weekly readiness report with evidence
- New jobs unlocked by newly demonstrated skills
- Interview answer improvement over multiple attempts
- Resume score component improvements
- A short plan for the next week

### What would make a user tell a friend

- A trustworthy before/after artifact:
  - Original spoken answer
  - Improved answer
  - Confidence/clarity change
  - Shareable readiness card
- A real job shortlist with clear reasoning
- Native-language help that makes a difficult English concept immediately understandable

### Strongest product loop

> Real attempt → evidence captured → gap identified → targeted practice → second attempt → visible improvement → relevant job/interview next action.

XP and badges should reinforce this loop, not replace it.

---

## 16. Monetization audit

### What is currently clear

- Guest English practice is available without signup.
- Guests receive two mock-interview attempts.
- Accounts receive 20 credits.
- Credits are pay-as-you-go, non-expiring and approximately ₹1 each.
- No subscription is required.

### What is not commercially clear

- Which outcomes are worth paying for after the free trial.
- How many meaningful interviews or practice sessions each top-up buys.
- Why a user should pay for Resume, Tools, Journey or Rozgar when substantial value is free.
- Whether paid output is deeper, more reliable, more personalized, or simply more usage.
- What happens to an active interview if credits run out.

### Recommended monetization model

Keep pay-as-you-go credits, but package them around outcomes:

- **Practice credits:** live conversation time
- **Simulation credits:** full interview + evidence-backed report
- **Career action credits:** tailored resume version + job-specific interview plan

The ledger can remain one credit currency, but the UI must show outcome equivalents.

### Paid value should be materially better

Paid should unlock:

- Longer context and longitudinal memory
- Full evidence-backed interview report
- Reattempt comparison
- Job-specific resume tailoring with evidence checks
- Top-three job action plan
- Weekly readiness report
- Cross-device history and saved artifacts

Do not charge for a score that can be generated without reliable evidence.

---

## 17. Product quality scorecard

Scores are 1–10. `†` means live AI output was not fully verified.

| Service | Useful | AI | Personal | Authentic | Output | Engage | UX | Mobile | Diff. | Signup | Retain | Paid | Avg. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| English Guru | 8 | 8 | 8 | 8 | 8 | 7 | 7 | 7 | 7 | 7 | 7 | 6 | 7.3 |
| Interview Ace† | 6 | 5 | 6 | 4 | 5 | 6 | 6 | 5 | 7 | 6 | 6 | 6 | 5.7 |
| Communication Check† | 5 | 4 | 5 | 3 | 4 | 4 | 6 | 5 | 5 | 6 | 4 | 4 | 4.6 |
| Resume Intelligence | 7 | 6 | 7 | 5 | 6 | 5 | 7 | 6 | 6 | 6 | 5 | 4 | 5.8 |
| Tools Pro | 7 | 7 | 7 | 7 | 7 | 5 | 7 | 6 | 5 | 5 | 4 | 3 | 5.9 |
| Rozgar Samachar | 6 | 4 | 6 | 6 | 5 | 5 | 6 | 6 | 6 | 5 | 5 | 3 | 5.3 |
| Learning Journey | 5 | 3 | 4 | 3 | 4 | 6 | 6 | 6 | 5 | 5 | 6 | 3 | 4.7 |
| Progress | 5 | 2 | 4 | 5 | 4 | 5 | 6 | 6 | 5 | 5 | 6 | 3 | 4.7 |
| Saved | 4 | 1 | 3 | 6 | 3 | 3 | 6 | 6 | 3 | 4 | 5 | 2 | 3.8 |

### Interpretation

- LeadOnto's flagship experience is ahead of the platform average.
- The “many products” strategy currently lowers perceived quality because weaker modules dilute trust.
- Improving evidence integrity and connecting products will create more value than adding another service.

---

## 18. Priority matrix

| Priority | Problem | Recommended change | Why | Expected impact | Difficulty |
|---|---|---|---|---|---|
| P0 | Communication fallback emits unsupported numeric scores | Return unscored retry state; preserve transcript | Removes fake precision | Trust, retention | Medium |
| P0 | Interview missing ratings become 3/5 | Use `notAssessed`; require evidence before overall score | Prevents arbitrary hiring verdicts | Trust, paid conversion | Medium |
| P0 | No shared evidence model across services | Create readiness evidence ledger with source, quote, confidence and timestamp | Enables real personalization | All core metrics | High |
| P0 | Mobile interview shell can hide controls | Rebuild around dynamic viewport and safe areas | Prevents session abandonment | Mobile completion | Medium |
| P0 | Free offer uses minutes, interviews and credits inconsistently | Publish one canonical offer and shared copy/constants | Reduces conversion confusion | Signup | Low |
| P1 | Guest value is not durably captured | Contextual post-result signup + guest-data migration | Converts after proof of value | Signup, retention | Medium |
| P1 | Resume score is opaque/coarse | Deterministic component rubric with evidence | Makes score credible and actionable | Trust, paid conversion | Medium |
| P1 | Voice products hard-block on mic denial | Add typed fallback and retry permission guide | More users reach first value | Activation | Medium |
| P1 | Rozgar ranks feeds, not decisions | Show top three verified opportunities with fit/gap/action reasons | Creates differentiated career value | Retention | High |
| P1 | Interview can end mid-session for credits | Preflight/reserve cost; preserve transcript/report on exhaustion | Removes payment anxiety | Paid conversion | Medium |
| P1 | AI send can fail silently | Keep composer/message, show retry state and correlation ID | Prevents trust loss | Engagement | Low |
| P1 | Paid value is not clearly deeper | Package evidence reports, comparisons and job actions | Creates reason to pay | Revenue | Medium |
| P2 | Learning mastery is self-reported | Score actual answers and spaced reviews | Makes progress meaningful | Retention | Medium |
| P2 | Product routes render long skeletons | Measure and reduce time-to-interactive; use useful skeleton copy | Improves perceived speed | Activation | Medium |
| P2 | `/tools` is a 404 | Add permanent redirect to `/tools-pro` | Removes dead end | Acquisition | Low |
| P2 | Native apps lack voice parity | Add native STT/audio or narrow product promise | Prevents broken expectations | Mobile trust | High |
| P2 | Progress lacks next best action | Add one prioritized daily action tied to evidence | Creates daily habit | Retention | Medium |
| P3 | Sticky CTA and modals lack complete safe-area handling | Add safe-area padding and bounded scrolling | Improves edge-device UX | Mobile conversion | Low |
| P3 | Tools results are isolated | Feed mistakes into Journey and Progress | Increases product cohesion | Retention | Medium |
| P4 | Secondary labels/copy are awkward | Fix duplicated “Interview interview” and similar microcopy | Improves polish | Trust | Low |

---

## 19. Before versus after

| Current LeadOnto | Problem | Recommended new experience | Why it is better | Expected behavior |
|---|---|---|---|---|
| Homepage lists products | User must choose before understanding the journey | Goal-first entry with one 90-second diagnostic | Reduces choice overload | More starts |
| Service-specific landings repeat claims | Extra click before value | Direct task launch with proof/demo beside CTA | Faster time to value | More completions |
| English Guru chats and awards XP | Improvement is not summarized as evidence | Session memory, corrected patterns and tomorrow challenge | Creates continuity | Return next day |
| Live Conversation can silently retry/fallback | Failure looks like weak AI | Visible recoverable send state | Preserves trust | Fewer exits |
| Interview scores missing evidence as average | Arbitrary precision | `Not assessed` + quote-backed ratings | Honest and useful | More report trust |
| Communication Check always tries to show a score | Failure can look diagnostic | Unscored retry state | Avoids misleading users | More confidence |
| Rozgar shows a feed | Too many/too few listings without decisions | Top three verified actions | Reduces job-search overload | More applications |
| Resume shows opaque overall score | Different weak resumes look identical | Transparent component score | Shows how to improve | More re-analysis |
| Tools Pro returns a result | Utility ends after output | Save error pattern into practice plan | Builds progression | More repeat use |
| Journey accepts self-score | Mastery can be gamed | Performance-scored lessons and reviews | Progress becomes credible | Higher retention |
| Signup says save/sync | Abstract account value | “Save this exact result and plan” | Contextual relevance | Higher signup |
| Progress shows counters | Counters do not guide action | Readiness map + one next action | Reduces uncertainty | More daily activity |
| Pricing sells credits | Unit economics require mental math | Show minutes/interviews/actions per amount | Easier decision | More top-ups |
| Mobile interview uses fixed viewport | Keyboard/chrome can cover controls | Dynamic viewport and safe areas | Reliable session UX | Fewer abandonments |
| AI feedback asks model for conclusions | Evidence is prompt-requested, not enforced | Output schema requires citations and confidence | Prevents hallucinated certainty | Higher trust |
| Paid access mainly means more usage | Weak differentiation | Longitudinal memory, comparisons and verified action plans | Materially better paid product | Higher conversion |

---

## 20. Top 10 problems hurting LeadOnto

1. Unsupported fallback scores can look authoritative.
2. Missing interview evidence can become neutral 3/5 performance.
3. Products do not share one readiness evidence model.
4. The reason to sign up is weaker than the immediate guest value.
5. Paid value is not clearly better, only more available.
6. Guest achievements and outputs are not reliably durable across devices.
7. Mobile voice parity is incomplete, especially in Expo.
8. Rozgar gives listings before strong decision support.
9. Resume scoring is opaque and insufficiently discriminating.
10. Secondary products dilute the quality perception of the strong English Guru experience.

## 21. Top 10 changes most likely to increase engagement

1. Give every user one evidence-based daily task.
2. End each speaking session with exact mistakes, wins and tomorrow's challenge.
3. Compare first and second attempts visibly.
4. Carry Tools mistakes into Learning Journey.
5. Turn saved items into a career action folder.
6. Add a weekly readiness report with evidence.
7. Let coaches remember recent topics and unfinished challenges.
8. Show a “next best action” after every result.
9. Tie XP to demonstrated actions rather than passive interaction.
10. Connect practice improvements to newly relevant jobs.

## 22. Top 10 changes most likely to increase signup

1. Ask for signup immediately after a specific useful result.
2. State exactly what result will be saved.
3. Migrate guest history automatically after authentication.
4. Translate 20 credits into minutes/interviews.
5. Preserve the return path and reopen the exact result after login.
6. Offer account-only before/after comparisons.
7. Offer account-only weekly readiness history.
8. Prompt signup on first save, not before browsing.
9. Use one canonical free-offer message everywhere.
10. Measure result-view → auth-prompt → auth-complete by product.

## 23. Top 10 changes most likely to increase paid conversion

1. Remove untrustworthy scores before charging around them.
2. Sell a full interview evidence report, not merely interview minutes.
3. Show top-up outcome equivalents.
4. Reserve/preflight interview cost so sessions are not interrupted.
5. Offer longitudinal memory and reattempt comparison as paid value.
6. Package resume tailoring with a specific verified job.
7. Include job-specific practice and action plan.
8. Trigger payment after a proven improvement moment.
9. Preserve pending-payment state and notify on delayed success.
10. Show the user what additional evidence/depth the paid run will add.

## 24. Top 10 changes most likely to make AI feel dramatically smarter

1. Require evidence citations for every assessment.
2. Store structured learner mistakes, goals and completed corrections.
3. Use `notAssessed` instead of fabricated neutral scores.
4. Validate all structured model outputs before display.
5. Separate verified facts from AI interpretation.
6. Make difficulty adapt from demonstrated performance.
7. Track and prevent repeated advice/questions.
8. Generate follow-ups from the last answer's strongest missing detail.
9. Compare current performance with the user's own prior attempts.
10. Expose uncertainty and recovery instead of hiding failures with templates.

## 25. Top 10 mobile UX fixes

1. Rebuild Interview Ace around `100dvh` and safe-area insets.
2. Keep composer and hang-up controls above the keyboard.
3. Add typed fallback for microphone-denied flows.
4. Add native STT/recording parity or narrow the native promise.
5. Make every chip/control at least 44×44px.
6. Stack cramped Interview action buttons.
7. Add keyboard-aware scrolling to login and voice-product composers.
8. Bound long modals with internal scrolling and sticky actions.
9. Add bottom safe-area spacing to fixed CTAs.
10. Test Chrome, Safari and social-app browsers on real phones.

## 26. Top 10 Interview Ace improvements

1. Evidence-cited competency ratings
2. `Not assessed` for missing evidence
3. Text-mode trial when mic is blocked
4. Real-phone dynamic viewport shell
5. Preflighted credit cost
6. Strong/weak answer comparison
7. Candidate-fact boundary validation
8. Repeated-question detection
9. Report confidence and evidence coverage
10. Retest the same role and compare improvement

## 27. Top 10 Rozgar Samachar improvements

1. Rank only the top three actionable opportunities.
2. Show verified source and posting age.
3. Explain fit using profile evidence.
4. Show critical missing qualifications.
5. Never infer missing salary/deadline facts.
6. Attach the best resume version.
7. Generate a job-specific interview plan.
8. Add application status and follow-up reminders.
9. Deduplicate cross-source listings.
10. Learn from saves, ignores and applications.

## 28. Top 10 Live Conversation improvements

1. Preserve failed messages and show retry.
2. Remember mistakes already corrected.
3. Use learner interests for follow-ups.
4. Introduce one useful word at a time.
5. Add short adaptive mini-challenges.
6. Detect hesitation without overcorrecting.
7. Avoid repeated praise and scripted acknowledgements.
8. End with a personalized session summary.
9. Start tomorrow from the unfinished challenge.
10. Compare fluency and correction patterns over time.

---

## 29. What should be removed or de-emphasized

1. Numeric scores generated without adequate evidence.
2. Self-entered mastery percentages.
3. “AI” framing for content that is only static curriculum or raw external feed data.
4. Duplicate landing steps that delay first value without adding trust.
5. Generic praise that is not tied to the user's words.
6. Secondary product prominence until those products meet the evidence standard.
7. Unexplained “fit” percentages.
8. Hiring-style verdicts when evidence quality is low.
9. Dead/legacy routes such as `/tools`.
10. Any fallback that silently impersonates a successful AI assessment.

---

## 30. What should be built next

### Build one shared Readiness Evidence Layer

Minimum evidence record:

```text
user/guest id
product
session id
skill/competency
source type
source text or answer id
observation
rating or notAssessed
confidence
model/provider/fallback
created at
```

All products should read and write this layer:

- English Guru writes grammar, vocabulary and speaking observations.
- Interview Ace reads communication evidence and writes role competencies.
- Resume Intelligence writes role evidence and missing-proof gaps.
- Learning Journey schedules practice from gaps.
- Rozgar ranks opportunities against demonstrated evidence.
- Progress presents the unified readiness map.

This is the defensible product moat.

---

## 31. Exact implementation roadmap

### Phase 0 — Truth and reliability foundation (Week 1)

1. Remove Communication Check numeric fallback.
2. Change Interview missing ratings from 3 to `null/notAssessed`.
3. Fix `/tools` redirect and duplicated microcopy.
4. Add visible retry state for failed English turns.
5. Finalize one canonical free-credit/trial policy.

**Exit metric:** No score can be emitted without evidence coverage.

### Phase 1 — Evidence contracts (Weeks 2–3)

1. Define shared evidence schema and API.
2. Require evidence IDs/quotes in Interview, Resume and Communication outputs.
3. Add runtime validation and regeneration/retry policy.
4. Store provider/fallback provenance.
5. Add confidence and evidence coverage to reports.

**Exit metric:** 100% of assessment dimensions cite accepted source evidence.

### Phase 2 — Flagship activation (Weeks 4–5)

1. Add goal-first 90-second entry experience.
2. Add text fallback for mic denial.
3. Add end-of-session personalized summary and next challenge.
4. Rebuild Interview mobile shell with safe areas and keyboard handling.
5. Add real-device tests for Chrome, Safari and social-app browsers.

**Exit metric:** Higher first-value completion and lower permission-related abandonment.

### Phase 3 — Signup and continuity (Weeks 6–7)

1. Add contextual post-result auth prompts.
2. Migrate guest sessions, XP, reports and saved items after signup.
3. Return users to the exact saved result.
4. Replace generic dashboard entry with today's next action.
5. Instrument all activation and migration events.

**Exit metric:** Result-view → signup conversion and next-day return rate increase.

### Phase 4 — Readiness loop (Weeks 8–10)

1. Connect Tools errors to Journey practice.
2. Add transparent Resume score components.
3. Add Interview reattempt comparison.
4. Convert Progress into readiness map + next action.
5. Convert Rozgar into top-three opportunity decisions.

**Exit metric:** Users complete actions across at least two products in one week.

### Phase 5 — Paid value (Weeks 11–12)

1. Show outcome equivalents for every credit pack.
2. Preflight/reserve interview credit cost.
3. Package full evidence reports and reattempt comparisons.
4. Add job-specific resume + practice bundle.
5. Add delayed-payment recovery notification and persistent order state.

**Exit metric:** Trial-exhausted → top-up conversion improves without increasing refund/support events.

### Ongoing quality program

- Weekly contrasting-input AI regression set
- Real-phone voice tests
- Evidence-grounding checks
- Hallucination review samples
- Feed freshness/source verification
- Funnel analytics review

---

## 32. Metrics to track

### Activation

- Homepage CTA → product app
- Product app → first submitted input
- First input → first useful result
- Time to first useful result
- Mic permission denied → typed fallback completion

### Authenticity

- Percentage of scores with evidence
- Percentage of competencies marked not assessed
- Regeneration rate after validation failure
- Unsupported-claim review rate
- Repeated-question/advice rate

### Signup

- Result viewed → signup prompt shown
- Signup prompt → auth started
- Auth started → auth completed
- Guest data successfully migrated
- Returned to original result

### Retention

- Next-day challenge completion
- Seven-day multi-product usage
- Reattempt rate
- Saved-item revisit rate
- Weekly readiness report opens

### Monetization

- Trial exhaustion → pricing
- Pricing → top-up start
- Top-up start → payment success
- Delayed payment recovery
- Paid action completion
- Repeat top-up rate

---

## 33. Final recommendation

LeadOnto should stop trying to win by presenting the largest collection of AI career tools. It should win by being the first product that can show an Indian learner:

> “Here is the exact evidence of what you can do today, what is holding you back, what to practise next, and which job action now makes sense.”

The current product already contains the pieces:

- English practice
- Communication assessment
- Interview simulation
- Resume analysis
- Learning
- Jobs
- Progress

The next step is not another feature. It is **shared evidence, honest scoring, continuity and one prioritized journey**.

If LeadOnto removes fake precision, makes the flagship voice experiences reliable on phones, preserves guest value at signup, and turns job feeds into decisions, it can become meaningfully differentiated from a generic chatbot and substantially more likely to earn repeat use and payment.
