---
name: AI provider fallback (Claude primary → Gemini fallback)
description: Why Claude is the primary AI provider and Gemini only a fallback, and how routes must call AI.
---

# AI provider fallback (Claude/Gemini → Groq → Mistral)

Every general AI feature route in `api-server` MUST go through the shared
`generateTextWithFallback` helper (streaming) or the shared chat helpers in
`routes/ai.ts` — never a hand-rolled single-provider loop. Rozgar has one
intentional exception: its dedicated feed endpoint is Gemini-first, with
Claude fallback, because the product explicitly requests Gemini enrichment.

**General order: Claude is PRIMARY, Gemini is the FALLBACK, then Groq and
Mistral.** `/ai/stream` keeps Claude/Gemini first for general routes, while web
Live Conversation explicitly selects Groq for low latency and falls back to
Mistral. `generateTextWithFallback` uses Claude → Gemini → Groq → Mistral.

**Why:** There is no working `GEMINI_API_KEY` in this project. Every Gemini call
returns `429 RESOURCE_EXHAUSTED` (free-tier quota effectively 0) or `404 NOT_FOUND`
(`gemini-1.5-flash` is gone). When Gemini was tried first, every AI call wasted
~3-5s failing through dead models before falling back to Claude — the real cause
of the "AI not responding / stops mid-reply / robotic / empty stream" symptoms
across English Guru, Interview Ace, and the 30-day plan. Flipping to Claude-first
dropped `/ai/stream` from 5+s to ~1.7s and made responses reliable.
`ANTHROPIC_API_KEY` is present and healthy.

**Model chain:** keep `ANTHROPIC_MODEL_CHAIN` to REAL models only
(`claude-haiku-4-5`, `claude-sonnet-4-5`). Do NOT invent names like
"claude-sonnet-4-6" — a non-existent model 404s and burns a retry.

**How to apply:** `generateTextWithFallback({ prompt, system, maxTokens, onDelta, log })`
tries Claude, Gemini, Groq, then Mistral, calling `onDelta` per fragment so SSE
`content` events still stream. Only use the Gemini-first route for Rozgar content
that is grounded in fetched live listings/feed items; keep tutoring, interviews,
and other general AI calls on Claude-first fallback. Mistral is optional and is
read from `MISTRAL_API_KEY`; if it is unavailable, callers retain their local
recovery behavior.

**Related parsing rule:** never set `responseMimeType: "application/json"` with
gemini-2.5-flash — it suppresses streamed text entirely. Isolate the JSON object
on both client and server before parsing: strip ``` fences, then slice from the
first `{` to the last `}` before `JSON.parse`.
