---
name: AI quality provider routing
description: Provider order and health-aware routing for standard, quality, and live AI generation.
---

# AI quality provider routing

Every general AI feature route in `api-server` MUST go through the shared
`generateTextWithFallback` helper (streaming) or the shared chat helpers in
`routes/ai.ts` — never a hand-rolled single-provider loop. Rozgar has one
intentional exception: its dedicated feed endpoint is Gemini-first, with
Claude fallback, because the product explicitly requests Gemini enrichment.

**Standard order:** Claude is PRIMARY, Gemini is the FALLBACK, then Groq and
Mistral. `/ai/stream` keeps this order for general routes.

**Quality order:** `/ai/stream?provider=quality` and
`generateTextWithFallback({ qualityFirst: true })` use Claude Sonnet → Claude
Haiku while Claude is healthy, then Mistral → Groq. English Guru, Interview
Ace, and Learning Journey use this quality path. Gemini is intentionally skipped
there because its exhausted quota causes dead air in live voice experiences.

**Why:** There is no working `GEMINI_API_KEY` in this project. Every Gemini call
returns `429 RESOURCE_EXHAUSTED` (free-tier quota effectively 0) or `404 NOT_FOUND`
(`gemini-1.5-flash` is gone). When Gemini was tried first, every AI call wasted
~3-5s failing through dead models before falling back to Claude — the real cause
of the "AI not responding / stops mid-reply / robotic / empty stream" symptoms
across English Guru, Interview Ace, and the 30-day plan. Flipping to Claude-first
dropped `/ai/stream` from 5+s to ~1.7s and made responses reliable.
`ANTHROPIC_API_KEY` may be present while the provider account is still unable to serve
requests (for example, an account-credit rejection). Groq can also exhaust its daily
allowance. Quality routes temporarily cool down providers after billing, quota, auth,
or empty-response failures, so the next spoken turn reaches the healthy provider
instead of repeating a known failure.

**Model chain:** keep `ANTHROPIC_MODEL_CHAIN` to REAL models only
(`claude-haiku-4-5`, `claude-sonnet-4-5`). Do NOT invent names like
"claude-sonnet-4-6" — a non-existent model 404s and burns a retry.

**How to apply:** General routes call
`generateTextWithFallback({ prompt, system, maxTokens, onDelta, log })`; quality
content adds `qualityFirst: true`. Streaming quality calls use
`/ai/stream?provider=quality`. Keep client-side turn deadlines and local recovery:
a provider is never allowed to strand a live learner or candidate. Only use the
Gemini-first route for Rozgar content grounded in fetched live listings/feed items.

**Related parsing rule:** never set `responseMimeType: "application/json"` with
gemini-2.5-flash — it suppresses streamed text entirely. Isolate the JSON object
on both client and server before parsing: strip ``` fences, then slice from the
first `{` to the last `}` before `JSON.parse`.
